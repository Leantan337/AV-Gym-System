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
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_INTERVAL = 10000; // 10 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
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
      this.connectionStartTime = Date.now();
      
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
        this.reconnectAttempts = 0;
        this.lastDisconnectTime = 0;
        this.missedHeartbeats = 0;
        
        // Send authentication message immediately after connection
        if (this.authToken && this.socket) {
          console.debug('Sending authentication message...');
          this.socket.send(JSON.stringify({
            type: 'authenticate',
            payload: { token: this.authToken }
          }));
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

          // Handle authentication response
          if (type === 'authentication_success') {
            console.log('WebSocket authentication successful');
            return;
          }

          if (type === 'authentication_error') {
            let errorMessage = 'Unknown authentication error';
            if (payload && typeof payload === 'object' && 'message' in payload) {
              errorMessage = String((payload as { message?: unknown }).message);
            }
            console.error('WebSocket authentication failed:', errorMessage);
            this.handleConnectionError(new Error('Authentication failed: ' + errorMessage));
            return;
          }

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

      this.socket.onclose = () => {
        clearTimeout(connectionTimeout);
        const error = new Error('WebSocket disconnected');
        console.log(error.message);
        // Handle specific close codes (cannot access code/reason without param, so just log generic)
        // Only attempt to reconnect if it wasn't a clean close
        this.reconnect(error);
      };

      this.socket.onerror = () => {
        clearTimeout(connectionTimeout);
        const error = new Error('WebSocket error occurred');
        console.error('WebSocket error:', error);
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
          // Use message batching for high-volume events
          if (['check_in_update', 'member_update', 'notification'].includes(event)) {
            this.messageBatcher.add(event, data);
            resolve();
          } else {
            // Send immediately for important events
            this.socket.send(JSON.stringify({ type: event, data }));
            resolve();
          }
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
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

  public async checkInMember(data: CheckInData): Promise<void> {
    return this.send('check_in', data);
  }

  public async checkOutMember(data: CheckOutData): Promise<void> {
    return this.send('check_out', data);
  }
}

// Message batching for high-volume scenarios
interface BatchedMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
}

class MessageBatcher {
  private messages: BatchedMessage[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_INTERVAL = 100; // ms
  private socket: WebSocket | null = null;

  setSocket(socket: WebSocket) {
    this.socket = socket;
  }

  add<T = unknown>(type: string, data?: T) {
    this.messages.push({
      type,
      data,
      timestamp: Date.now()
    });

    if (!this.batchTimeout) {
      this.scheduleBatch();
    }
  }

  private scheduleBatch() {
    this.batchTimeout = setTimeout(() => {
      this.sendBatch();
    }, this.BATCH_INTERVAL);
  }

  private sendBatch() {
    if (this.socket?.readyState === WebSocket.OPEN && this.messages.length > 0) {
      const batch = this.messages.slice();
      this.messages = [];

      // Group messages by type to reduce payload size
      const groupedBatch = batch.reduce((acc, msg) => {
        if (!acc[msg.type]) {
          acc[msg.type] = [];
        }
        acc[msg.type].push(msg.data);
        return acc;
      }, {} as Record<string, unknown[]>);

      try {
        this.socket.send(JSON.stringify({
          type: 'batch',
          batches: groupedBatch
        }));
      } catch (error) {
        console.error('Error sending batched messages:', error);
      }
    }

    this.batchTimeout = null;

    // If there are new messages that came in while sending, schedule another batch
    if (this.messages.length > 0) {
      this.scheduleBatch();
    }
  }

  clear() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.messages = [];
    this.socket = null;
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
