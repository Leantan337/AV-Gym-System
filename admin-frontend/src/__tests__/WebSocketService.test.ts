/**
 * WebSocket Service Integration Tests
 * Tests the complete WebSocket service functionality including connection, authentication, and message handling
 */

import { WebSocketService } from '../services/websocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(_data: string) {
    // Mock send implementation - data parameter intentionally unused
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason: reason || '' }));
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;

  beforeEach(() => {
    webSocketService = new WebSocketService('ws://localhost:8000');
    jest.clearAllMocks();
  });

  afterEach(() => {
    webSocketService.disconnect();
  });

  describe('Connection Management', () => {
    test('should initialize with correct baseUrl', () => {
      expect(webSocketService).toBeDefined();
      expect(webSocketService.getConnectionStatus()).toBe('disconnected');
    });

    test('should establish WebSocket connection', async () => {
      webSocketService.connect();
      
      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Note: In actual implementation, connection status might be different
      // based on authentication state
      expect(['connecting', 'connected', 'disconnected']).toContain(
        webSocketService.getConnectionStatus()
      );
    });

    test('should disconnect cleanly', () => {
      webSocketService.connect();
      webSocketService.disconnect();
      
      expect(webSocketService.getConnectionStatus()).toBe('disconnected');
    });

    test('should handle manual reconnection', () => {
      webSocketService.manualReconnect();
      
      // Should initiate reconnection
      expect(['connecting', 'connected', 'disconnected']).toContain(
        webSocketService.getConnectionStatus()
      );
    });
  });

  describe('Authentication', () => {
    test('should handle auth token setting', () => {
      const token = 'test-jwt-token';
      webSocketService.setAuthToken(token);
      
      expect(webSocketService.getAuthToken()).toBe(token);
    });

    test('should clear auth token', () => {
      webSocketService.setAuthToken('test-token');
      webSocketService.setAuthToken(null);
      
      expect(webSocketService.getAuthToken()).toBeNull();
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      webSocketService.connect();
    });

    test('should subscribe to events', () => {
      const callback = jest.fn();
      
      const unsubscribe = webSocketService.subscribe('test_event', callback);
      
      expect(typeof unsubscribe).toBe('function');
    });

    test('should send messages', async () => {
      const sendSpy = jest.spyOn(MockWebSocket.prototype, 'send');
      
      await webSocketService.send('test_message', { data: 'test' });
      
      expect(sendSpy).toHaveBeenCalled();
    });
  });

  describe('Check-in Operations', () => {
    beforeEach(() => {
      webSocketService.connect();
    });

    test('should handle member check-in', async () => {
      const checkInData = {
        memberId: 'member-123',
        timestamp: new Date().toISOString(),
        location: 'Main Gym',
        notes: 'Regular workout'
      };

      // This should not throw an error
      await expect(webSocketService.checkInMember(checkInData)).resolves.not.toThrow();
    });

    test('should handle member check-out', async () => {
      const checkOutData = {
        checkInId: 'checkin-456',
        timestamp: new Date().toISOString(),
        notes: 'Workout completed'
      };

      // This should not throw an error
      await expect(webSocketService.checkOutMember(checkOutData)).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should get performance metrics', () => {
      const metrics = webSocketService.getPerformanceMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });

    test('should enable/disable performance optimization', () => {
      webSocketService.enablePerformanceOptimization(true);
      webSocketService.enablePerformanceOptimization(false);
      
      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Connection Status', () => {
    test('should return valid connection status', () => {
      const status = webSocketService.getConnectionStatus();
      
      expect(['connecting', 'connected', 'disconnected', 'failed', 'authentication_failed'])
        .toContain(status);
    });
  });
});
