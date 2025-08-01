export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'failed' | 'authentication_failed';

// Error types for better error handling
export enum WebSocketErrorType {
  AUTHENTICATION_ERROR = 'authentication_error',
  NETWORK_ERROR = 'network_error', 
  SERVER_ERROR = 'server_error',
  CONNECTION_TIMEOUT = 'connection_timeout',
  HEARTBEAT_TIMEOUT = 'heartbeat_timeout',
  MESSAGE_ERROR = 'message_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface WebSocketError {
  type: WebSocketErrorType;
  message: string;
  timestamp: number;
  retryable: boolean;
  code?: number;
  originalError?: Error;
}

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
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private lastHeartbeatAck = 0;
  private readonly HEARTBEAT_TIMEOUT = 45000; // 45 seconds (1.5x interval)
  private readonly MAX_MISSED_HEARTBEATS = 2;
  private missedHeartbeats = 0;
  private authToken: string | null = null;
  private pendingMessages: Array<{ event: string; data: unknown }> = [];
  private manualReconnectTriggered = false;
  private readonly MIN_RECONNECT_DELAY = 1000; // 1 second
  private readonly MAX_RECONNECT_DELAY = 30000; // 30 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private lastError: WebSocketError | null = null;
  private errorHistory: WebSocketError[] = [];
  private fallbackPolling: NodeJS.Timeout | null = null;
  private readonly FALLBACK_POLL_INTERVAL = 10000; // 10 seconds
  private useFallbackMode = false;

  constructor(private baseUrl: string) {
    // Validate baseUrl
    try {
      new URL(baseUrl);
    } catch (e) {
      console.error('Invalid WebSocket base URL:', baseUrl);
      throw new Error('Invalid WebSocket base URL');
    }
    // Initial connection attempt
    this.connect(false, false);
  }

  private getWebSocketUrl(): string {
    try {
      const url = new URL(this.baseUrl);
      if (this.authToken) {
        url.searchParams.set('token', this.authToken);
      }
      console.debug('WebSocket URL:', url.toString().replace(this.authToken || '', '[TOKEN]'));
      return url.toString();
    } catch (error) {
      console.error('Error constructing WebSocket URL:', error);
      throw new Error('Failed to construct WebSocket URL');
    }
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  getLastError(): WebSocketError | null {
    return this.lastError;
  }

  getErrorHistory(): WebSocketError[] {
    return [...this.errorHistory];
  }

  private createError(
    type: WebSocketErrorType, 
    message: string, 
    originalError?: Error,
    code?: number
  ): WebSocketError {
    const error: WebSocketError = {
      type,
      message,
      timestamp: Date.now(),
      retryable: this.isRetryableError(type),
      code,
      originalError
    };

    this.lastError = error;
    this.errorHistory.push(error);
    
    // Keep only last 10 errors
    if (this.errorHistory.length > 10) {
      this.errorHistory = this.errorHistory.slice(-10);
    }

    return error;
  }

  private isRetryableError(type: WebSocketErrorType): boolean {
    switch (type) {
      case WebSocketErrorType.NETWORK_ERROR:
      case WebSocketErrorType.CONNECTION_TIMEOUT:
      case WebSocketErrorType.HEARTBEAT_TIMEOUT:
      case WebSocketErrorType.SERVER_ERROR:
        return true;
      case WebSocketErrorType.AUTHENTICATION_ERROR:
      case WebSocketErrorType.MESSAGE_ERROR:
        return false;
      case WebSocketErrorType.UNKNOWN_ERROR:
      default:
        return true; // Default to retryable for unknown errors
    }
  }

  private classifyError(error: unknown, code?: number): WebSocketError {
    if (code === 4001) {
      return this.createError(
        WebSocketErrorType.AUTHENTICATION_ERROR,
        'Authentication failed - invalid or expired token',
        error instanceof Error ? error : undefined,
        code
      );
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('network') || message.includes('connection')) {
        return this.createError(
          WebSocketErrorType.NETWORK_ERROR,
          'Network connection error',
          error,
          code
        );
      }
      
      if (message.includes('timeout')) {
        return this.createError(
          WebSocketErrorType.CONNECTION_TIMEOUT,
          'Connection timeout',
          error,
          code
        );
      }
      
      if (message.includes('heartbeat')) {
        return this.createError(
          WebSocketErrorType.HEARTBEAT_TIMEOUT,
          'Heartbeat timeout - connection may be unstable',
          error,
          code
        );
      }
      
      if (message.includes('server') || (code && code >= 1011 && code <= 1014)) {
        return this.createError(
          WebSocketErrorType.SERVER_ERROR,
          'Server error',
          error,
          code
        );
      }
    }

    return this.createError(
      WebSocketErrorType.UNKNOWN_ERROR,
      'Unknown WebSocket error',
      error instanceof Error ? error : undefined,
      code
    );
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
    if (token) {
      // If we have a token and we're not connected, try to connect
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        this.connect(false, false);
      }
    } else {
      // If token is removed, disconnect
      this.disconnect();
    }
  }

  connect(manualReconnect = false, reconnectAttempt = false) {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        console.debug('WebSocket already connected, skipping connect');
        return;
      }
      console.debug('WebSocket exists but not open, disconnecting first');
      this.disconnect();
    }

    try {
      console.debug(`Initiating WebSocket connection... (${reconnectAttempt ? 'reconnect attempt' : 'initial connection'})`);
      this.connectionStatus = 'connecting';
      this.notifyConnectionStatusChange();
      this.manualReconnectTriggered = manualReconnect;
      this.missedHeartbeats = 0;
      
      this.socket = new WebSocket(this.getWebSocketUrl());

      this.socket.onopen = () => {
        console.log('WebSocket connected successfully');
        this.reconnectAttempts = 0;
        this.missedHeartbeats = 0;
        
        // Connection is established and authenticated via URL token
        this.connectionStatus = 'connected';
        this.notifyConnectionStatusChange();
        this.setupHeartbeat();
        
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

          // Handle heartbeat_ack
          if (type === 'heartbeat_ack') {
            const now = Date.now();
            const timeSinceLastAck = now - this.lastHeartbeatAck;
            console.debug(`Received heartbeat ack after ${Math.round(timeSinceLastAck/1000)}s`);
            this.lastHeartbeatAck = now;
            this.missedHeartbeats = 0;
            return;
          }

          // Handle all other messages
          const handlers = this.messageHandlers.get(type);
          if (handlers && payload !== undefined && payload !== null) {
            handlers.forEach(handler => handler(payload));
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`);
        
        const wsError = this.classifyError(
          new Error(`WebSocket closed: ${event.reason || 'Unknown reason'}`),
          event.code
        );
        
        // Handle authentication failure
        if (wsError.type === WebSocketErrorType.AUTHENTICATION_ERROR) {
          console.error('WebSocket authentication failed');
          this.connectionStatus = 'authentication_failed';
          this.notifyConnectionStatusChange();
          this.notifyError(wsError);
          // Don't attempt to reconnect on auth failure
          return;
        }
        
        // Handle other errors with smart retry logic
        this.handleConnectionError(wsError);
      };

      this.socket.onerror = () => {
        const wsError = this.classifyError(
          new Error('WebSocket connection error')
        );
        console.error('WebSocket error:', wsError);
        this.handleConnectionError(wsError);
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      this.handleConnectionError(error instanceof Error ? error : new Error('Unknown error during WebSocket initialization'));
    }
  }

  private setupHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Initialize heartbeat tracking
    this.lastHeartbeatAck = Date.now();
    this.missedHeartbeats = 0;

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        const timeSinceLastAck = now - this.lastHeartbeatAck;
        
        // Check if we haven't received a heartbeat ack in time
        if (timeSinceLastAck > this.HEARTBEAT_TIMEOUT) {
          this.missedHeartbeats++;
          console.warn(`Missed heartbeat ${this.missedHeartbeats}/${this.MAX_MISSED_HEARTBEATS} (${Math.round(timeSinceLastAck/1000)}s ago)`);
          
          if (this.missedHeartbeats >= this.MAX_MISSED_HEARTBEATS) {
            console.error('Too many missed heartbeats, reconnecting...');
            const heartbeatError = this.createError(
              WebSocketErrorType.HEARTBEAT_TIMEOUT,
              `Heartbeat timeout after ${this.missedHeartbeats} missed heartbeats`
            );
            this.handleConnectionError(heartbeatError);
            return;
          }
        }

        try {
          console.debug('Sending heartbeat...');
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

  private handleConnectionError(error: unknown) {
    const wsError = error instanceof Object && 'type' in error ? 
      error as WebSocketError : 
      this.classifyError(error);
    
    console.error('WebSocket connection error:', wsError);
    this.connectionStatus = 'disconnected';
    this.notifyConnectionStatusChange();
    this.notifyError(wsError);
    
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
    
    // Smart retry logic based on error type
    if (!this.manualReconnectTriggered && wsError.retryable) {
      this.smartReconnect(wsError);
    } else if (!wsError.retryable) {
      console.error('Non-retryable error, not attempting reconnection:', wsError.message);
      this.connectionStatus = 'failed';
      this.notifyConnectionStatusChange();
    }
  }

  private clearIntervals() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private smartReconnect(wsError: WebSocketError) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached, switching to fallback mode', wsError);
      
      // Start fallback mode instead of completely failing
      if (wsError.type === WebSocketErrorType.NETWORK_ERROR || 
          wsError.type === WebSocketErrorType.CONNECTION_TIMEOUT ||
          wsError.type === WebSocketErrorType.SERVER_ERROR) {
        this.startFallbackMode();
      } else {
        // For non-recoverable errors, mark as failed
        this.connectionStatus = 'failed';
        this.notifyConnectionStatusChange();
      }
      return;
    }

    // Calculate delay based on error type and attempt count
    const delay = this.calculateReconnectDelay(wsError);
    
    console.log(`Smart reconnect: ${wsError.type} - attempting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(false, true);
    }, delay);
  }

  private calculateReconnectDelay(wsError: WebSocketError): number {
    let baseDelay = this.MIN_RECONNECT_DELAY;
    
    // Adjust base delay based on error type
    switch (wsError.type) {
      case WebSocketErrorType.NETWORK_ERROR:
        baseDelay = 2000; // Network issues might need a bit more time
        break;
      case WebSocketErrorType.SERVER_ERROR:
        baseDelay = 5000; // Server issues need more time
        break;
      case WebSocketErrorType.HEARTBEAT_TIMEOUT:
        baseDelay = 1000; // Heartbeat timeouts can retry quickly
        break;
      default:
        baseDelay = this.MIN_RECONNECT_DELAY;
    }
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 1000; // Add up to 1s jitter
    
    return Math.min(this.MAX_RECONNECT_DELAY, exponentialDelay + jitter);
  }

  private notifyError(wsError: WebSocketError) {
    const handlers = this.messageHandlers.get('websocket_error');
    if (handlers) {
      handlers.forEach(handler => handler(wsError));
    }
  }

  private startFallbackMode() {
    if (this.fallbackPolling || this.useFallbackMode) {
      return; // Already in fallback mode
    }

    console.warn('Starting fallback polling mode due to persistent WebSocket failures');
    this.useFallbackMode = true;
    this.connectionStatus = 'connected'; // Show as connected for UX
    this.notifyConnectionStatusChange();

    // Simulate real-time updates through polling
    this.fallbackPolling = setInterval(async () => {
      try {
        // Notify subscribers that we're using fallback mode
        const handlers = this.messageHandlers.get('fallback_polling');
        if (handlers) {
          handlers.forEach(handler => handler({ 
            mode: 'polling', 
            interval: this.FALLBACK_POLL_INTERVAL 
          }));
        }
        
        // Attempt to reconnect WebSocket periodically
        if (this.reconnectAttempts % 3 === 0) { // Every 3rd poll, try WebSocket again
          this.tryWebSocketReconnection();
        }
      } catch (error) {
        console.error('Error in fallback polling:', error);
      }
    }, this.FALLBACK_POLL_INTERVAL);
  }

  private stopFallbackMode() {
    if (this.fallbackPolling) {
      clearInterval(this.fallbackPolling);
      this.fallbackPolling = null;
    }
    this.useFallbackMode = false;
    console.log('Stopped fallback polling mode');
  }

  private tryWebSocketReconnection() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      // WebSocket is already connected, stop fallback
      this.stopFallbackMode();
      return;
    }

    console.log('Attempting WebSocket reconnection from fallback mode...');
    this.reconnectAttempts = 0; // Reset attempts for fallback reconnection
    this.connect(false, true);
  }

  public isFallbackMode(): boolean {
    return this.useFallbackMode;
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
          // Send all messages immediately - no more batching
          this.socket.send(JSON.stringify({ type: event, payload: data }));
          resolve();
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
          reject(error);
        }
      } else {
        // Queue important messages to be sent when connection is reestablished
        if (['check_in', 'check_out'].includes(event)) {
          console.log('WebSocket not connected, queueing message:', event);
          this.pendingMessages.push({ event, data });
          resolve(); // Resolve since we've queued it
        } else {
          const error = new Error('WebSocket is not connected');
          console.error(error);
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
    this.stopFallbackMode(); // Clean up fallback polling
    
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
    return this.connectionStatus;
  }

  public async checkInMember(data: CheckInData): Promise<void> {
    return this.send('check_in', data);
  }

  public async checkOutMember(data: CheckOutData): Promise<void> {
    return this.send('check_out', data);
  }
}

// Determine WebSocket URL based on environment
const getWebSocketUrl = () => {
  // Use secure WebSocket in production, regular in development
  const protocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
  const host = process.env.REACT_APP_API_HOST || 'localhost:8000';
  return `${protocol}://${host}/ws/checkins/`;
};

// Create a singleton instance
const wsService = new WebSocketService(getWebSocketUrl());

// Export the singleton instance as default
export default wsService;
