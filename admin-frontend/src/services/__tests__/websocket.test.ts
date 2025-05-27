// Import the service and its class
import wsService, { WebSocketService } from '../websocket-new';

// Mock WebSocket
class MockWebSocket {
  url: string;
  readyState: number = 0; // CONNECTING by default
  onopen: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  
  // WebSocket readyState constants
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  
  constructor(url: string) {
    this.url = url;
  }
  
  send(data: string): void {
    // Mock implementation
    console.log('MockWebSocket.send called with', data);
  }
  
  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose();
    }
  }
  
  // Helper methods for testing
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen();
    }
  }
  
  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
  
  simulateError(error: any): void {
    if (this.onerror) {
      this.onerror(error);
    }
  }
  
  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose();
    }
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('WebSocketService', () => {
  let wsService: any; // Using any to access private members for testing
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleLog: jest.SpyInstance;
  
  beforeEach(() => {
    // Spy on console methods
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create a new instance for each test
    wsService = new WebSocketService('ws://test-url/');
  });
  
  afterEach(() => {
    // Clean up
    wsService.disconnect();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
  
  describe('connect', () => {
    it('should initialize WebSocket connection', () => {
      wsService.connect();
      
      expect(wsService.socket).toBeInstanceOf(MockWebSocket);
      expect(wsService.socket.url).toBe('ws://test-url/');
      expect(wsService.connectionStatus).toBe('connecting');
    });
    
    it('should set connection status to connected when socket opens', () => {
      wsService.connect();
      (wsService.socket as MockWebSocket).simulateOpen();
      
      expect(wsService.connectionStatus).toBe('connected');
    });
    
    it('should handle auth token in connection URL', () => {
      wsService.setAuthToken('test-token');
      wsService.connect();
      
      expect(wsService.socket.url).toBe('ws://test-url/?token=test-token');
    });
    
    it('should not reconnect if already connected', () => {
      wsService.connect();
      const socket = wsService.socket;
      (wsService.socket as MockWebSocket).simulateOpen();
      
      wsService.connect();
      
      // Should still be the same socket instance
      expect(wsService.socket).toBe(socket);
    });
  });
  
  describe('message handling', () => {
    beforeEach(() => {
      wsService.connect();
      (wsService.socket as MockWebSocket).simulateOpen();
    });
    
    it('should handle ping-pong messages', () => {
      (wsService.socket as MockWebSocket).simulateMessage({ type: 'pong' });
      
      // No handler should be called for pong messages
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
    
    it('should handle authentication response messages', () => {
      // Test successful auth
      (wsService.socket as MockWebSocket).simulateMessage({ 
        type: 'auth_response', 
        payload: { success: true } 
      });
      
      expect(wsService.connectionStatus).toBe('connected');
      
      // Test failed auth
      (wsService.socket as MockWebSocket).simulateMessage({ 
        type: 'auth_response', 
        payload: { success: false, message: 'Invalid token' } 
      });
      
      expect(wsService.connectionStatus).toBe('authentication_failed');
    });
    
    it('should distribute messages to subscribers', () => {
      const mockHandler = jest.fn();
      wsService.subscribe('test_event', mockHandler);
      
      (wsService.socket as MockWebSocket).simulateMessage({ 
        type: 'test_event', 
        payload: { data: 'test' } 
      });
      
      expect(mockHandler).toHaveBeenCalledWith({ data: 'test' });
    });
    
    it('should handle batched messages', () => {
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      
      wsService.subscribe('event1', mockHandler1);
      wsService.subscribe('event2', mockHandler2);
      
      (wsService.socket as MockWebSocket).simulateMessage({ 
        type: 'batch', 
        payload: { 
          batches: {
            event1: [{ id: 1 }, { id: 2 }],
            event2: [{ id: 3 }]
          }
        } 
      });
      
      expect(mockHandler1).toHaveBeenCalledTimes(2);
      expect(mockHandler1).toHaveBeenNthCalledWith(1, { id: 1 });
      expect(mockHandler1).toHaveBeenNthCalledWith(2, { id: 2 });
      
      expect(mockHandler2).toHaveBeenCalledTimes(1);
      expect(mockHandler2).toHaveBeenCalledWith({ id: 3 });
    });
    
    it('should handle errors in message processing', () => {
      // Simulate a malformed message
      wsService.socket.onmessage({ data: 'not-json' });
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error processing WebSocket message:',
        expect.any(Error)
      );
    });
  });
  
  describe('reconnection', () => {
    it('should attempt to reconnect when connection is lost', () => {
      wsService.connect();
      (wsService.socket as MockWebSocket).simulateOpen();
      (wsService.socket as MockWebSocket).simulateClose();
      
      expect(wsService.connectionStatus).toBe('disconnected');
      expect(wsService.reconnectAttempts).toBe(1);
      
      // Fast-forward past the delay
      jest.runAllTimers();
      
      // A new socket should have been created
      expect(wsService.socket).toBeInstanceOf(MockWebSocket);
    });
    
    it('should implement exponential backoff', () => {
      wsService.connect();
      (wsService.socket as MockWebSocket).simulateOpen();
      
      // First reconnect attempt
      (wsService.socket as MockWebSocket).simulateClose();
      jest.runAllTimers();
      
      // Second reconnect attempt
      (wsService.socket as MockWebSocket).simulateClose();
      
      // Should have a longer delay the second time
      expect(setTimeout).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.any(Number)
      );
      
      // Check that second delay is longer than first
      const mockSetTimeout = jest.mocked(setTimeout);
      const firstDelay = mockSetTimeout.mock.calls[0][1] as number;
      const secondDelay = mockSetTimeout.mock.calls[1][1] as number;
      
      // Ensure we have valid numbers before comparing
      if (typeof firstDelay === 'number' && typeof secondDelay === 'number') {
        expect(secondDelay).toBeGreaterThan(firstDelay);
      } else {
        // If we don't have valid numbers, the test should fail
        expect(firstDelay).toBeGreaterThan(0);
        expect(secondDelay).toBeGreaterThan(0);
      }
    });
    
    it('should stop reconnecting after max attempts', () => {
      wsService.connect();
      
      // Simulate multiple reconnection attempts
      for (let i = 0; i < 6; i++) {
        (wsService.socket as MockWebSocket).simulateClose();
        jest.runAllTimers();
      }
      
      expect(mockConsoleError).toHaveBeenCalledWith('Max reconnection attempts reached');
      expect(wsService.connectionStatus).toBe('disconnected');
    });
    
    it('should handle manual reconnect', () => {
      wsService.connect();
      (wsService.socket as MockWebSocket).simulateClose();
      
      // Reset mocks
      jest.clearAllMocks();
      
      wsService.manualReconnect();
      
      expect(wsService.manualReconnectTriggered).toBe(true);
      expect(wsService.reconnectAttempts).toBe(0);
      expect(wsService.socket).toBeInstanceOf(MockWebSocket);
    });
  });
  
  describe('subscribe', () => {
    it('should add handler to the message handlers map', () => {
      const handler = jest.fn();
      wsService.subscribe('test_event', handler);
      
      // Check if the handler is stored
      expect(wsService.messageHandlers.has('test_event')).toBe(true);
      expect(wsService.messageHandlers.get('test_event').has(handler)).toBe(true);
    });
    
    it('should return an unsubscribe function', () => {
      const handler = jest.fn();
      const unsubscribe = wsService.subscribe('test_event', handler);
      
      // Unsubscribe should be a function
      expect(typeof unsubscribe).toBe('function');
      
      // Call unsubscribe
      unsubscribe();
      
      // Handler should be removed
      expect(wsService.messageHandlers.get('test_event').has(handler)).toBe(false);
    });
    
    it('should cleanup empty handler sets', () => {
      const handler = jest.fn();
      const unsubscribe = wsService.subscribe('test_event', handler);
      
      // Call unsubscribe
      unsubscribe();
      
      // The event should be removed from the map
      expect(wsService.messageHandlers.has('test_event')).toBe(false);
    });
  });
  
  describe('send', () => {
    beforeEach(() => {
      wsService.connect();
      (wsService.socket as MockWebSocket).simulateOpen();
    });
    
    it('should send message when connected', async () => {
      const spy = jest.spyOn(wsService.socket, 'send');
      
      await wsService.send('test_event', { data: 'test' });
      
      expect(spy).toHaveBeenCalledWith(JSON.stringify({ 
        type: 'test_event', 
        data: { data: 'test' } 
      }));
    });
    
    it('should batch high-volume messages', async () => {
      jest.spyOn(wsService.messageBatcher, 'add');
      
      await wsService.send('check_in_update', { id: '123' });
      
      expect(wsService.messageBatcher.add).toHaveBeenCalledWith(
        'check_in_update', 
        { id: '123' }
      );
    });
    
    it('should queue important messages when disconnected', async () => {
      wsService.disconnect();
      
      // Send check-in message when disconnected
      await wsService.send('check_in', { member_id: '123' });
      
      // Message should be queued
      expect(wsService.pendingMessages).toContainEqual({ 
        event: 'check_in', 
        data: { member_id: '123' } 
      });
      
      // Reconnect
      wsService.connect();
      (wsService.socket as MockWebSocket).simulateOpen();
      
      // Pending messages should be sent and queue cleared
      expect(wsService.pendingMessages).toEqual([]);
    });
    
    it('should reject non-critical messages when disconnected', async () => {
      wsService.disconnect();
      
      // Try to send a non-critical message
      await expect(wsService.send('random_event', { data: 'test' }))
        .rejects.toThrow('WebSocket is not connected');
    });
  });
  
  describe('disconnect', () => {
    it('should close the socket and clear intervals', () => {
      wsService.connect();
      (wsService.socket as MockWebSocket).simulateOpen();
      
      const socketSpy = jest.spyOn(wsService.socket, 'close');
      
      wsService.disconnect();
      
      expect(socketSpy).toHaveBeenCalled();
      expect(wsService.socket).toBeNull();
      expect(wsService.connectionStatus).toBe('disconnected');
    });
    
    it('should clear message batcher', () => {
      wsService.connect();
      (wsService.socket as MockWebSocket).simulateOpen();
      
      const batcherSpy = jest.spyOn(wsService.messageBatcher, 'clear');
      
      wsService.disconnect();
      
      expect(batcherSpy).toHaveBeenCalled();
    });
    
    it('should preserve authentication_failed status', () => {
      wsService.connect();
      wsService.connectionStatus = 'authentication_failed';
      
      wsService.disconnect();
      
      expect(wsService.connectionStatus).toBe('authentication_failed');
    });
  });
});
