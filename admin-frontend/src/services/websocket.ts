type MessageHandler = (data: any) => void;
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private connectionStatus: ConnectionStatus = 'disconnected';

  constructor(private baseUrl: string) {}

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    try {
      this.connectionStatus = 'connecting';
      this.notifyConnectionStatusChange();
      
      this.socket = new WebSocket(this.baseUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.connectionStatus = 'connected';
        this.notifyConnectionStatusChange();
      };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, payload } = message;

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

  // Notify all connection status listeners
  private notifyConnectionStatusChange() {
    const handlers = this.messageHandlers.get('connection_status');
    if (handlers) {
      handlers.forEach(handler => handler(this.connectionStatus));
    }
  }

  // Get current connection status
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
  
  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.connectionStatus = 'disconnected';
      this.notifyConnectionStatusChange();
      return;
    }

    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      this.reconnectAttempts++;
      this.reconnectDelay *= 2; // Exponential backoff
      this.connect();
    }, this.reconnectDelay);
  }

  subscribe(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  unsubscribe(type: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.messageHandlers.delete(type);
      }
    }
  }

  send(type: string, payload: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connectionStatus = 'disconnected';
    this.notifyConnectionStatusChange();
    this.messageHandlers.clear();
  }
  
  // Force a reconnection attempt
  reconnectNow() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.connect();
  }
}

// Create a singleton instance
const wsService = new WebSocketService('ws://localhost:8000/ws/checkins/');

export default wsService;
