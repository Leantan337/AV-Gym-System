// Import the service and its types
import wsService, { WebSocketService, ConnectionStatus } from '../websocket';

// Mock WebSocket class for testing
class MockWebSocket extends WebSocket {
  constructor(url: string) {
    super(url);
  }

  simulateOpen() {
    if (this.onopen) this.onopen(new Event('open'));
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', {
        data: JSON.stringify(data)
      }));
    }
  }

  simulateError(error: Error) {
    if (this.onerror) this.onerror(new ErrorEvent('error', { error }));
  }

  simulateClose(code = 1000, reason = '') {
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Add test helper to access private properties
const getPrivateProperty = <T>(obj: any, prop: string): T => {
  return (obj as any)[prop];
};

// Mock the global WebSocket
global.WebSocket = MockWebSocket as any;

// Mock console methods
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
});

describe('WebSocketService', () => {
  let wsService: WebSocketService;
  let mockSocket: MockWebSocket;
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleLog: jest.SpyInstance;
  
  beforeEach(() => {
    // Spy on console methods
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create a new instance for each test
    wsService = new WebSocketService('ws://localhost:8000/ws/checkins/');
    // Create a mock socket that we can control
    mockSocket = new MockWebSocket('ws://localhost:8000/ws/checkins/');
  });
  
  afterEach(() => {
    // Clean up
    wsService.disconnect();
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
  
  describe('connection management', () => {
    it('should connect successfully', () => {
      // Mock the WebSocket constructor
      (global as any).WebSocket = jest.fn(() => mockSocket);
      
      wsService.connect(false, false);
      mockSocket.simulateOpen();
      
      const status = getPrivateProperty<ConnectionStatus>(wsService, 'connectionStatus');
      expect(status).toBe('connected');
    });

    it('should handle connection errors', () => {
      (global as any).WebSocket = jest.fn(() => mockSocket);
      
      wsService.connect(false, false);
      mockSocket.simulateError(new Error('Connection failed'));
      
      const status = getPrivateProperty<ConnectionStatus>(wsService, 'connectionStatus');
      expect(status).toBe('disconnected');
    });

    it('should handle manual reconnection', () => {
      (global as any).WebSocket = jest.fn(() => mockSocket);
      
      wsService.connect(true, false);
      mockSocket.simulateOpen();
      
      const status = getPrivateProperty<ConnectionStatus>(wsService, 'connectionStatus');
      expect(status).toBe('connected');
    });

    it('should handle automatic reconnection', () => {
      (global as any).WebSocket = jest.fn(() => mockSocket);
      
      wsService.connect(false, true);
      mockSocket.simulateOpen();
      
      const status = getPrivateProperty<ConnectionStatus>(wsService, 'connectionStatus');
      expect(status).toBe('connected');
    });

    it('should handle connection timeout', () => {
      (global as any).WebSocket = jest.fn(() => mockSocket);
      
      wsService.connect(false, false);
      // Simulate timeout by not calling simulateOpen
      jest.advanceTimersByTime(getPrivateProperty<number>(wsService, 'CONNECTION_TIMEOUT'));
      
      const status = getPrivateProperty<ConnectionStatus>(wsService, 'connectionStatus');
      expect(status).toBe('disconnected');
    });
  });
  
  describe('message handling', () => {
    beforeEach(() => {
      (global as any).WebSocket = jest.fn(() => mockSocket);
      wsService.connect(false, false);
      mockSocket.simulateOpen();
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
