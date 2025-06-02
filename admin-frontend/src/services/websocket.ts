export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'authentication_failed';

type MessageHandler<T = any> = (data: T) => void;

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

export interface WebSocketMessage<T = any> {
  type: string;
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
  private readonly HEARTBEAT_INTERVAL = 10000; // 10 seconds (reduced from 15s)
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastHeartbeatAck: number = 0;
  private readonly HEARTBEAT_TIMEOUT = 15000; // 15 seconds (increased from 8s)
  private readonly MAX_MISSED_HEARTBEATS = 2;
  private missedHeartbeats = 0;
  private authToken: string | null = null;
  private messageBatcher = new MessageBatcher();
  private pendingMessages: Array<{ event: string; data: any }> = [];
  private manualReconnectTriggered = false;
  private lastDisconnectTime: number = 0;
  private readonly MIN_RECONNECT_DELAY = 1000; // 1 second
  private readonly MAX_RECONNECT_DELAY = 30000; // 30 seconds
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(private baseUrl: string) {}

  private getWebSocketUrl(): string {
    const url = new URL(this.baseUrl);
    if (this.authToken) {
      url.searchParams.set('token', this.authToken);
    }
    return url.toString();
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
    
    // Store the token securely (memory only, not localStorage)
    
    // If we're already connected, disconnect and reconnect with the new token
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.disconnect();
      this.connect();
    }
  }

  connect(manualReconnect = false) {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        console.debug('WebSocket already connected, skipping connect');
        return;
      }
      console.debug('WebSocket exists but not open, disconnecting first');
      this.disconnect();
    }

    try {
      console.debug('Initiating WebSocket connection...');
      this.connectionStatus = 'connecting';
      this.notifyConnectionStatusChange();
      this.manualReconnectTriggered = manualReconnect;
      this.missedHeartbeats = 0;
      
      this.socket = new WebSocket(this.getWebSocketUrl());

      this.socket.onopen = () => {
        console.log('WebSocket connected successfully');
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

          // Handle heartbeat_ack
          if (type === 'heartbeat_ack') {
            const now = Date.now();
            const timeSinceLastAck = now - this.lastHeartbeatAck;
            console.debug(`Received heartbeat ack after ${Math.round(timeSinceLastAck/1000)}s`);
            this.lastHeartbeatAck = now;
            return;
          }
          
          // Handle ping-pong
          if (type === 'pong') {
            return;
          }
          
          // Handle authentication response
          if (type === 'auth_response') {
            if (payload.success === false) {
              console.error('WebSocket authentication failed:', payload.message);
              this.connectionStatus = 'authentication_failed';
              this.notifyConnectionStatusChange();
              this.disconnect();
              return;
            }
          }
          
          // Handle batched messages
          if (type === 'batch' && payload.batches) {
            Object.entries(payload.batches).forEach(([msgType, data]) => {
              const handlers = this.messageHandlers.get(msgType);
              if (handlers) {
                // For each batch item, notify all handlers
                (data as any[]).forEach(item => {
                  handlers.forEach(handler => handler(item));
                });
              }
            });
            return;
          }

          const handlers = this.messageHandlers.get(type);
          if (handlers) {
            handlers.forEach(handler => handler(payload));
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log(`WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
        this.lastDisconnectTime = Date.now();
        this.connectionStatus = 'disconnected';
        this.notifyConnectionStatusChange();
        
        // Only attempt to reconnect if it wasn't a clean close
        if (event.code !== 1000) {
          this.reconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionStatus = 'disconnected';
        this.notifyConnectionStatusChange();
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      this.connectionStatus = 'disconnected';
      this.notifyConnectionStatusChange();
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
          this.handleConnectionError();
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
              this.handleConnectionError();
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
          this.handleConnectionError();
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  private handleConnectionError() {
    this.missedHeartbeats = 0;
    this.disconnect();
    this.connect();
  }

  private reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Don't reconnect if we're already connected or if it's a manual disconnect
    if (this.socket?.readyState === WebSocket.OPEN || this.manualReconnectTriggered) {
      return;
    }

    // Calculate delay with exponential backoff
    const baseDelay = Math.min(
      this.MIN_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      this.MAX_RECONNECT_DELAY
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay + jitter, this.MAX_RECONNECT_DELAY);

    // Only reconnect if we haven't exceeded max attempts
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      console.log(`Attempting to reconnect in ${Math.round(delay/1000)}s (attempt ${this.reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      console.log('Max reconnection attempts reached');
      this.connectionStatus = 'disconnected';
      this.notifyConnectionStatusChange();
    }
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

  subscribe<T = any>(
    event: string, 
    handler: MessageHandler<T>,
    immediate = true
  ): () => void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, new Set());
    }
    const handlers = this.messageHandlers.get(event)!;
    handlers.add(handler as MessageHandler);

    // Return unsubscribe function
    return () => {
      if (this.messageHandlers.has(event)) {
        const currentHandlers = this.messageHandlers.get(event)!;
        currentHandlers.delete(handler as MessageHandler);
        if (currentHandlers.size === 0) {
          this.messageHandlers.delete(event);
        }
      }
    };
  }

  send<T = any>(event: string, data?: T): Promise<void> {
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

      // Clean close with code 1000
      this.socket.close(1000, 'Client disconnecting');
      this.socket = null;
      this.connectionStatus = 'disconnected';
      this.notifyConnectionStatusChange();
      this.messageHandlers.clear();
      this.manualReconnectTriggered = true;
    }
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
}

// Message batching for high-volume scenarios
interface BatchedMessage<T = any> {
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

  add<T = any>(type: string, data?: T) {
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
      }, {} as Record<string, any[]>);

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
