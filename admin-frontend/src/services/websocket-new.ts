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

const RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_ATTEMPTS = 15; // Increased from 5 for better resilience
const MAX_RECONNECT_DELAY = 30000; // 30 seconds max delay between attempts

export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds
  private authToken: string | null = null;
  private messageBatcher = new MessageBatcher();
  private pendingMessages: Array<{ event: string; data: any }> = [];
  private manualReconnectTriggered = false;

  constructor(private baseUrl: string) {}

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
      if (this.socket.readyState === WebSocket.OPEN) return;
      this.disconnect();
    }

    try {
      this.connectionStatus = 'connecting';
      this.notifyConnectionStatusChange();
      
      // Create a more secure connection with proper JWT handling
      let url = this.baseUrl;
      // Instead of passing token in URL (which can be logged/cached),
      // we'll use the auth message approach after connection
      // This keeps the token out of server logs and browser history
      
      this.socket = new WebSocket(url);
      this.manualReconnectTriggered = manualReconnect;

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Send authentication message immediately after connection
        if (this.authToken && this.socket) {
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
          const messages = [...this.pendingMessages];
          this.pendingMessages = [];
          messages.forEach(msg => this.send(msg.event, msg.data));
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          const { type, payload } = message;

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

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.connectionStatus = 'disconnected';
        this.notifyConnectionStatusChange();
        this.reconnect();
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

    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Error sending ping message:', error);
          // If we can't send a ping, the connection might be dead
          // but the browser hasn't detected it yet
          this.disconnect();
          this.connect();
        }
      }
    }, this.PING_INTERVAL);
  }

  private reconnect() {
    // Don't auto-reconnect after manual reconnect reaches max attempts
    if (this.manualReconnectTriggered && this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max manual reconnection attempts reached');
      this.connectionStatus = 'disconnected';
      this.notifyConnectionStatusChange();
      this.manualReconnectTriggered = false;
      return;
    }
    
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      this.connectionStatus = 'disconnected';
      this.notifyConnectionStatusChange();
      
      // After reaching max attempts, schedule a final retry after 1 minute
      // This helps recover from longer network outages
      setTimeout(() => {
        console.log('Final reconnection attempt after cooldown period');
        this.reconnectAttempts = 0;
        this.connect();
      }, 60000); // 1 minute cooldown
      
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Calculate delay with exponential backoff (1s, 2s, 4s, 8s, etc.)
    // but with some randomization to prevent all clients reconnecting simultaneously
    const baseDelay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
    const jitter = Math.random() * 1000; // Add up to 1s of random jitter
    const delay = Math.min(baseDelay + jitter, MAX_RECONNECT_DELAY);
    
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${Math.round(delay)}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.manualReconnectTriggered);
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
      
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      
      // Clean up message batcher
      this.messageBatcher.clear();

      // Only change status if not already disconnected
      if (this.socket.readyState !== WebSocket.CLOSED) {
        this.socket.close();
      }
      
      this.socket = null;
      
      // Only update status if not auth failed (to preserve the error state)
      if (this.connectionStatus !== 'authentication_failed') {
        this.connectionStatus = 'disconnected';
        this.notifyConnectionStatusChange();
      }
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

  constructor() {}

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
