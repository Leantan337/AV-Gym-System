import { analyticsEngine } from './analytics';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'failed' | 'authentication_failed';

type MessageHandler<T = unknown> = (data: T) => void;

export interface CheckInEvent {
  id: string;
  member: {
    id: string;
    full_name: string;
  };
  check_in_time: string;
  check_out_time: string | null;
  status: 'checked_in' | 'checked_out';
}

export interface CheckInData {
  memberId: string;
  timestamp: string;
  location?: string;
  notes?: string;
}

export interface CheckOutData {
  checkInId: string;
  timestamp: string;
  notes?: string;
}

export interface WebSocketMessage<T = unknown> {
  type:
    | 'check_in_success'
    | 'check_in_error'
    | 'check_out_success'
    | 'check_out_error'
    | 'member_checked_in'
    | 'member_checked_out'
    | 'check_in_stats'
    | 'error'
    | string;
  payload: T;
}

export interface CheckInWebSocketEvent {
  type: 'check_in' | 'check_out';
  checkIn: CheckInEvent;
}

export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_INTERVAL = 10000; // 10 seconds
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeatAck = 0;
  private readonly HEARTBEAT_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_MISSED_HEARTBEATS = 2;
  private missedHeartbeats = 0;
  private authToken: string | null = null;
  private messageBatcher = new MessageBatcher();
  private pendingMessages: Array<{ event: string; data: unknown }> = [];
  private manualReconnectTriggered = false;
  private lastDisconnectTime = 0;
  private readonly MIN_RECONNECT_DELAY = 1000; // 1 second
  private readonly MAX_RECONNECT_DELAY = 30000; // 30 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private connectionStartTime = 0;
  private readonly CONNECTION_TIMEOUT = 10000; // 10 seconds connection timeout

  // Phase 5: Performance optimization features
  private memoryMonitor: ReturnType<typeof setInterval> | null = null;
  private readonly MEMORY_CHECK_INTERVAL = 60000; // 1 minute
  private readonly MAX_HANDLER_CLEANUP_AGE = 300000; // 5 minutes
  private handlerAccessTime: Map<string, number> = new Map();
  private messageMetrics = {
    totalReceived: 0,
    totalSent: 0,
    errorsCount: 0,
    lastResetTime: Date.now(),
    avgLatency: 0,
    latencyMeasurements: [] as number[]
  };
  private connectionQuality = {
    score: 100, // 0-100 scale
    factors: {
      latency: 100,
      dropRate: 100,
      stability: 100
    }
  };
  private performanceOptimizationEnabled = true;

  constructor(private baseUrl: string) {
    // Validate baseUrl
    try {
      new URL(baseUrl);
    } catch (e) {
      console.error('Invalid WebSocket base URL:', baseUrl);
      throw new Error('Invalid WebSocket base URL');
    }
    
    // Enhanced debugging information
    console.log('🔌 WebSocketService initialized');
    console.log('📍 Base URL:', baseUrl);
    console.log('🌐 Current location:', window.location.href);
    console.log('🔧 Environment detection:', {
      hostname: window.location.hostname,
      port: window.location.port,
      protocol: window.location.protocol,
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    });
    
    // Don't connect immediately - wait for auth token to be set
    console.log('⏳ Waiting for authentication token...');
  }

  private getWebSocketUrl(): string {
    try {
      const url = new URL(this.baseUrl);
      if (this.authToken) {
        url.searchParams.set('token', this.authToken);
      }
      
      const finalUrl = url.toString();
      const safeUrl = finalUrl.replace(this.authToken || '', '[TOKEN_HIDDEN]');
      
      console.log('🔗 Final WebSocket URL:', safeUrl);
      console.log('🎫 Auth token present:', !!this.authToken);
      console.log('📏 Token length:', this.authToken?.length || 0);
      
      return finalUrl;
    } catch (error) {
      console.error('❌ Error constructing WebSocket URL:', error);
      throw new Error('Failed to construct WebSocket URL');
    }
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  setAuthToken(token: string | null) {
    const previousToken = this.authToken;
    this.authToken = token;
    
    if (token && token !== previousToken) {
      // New or different token - establish connection
      console.log('Auth token set, establishing WebSocket connection');
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        this.connect(false, false);
      }
    } else if (!token && previousToken) {
      // Token removed - disconnect
      console.log('Auth token cleared, disconnecting WebSocket');
      this.disconnect();
    }
    // If token is same as before, no action needed
  }

  connect(manualReconnect = false, reconnectAttempt = false) {
    // Prevent multiple concurrent connection attempts
    if (this.connectionStatus === 'connecting') {
      console.debug('Connection attempt already in progress, skipping');
      return;
    }

    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        console.debug('WebSocket already connected, skipping connect');
        return;
      }
      console.debug('WebSocket exists but not open, disconnecting first');
      this.disconnect();
    }

    try {
      const connectionType = reconnectAttempt ? 'reconnect attempt' : 'initial connection';
      console.log(`🚀 Initiating WebSocket connection... (${connectionType})`);
      console.log('🔄 Connection attempt:', this.reconnectAttempts + 1);
      
      this.connectionStatus = 'connecting';
      this.notifyConnectionStatusChange();
      this.manualReconnectTriggered = manualReconnect;
      this.missedHeartbeats = 0;
      this.connectionStartTime = Date.now();
      
      console.log('📊 Connection state:', {
        status: this.connectionStatus,
        attempts: this.reconnectAttempts,
        hasToken: !!this.authToken,
        timestamp: new Date().toISOString()
      });
      
      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.connectionStatus === 'connecting') {
          console.error('WebSocket connection timeout');
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, this.CONNECTION_TIMEOUT);
      
      this.socket = new WebSocket(this.getWebSocketUrl());

      this.socket.onopen = () => {
        clearTimeout(connectionTimeout);
        const connectionTime = Date.now() - this.connectionStartTime;
        console.log(`WebSocket connected successfully in ${connectionTime}ms`);
        
        // Track connection event
        analyticsEngine.trackConnectionEvent('connected', undefined, undefined);
        analyticsEngine.trackPerformanceEvent('connection_time', connectionTime);
        
        this.reconnectAttempts = 0;
        this.lastDisconnectTime = 0;
        this.missedHeartbeats = 0;
        
        // Send authentication message immediately after connection
        if (this.authToken && this.socket) {
          console.debug('WebSocket authenticated via URL token - no message needed');
          // Authentication is handled by URL token via JWTAuthMiddleware
          // No need to send separate authentication message
        }
        
        this.connectionStatus = 'connected';
        this.notifyConnectionStatusChange();
        this.setupPing();
        this.setupHeartbeat();
        
        // Set the socket for the message batcher
        if (this.socket) {
          this.messageBatcher.setSocket(this.socket);
        }
        
        // Send any pending messages that were queued while disconnected
        if (this.pendingMessages.length > 0) {
          console.debug(`Sending ${this.pendingMessages.length} pending messages`);
          const messages = [...this.pendingMessages];
          this.pendingMessages = [];
          messages.forEach(msg => this.send(msg.event, msg.data));
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          const { type, payload } = message;

          // URL-based authentication via middleware - no auth messages needed
          // Authentication success/error handled by connection acceptance/rejection

          // Handle heartbeat_ack
          if (type === 'heartbeat_ack') {
            const now = Date.now();
            const timeSinceLastAck = now - this.lastHeartbeatAck;
            console.debug(`Received heartbeat ack after ${Math.round(timeSinceLastAck/1000)}s`);
            this.lastHeartbeatAck = now;
            this.missedHeartbeats = 0;
            return;
          }
          
          // Handle ping-pong
          if (type === 'pong') {
            return;
          }
          
          // Handle batched messages
          if (type === 'batch' && payload && typeof payload === 'object' && 'batches' in payload) {
            Object.entries((payload as { batches: Record<string, unknown[]> }).batches).forEach(([msgType, data]) => {
              const handlers = this.messageHandlers.get(msgType);
              if (handlers) {
                (data as unknown[]).forEach(item => {
                  handlers.forEach(handler => handler(item));
                });
              }
            });
            return;
          }

          const handlers = this.messageHandlers.get(type);
          if (handlers && payload !== undefined && payload !== null) {
            handlers.forEach(handler => handler(payload));
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        const { code, reason, wasClean } = event;
        
        console.log(`🔌 WebSocket connection closed:`, {
          code,
          reason: reason || 'No reason provided',
          wasClean,
          timestamp: new Date().toISOString()
        });
        
        // Track disconnection event
        analyticsEngine.trackConnectionEvent('disconnected');
        
        // Provide user-friendly error messages based on close codes
        let errorMessage = 'WebSocket disconnected';
        if (code === 4001) {
          errorMessage = 'Authentication failed - invalid or expired token';
          this.connectionStatus = 'authentication_failed';
        } else if (code === 1006) {
          errorMessage = 'Connection lost unexpectedly (network issue)';
        } else if (code === 1000) {
          errorMessage = 'Connection closed normally';
        } else if (code >= 4000) {
          errorMessage = `Application error (code: ${code})`;
        }
        
        const error = new Error(errorMessage);
        console.log(`📋 Close details: ${errorMessage}`);
        
        // Only attempt to reconnect if it wasn't a clean close or auth failure
        if (code !== 1000 && code !== 4001) {
          this.reconnect(error);
        } else {
          this.notifyConnectionStatusChange();
        }
      };

      this.socket.onerror = (errorEvent) => {
        clearTimeout(connectionTimeout);
        
        console.error('🚨 WebSocket error event:', {
          type: errorEvent.type,
          target: errorEvent.target?.constructor?.name,
          readyState: this.socket?.readyState,
          timestamp: new Date().toISOString()
        });
        
        const error = new Error('WebSocket connection error occurred');
        
        // Track error event
        analyticsEngine.trackConnectionEvent('failed');
        analyticsEngine.trackErrorEvent('websocket_error', error);
        
        this.handleConnectionError(error);
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      this.handleConnectionError(error instanceof Error ? error : new Error('Unknown error during WebSocket initialization'));
    }
  }

  private setupPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Setup regular ping (keep existing ping for compatibility)
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          console.debug('Sending ping...');
          this.socket.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Error sending ping message:', error);
          this.handleConnectionError(error instanceof Error ? error : new Error('Error sending ping message'));
        }
      }
    }, this.PING_INTERVAL);

    // Setup heartbeat
    this.lastHeartbeatAck = Date.now(); // Initialize with current time
    this.missedHeartbeats = 0;
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          const now = Date.now();
          const timeSinceLastAck = now - this.lastHeartbeatAck;
          
          // Check if we haven't received a heartbeat ack in time
          if (timeSinceLastAck > this.HEARTBEAT_TIMEOUT) {
            this.missedHeartbeats++;
            console.warn(`No heartbeat ack received for ${Math.round(timeSinceLastAck/1000)}s (timeout: ${this.HEARTBEAT_TIMEOUT/1000}s), missed: ${this.missedHeartbeats}/${this.MAX_MISSED_HEARTBEATS}`);
            
            if (this.missedHeartbeats >= this.MAX_MISSED_HEARTBEATS) {
              console.error('Max missed heartbeats reached, reconnecting...');
              this.handleConnectionError(new Error('Max missed heartbeats reached'));
              return;
            }
          } else {
            // Reset missed heartbeats if we're within timeout
            this.missedHeartbeats = 0;
          }

          console.debug(`Sending heartbeat... (last ack: ${Math.round(timeSinceLastAck/1000)}s ago)`);
          this.socket.send(JSON.stringify({ 
            type: 'heartbeat',
            timestamp: now
          }));
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          this.handleConnectionError(error instanceof Error ? error : new Error('Error sending heartbeat'));
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private setupHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        const timeSinceLastAck = now - this.lastHeartbeatAck;
        
        if (timeSinceLastAck > this.HEARTBEAT_TIMEOUT) {
          this.missedHeartbeats++;
          console.warn(`Missed heartbeat (${this.missedHeartbeats}/${this.MAX_MISSED_HEARTBEATS})`);
          
          if (this.missedHeartbeats >= this.MAX_MISSED_HEARTBEATS) {
            console.error('Too many missed heartbeats, reconnecting...');
            this.handleConnectionError(new Error('Heartbeat timeout'));
            return;
          }
        }

        try {
          this.socket.send(JSON.stringify({ type: 'heartbeat' }));
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          this.handleConnectionError(error instanceof Error ? error : new Error('Error sending heartbeat'));
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private handleConnectionError(error: unknown) {
    console.error('WebSocket connection error:', error);
    this.connectionStatus = 'disconnected';
    this.notifyConnectionStatusChange();
    
    // Clean up any existing connection
    if (this.socket) {
      try {
        this.socket.close(1000, 'Connection error');
      } catch (e) {
        console.error('Error closing socket during error handling:', e);
      }
      this.socket = null;
    }
    
    // Clear intervals
    this.clearIntervals();
    
    // Attempt to reconnect if appropriate
    if (!this.manualReconnectTriggered) {
      this.reconnect(error);
    }
  }

  private clearIntervals() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private reconnect(error?: unknown) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached', error);
      this.connectionStatus = 'failed';
      this.notifyConnectionStatusChange();
      return;
    }

    const now = Date.now();
    const timeSinceLastDisconnect = now - this.lastDisconnectTime;
    const delay = Math.min(
      this.MAX_RECONNECT_DELAY,
      Math.max(this.MIN_RECONNECT_DELAY, timeSinceLastDisconnect)
    );

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`, error);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(false, true);
    }, delay);
  }
  
  // Method to manually trigger reconnection
  public manualReconnect() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.log('Already connected, no need to reconnect');
      return;
    }
    
    this.manualReconnectTriggered = true;
    this.reconnectAttempts = 0;
    this.disconnect();
    this.connect(true);
  }

  subscribe<T = unknown>(
    event: string, 
    handler: MessageHandler<T>
  ): () => void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      handlers.add(handler as MessageHandler);
    }

    // Return unsubscribe function
    return () => {
      if (this.messageHandlers.has(event)) {
        const currentHandlers = this.messageHandlers.get(event);
        if (currentHandlers) {
          currentHandlers.delete(handler as MessageHandler);
          if (currentHandlers.size === 0) {
            this.messageHandlers.delete(event);
          }
        }
      }
    };
  }

  send<T = unknown>(event: string, data?: T): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.messageMetrics.totalSent++;
          
          // Use message batching for high-volume events
          if (['check_in_update', 'member_update', 'notification'].includes(event)) {
            // High-volume events get batched with medium priority
            this.messageBatcher.add(event, data, 'medium');
            resolve();
          } else if (['error', 'authentication', 'heartbeat'].includes(event)) {
            // Critical events get high priority and immediate sending
            this.messageBatcher.add(event, data, 'high');
            resolve();
          } else {
            // Send immediately for important events
            this.socket.send(JSON.stringify({ type: event, data }));
            resolve();
          }
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
          this.messageMetrics.errorsCount++;
          reject(error);
        }
      } else {
        // Queue message to be sent when connection is reestablished
        if (['check_in', 'check_out'].includes(event)) {
          console.log('WebSocket not connected, queueing message:', event);
          this.pendingMessages.push({ event, data });
          resolve(); // Resolve since we've queued it
        } else {
          const error = new Error('WebSocket is not connected');
          console.error(error);
          this.messageMetrics.errorsCount++;
          reject(error);
        }
      }
    });
  }

  disconnect() {
    if (this.socket) {
      try {
        this.socket.close(1000, 'Manual disconnect');
      } catch (error) {
        console.error('Error during disconnect:', error);
      }
      this.socket = null;
    }
    this.clearIntervals();
    
    // Preserve authentication_failed status, otherwise set to disconnected
    if (this.connectionStatus !== 'authentication_failed') {
      this.connectionStatus = 'disconnected';
    }
    this.notifyConnectionStatusChange();
  }

  private notifyConnectionStatusChange() {
    // Log status changes for easier debugging
    console.log(`WebSocket connection status changed to: ${this.connectionStatus}`);
    
    const handlers = this.messageHandlers.get('connection_status');
    if (handlers) {
      handlers.forEach(handler => handler(this.connectionStatus));
    }
  }

  getConnectionStatus(): ConnectionStatus {
    if (!this.socket) return 'disconnected';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      default:
        return 'disconnected';
    }
  }

  // Phase 5: Performance monitoring methods
  private startPerformanceMonitoring() {
    if (!this.performanceOptimizationEnabled) return;

    this.memoryMonitor = setInterval(() => {
      this.performMemoryCleanup();
      this.updateConnectionQuality();
      this.logPerformanceMetrics();
    }, this.MEMORY_CHECK_INTERVAL);
  }

  private stopPerformanceMonitoring() {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
      this.memoryMonitor = null;
    }
  }

  private performMemoryCleanup() {
    const now = Date.now();
    
    // Clean up old handler access times
    Array.from(this.handlerAccessTime.entries()).forEach(([handlerType, lastAccess]) => {
      if (now - lastAccess > this.MAX_HANDLER_CLEANUP_AGE) {
        this.handlerAccessTime.delete(handlerType);
      }
    });

    // Limit latency measurements to last 100 entries
    if (this.messageMetrics.latencyMeasurements.length > 100) {
      this.messageMetrics.latencyMeasurements = this.messageMetrics.latencyMeasurements.slice(-50);
    }

    // Reset metrics if too old
    if (now - this.messageMetrics.lastResetTime > 3600000) { // 1 hour
      this.resetMetrics();
    }
  }

  private updateConnectionQuality() {
    const dropRate = this.messageMetrics.errorsCount / Math.max(1, this.messageMetrics.totalSent);
    const avgLatency = this.messageMetrics.avgLatency;
    
    // Calculate quality factors (0-100 scale)
    this.connectionQuality.factors.dropRate = Math.max(0, 100 - (dropRate * 1000));
    this.connectionQuality.factors.latency = Math.max(0, 100 - Math.min(100, avgLatency / 10));
    this.connectionQuality.factors.stability = this.reconnectAttempts === 0 ? 100 : Math.max(0, 100 - (this.reconnectAttempts * 20));
    
    // Overall score is weighted average
    this.connectionQuality.score = Math.round(
      (this.connectionQuality.factors.dropRate * 0.4) +
      (this.connectionQuality.factors.latency * 0.3) +
      (this.connectionQuality.factors.stability * 0.3)
    );
  }

  private logPerformanceMetrics() {
    if (this.messageMetrics.totalReceived % 1000 === 0 && this.messageMetrics.totalReceived > 0) {
      console.debug('WebSocket Performance Metrics:', {
        totalMessages: this.messageMetrics.totalReceived,
        totalSent: this.messageMetrics.totalSent,
        errors: this.messageMetrics.errorsCount,
        avgLatency: this.messageMetrics.avgLatency.toFixed(2) + 'ms',
        connectionQuality: this.connectionQuality.score + '%',
        batchingStats: this.messageBatcher.getStatistics()
      });
    }
  }

  private resetMetrics() {
    this.messageMetrics = {
      totalReceived: 0,
      totalSent: 0,
      errorsCount: 0,
      lastResetTime: Date.now(),
      avgLatency: 0,
      latencyMeasurements: []
    };
  }

  public async checkInMember(data: CheckInData): Promise<void> {
    return this.send('check_in', data);
  }

  public async checkOutMember(data: CheckOutData): Promise<void> {
    return this.send('check_out', data);
  }

  // Phase 5: Performance optimization methods
  getPerformanceMetrics() {
    return {
      messages: { ...this.messageMetrics },
      connectionQuality: { ...this.connectionQuality },
      batcher: this.messageBatcher.getStatistics(),
      handlers: {
        totalTypes: this.messageHandlers.size,
        activeHandlers: Array.from(this.messageHandlers.values()).reduce((sum, handlers) => sum + handlers.size, 0)
      }
    };
  }

  enablePerformanceOptimization(enabled: boolean) {
    this.performanceOptimizationEnabled = enabled;
    if (enabled && this.connectionStatus === 'connected') {
      this.startPerformanceMonitoring();
    } else {
      this.stopPerformanceMonitoring();
    }
  }
}

// Message batching for high-volume scenarios
interface BatchedMessage<T = unknown> {
  type: string;
  data: T | undefined;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

class MessageBatcher {
  private messages: BatchedMessage[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_INTERVAL = 100; // ms
  private readonly MAX_BATCH_SIZE = 50; // Maximum messages per batch
  private readonly MAX_QUEUE_SIZE = 200; // Maximum queued messages
  private socket: WebSocket | null = null;
  private lastSendTime = 0;
  private readonly MIN_SEND_INTERVAL = 50; // Minimum 50ms between sends
  private compressionEnabled = true;
  private adaptiveBatching = true;
  private statistics = {
    totalBatches: 0,
    totalMessages: 0,
    bytesReduced: 0,
    avgBatchSize: 0,
    droppedMessages: 0
  };

  setSocket(socket: WebSocket) {
    this.socket = socket;
  }

  add<T = unknown>(type: string, data?: T, priority: 'high' | 'medium' | 'low' = 'medium') {
    // Memory protection: Drop oldest low-priority messages if queue is full
    if (this.messages.length >= this.MAX_QUEUE_SIZE) {
      const droppedCount = this.dropLowPriorityMessages();
      console.warn(`Message queue full, dropped ${droppedCount} low-priority messages`);
      this.statistics.droppedMessages += droppedCount;
    }

    const message: BatchedMessage<T> = {
      type,
      data,
      timestamp: Date.now(),
      priority
    };

    // Insert based on priority (high priority first)
    if (priority === 'high') {
      this.messages.unshift(message);
    } else {
      this.messages.push(message);
    }

    // Adaptive batching: Send immediately if high priority or batch is full
    if (priority === 'high' || this.messages.length >= this.MAX_BATCH_SIZE) {
      this.sendBatch();
    } else if (!this.batchTimeout) {
      this.scheduleBatch();
    }
  }

  private dropLowPriorityMessages(): number {
    const originalLength = this.messages.length;
    // Keep high and medium priority messages
    this.messages = this.messages.filter(msg => msg.priority !== 'low');
    
    // If still too many, drop oldest medium priority messages
    if (this.messages.length > this.MAX_QUEUE_SIZE * 0.8) {
      const mediumPriorityMessages = this.messages.filter(msg => msg.priority === 'medium');
      const highPriorityMessages = this.messages.filter(msg => msg.priority === 'high');
      
      // Keep only recent medium priority messages
      const keepMediumCount = Math.floor(this.MAX_QUEUE_SIZE * 0.6);
      const recentMedium = mediumPriorityMessages
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, keepMediumCount);
      
      this.messages = [...highPriorityMessages, ...recentMedium];
    }
    
    return originalLength - this.messages.length;
  }

  private scheduleBatch() {
    // Adaptive interval based on message volume
    let interval = this.BATCH_INTERVAL;
    if (this.adaptiveBatching) {
      // Reduce interval if many messages are queued
      if (this.messages.length > 20) {
        interval = Math.max(25, this.BATCH_INTERVAL / 2);
      } else if (this.messages.length < 5) {
        interval = this.BATCH_INTERVAL * 1.5;
      }
    }

    const timeSinceLastSend = Date.now() - this.lastSendTime;
    const delay = Math.max(interval, this.MIN_SEND_INTERVAL - timeSinceLastSend);
    
    this.batchTimeout = setTimeout(() => {
      this.sendBatch();
    }, delay);
  }

  private sendBatch() {
    if (this.socket?.readyState === WebSocket.OPEN && this.messages.length > 0) {
      const batchSize = Math.min(this.messages.length, this.MAX_BATCH_SIZE);
      const batch = this.messages.splice(0, batchSize);
      this.lastSendTime = Date.now();

      // Group messages by type to reduce payload size
      const groupedBatch = batch.reduce((acc, msg) => {
        if (!acc[msg.type]) {
          acc[msg.type] = [];
        }
        acc[msg.type].push(msg.data);
        return acc;
      }, {} as Record<string, unknown[]>);

      // Calculate compression statistics
      const originalPayload = JSON.stringify(batch);
      const compressedPayload = JSON.stringify({
        type: 'batch',
        batches: groupedBatch,
        metadata: {
          count: batch.length,
          timestamp: Date.now(),
          compression: this.compressionEnabled ? 'grouped' : 'none'
        }
      });

      // Update statistics
      this.statistics.totalBatches++;
      this.statistics.totalMessages += batch.length;
      this.statistics.bytesReduced += Math.max(0, originalPayload.length - compressedPayload.length);
      this.statistics.avgBatchSize = this.statistics.totalMessages / this.statistics.totalBatches;

      try {
        this.socket.send(compressedPayload);

        // Log performance metrics periodically
        if (this.statistics.totalBatches % 100 === 0) {
          this.logPerformanceMetrics();
        }
      } catch (error) {
        console.error('Error sending batched messages:', error);
        // Re-queue messages on error with lower priority
        const requeuedMessages = batch.map(msg => ({ ...msg, priority: 'low' as const }));
        this.messages.unshift(...requeuedMessages);
      }
    }

    this.batchTimeout = null;

    // If there are new messages that came in while sending, schedule another batch
    if (this.messages.length > 0) {
      this.scheduleBatch();
    }
  }

  private logPerformanceMetrics() {
    const compressionRatio = this.statistics.bytesReduced > 0 
      ? ((this.statistics.bytesReduced / (this.statistics.totalMessages * 100)) * 100)
      : 0;

    console.debug('WebSocket batching performance:', {
      totalBatches: this.statistics.totalBatches,
      totalMessages: this.statistics.totalMessages,
      avgBatchSize: this.statistics.avgBatchSize.toFixed(2),
      bytesReduced: this.statistics.bytesReduced,
      compressionRatio: compressionRatio.toFixed(1) + '%',
      droppedMessages: this.statistics.droppedMessages,
      queueSize: this.messages.length
    });
  }

  // Force immediate send of all queued messages
  flush() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    while (this.messages.length > 0) {
      this.sendBatch();
    }
  }

  // Get batching statistics
  getStatistics() {
    return { 
      ...this.statistics,
      queueSize: this.messages.length,
      highPriorityCount: this.messages.filter(m => m.priority === 'high').length,
      mediumPriorityCount: this.messages.filter(m => m.priority === 'medium').length,
      lowPriorityCount: this.messages.filter(m => m.priority === 'low').length
    };
  }

  // Enable/disable adaptive batching
  setAdaptiveBatching(enabled: boolean) {
    this.adaptiveBatching = enabled;
  }

  // Enable/disable compression
  setCompression(enabled: boolean) {
    this.compressionEnabled = enabled;
  }

  clear() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.messages = [];
    this.socket = null;
    // Reset statistics
    this.statistics = {
      totalBatches: 0,
      totalMessages: 0,
      bytesReduced: 0,
      avgBatchSize: 0,
      droppedMessages: 0
    };
  }
}

// Determine WebSocket URL based on environment - Always use nginx proxy
const getWebSocketUrl = () => {
  // Check if we have a specific WebSocket URL from environment
  const envWsUrl = process.env.REACT_APP_WS_URL;
  
  if (envWsUrl) {
    // Use the environment variable if available
    return `${envWsUrl}/ws/checkins/`;
  }
  
  // Fallback to dynamic construction based on current location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  
  // For production, always use nginx proxy on standard ports (80/443)
  // regardless of which port the frontend is accessed from
  const baseUrl = `${protocol}//${hostname}`;
  
  // Don't add any port - always use nginx proxy on standard ports
  // This ensures WebSocket goes through nginx even if frontend is on port 3000
  
  // WebSocket path through nginx proxy
  return `${baseUrl}/ws/checkins/`;
};

// Create a singleton instance
const wsService = new WebSocketService(getWebSocketUrl());

// Export the singleton instance as default
export default wsService;
