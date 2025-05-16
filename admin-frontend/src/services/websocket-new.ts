export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

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
const MAX_RECONNECT_ATTEMPTS = 5;

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly PING_INTERVAL = 30000; // 30 seconds

  constructor(private baseUrl: string) {}

  connect() {
    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) return;
      this.disconnect();
    }

    try {
      this.connectionStatus = 'connecting';
      this.notifyConnectionStatusChange();
      
      this.socket = new WebSocket(this.baseUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.connectionStatus = 'connected';
        this.notifyConnectionStatusChange();
        this.setupPing();
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          const { type, payload } = message;

          // Handle ping-pong
          if (type === 'pong') {
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
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.PING_INTERVAL);
  }

  private reconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      this.connectionStatus = 'disconnected';
      this.notifyConnectionStatusChange();
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, Math.min(delay, 30000)); // Max 30s delay
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
          this.socket.send(JSON.stringify({ type: event, data }));
          resolve();
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
          reject(error);
        }
      } else {
        const error = new Error('WebSocket is not connected');
        console.error(error);
        reject(error);
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

      this.socket.close();
      this.socket = null;
      this.connectionStatus = 'disconnected';
      this.notifyConnectionStatusChange();
    }
  }

  private notifyConnectionStatusChange() {
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

// Create a singleton instance
const wsService = new WebSocketService('ws://localhost:8000/ws/checkins/');

export default wsService;
