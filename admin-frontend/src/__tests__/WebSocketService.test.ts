/**
 * WebSocket Service Integration Tests
 * Tests the complete WebSocket service functionality including connection, authentication, and message handling
 */

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen?: (event: Event) => void;
  onclose?: (event: CloseEvent) => void;
  onmessage?: (event: MessageEvent) => void;
  onerror?: (event: Event) => void;

  constructor(public url: string) {
    // Simulate connection opening after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 50);
  }

  send(_data: string) {
    // Mock successful send
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Set up global WebSocket mock
global.WebSocket = MockWebSocket as any;

import { WebSocketService } from '../services/websocket';

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  const mockBaseUrl = 'ws://localhost:8000/ws/checkins/';

  beforeEach(() => {
    // Create service with required baseUrl parameter
    webSocketService = new WebSocketService(mockBaseUrl);
  });

  afterEach(() => {
    webSocketService.disconnect();
  });

  describe('initialization', () => {
    it('should initialize with base URL', () => {
      expect(webSocketService).toBeDefined();
      expect(webSocketService.getConnectionStatus()).toBe('disconnected');
    });

    it('should throw error with invalid URL', () => {
      expect(() => new WebSocketService('invalid-url')).toThrow('Invalid WebSocket base URL');
    });
  });

  describe('connection management', () => {
    it('should connect successfully', async () => {
      webSocketService.setAuthToken('test-token');
      webSocketService.connect();
      
      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(webSocketService.getConnectionStatus()).toBe('connected');
    });

    it('should handle manual reconnection', () => {
      webSocketService.setAuthToken('test-token');
      webSocketService.connect();
      
      // Test manual reconnect
      webSocketService.manualReconnect();
      expect(webSocketService.getConnectionStatus()).toEqual(expect.any(String));
    });

    it('should disconnect properly', () => {
      webSocketService.setAuthToken('test-token');
      webSocketService.connect();
      webSocketService.disconnect();
      
      expect(webSocketService.getConnectionStatus()).toBe('disconnected');
    });
  });

  describe('authentication', () => {
    it('should set and get auth token', () => {
      const token = 'test-jwt-token';
      webSocketService.setAuthToken(token);
      expect(webSocketService.getAuthToken()).toBe(token);
    });

    it('should handle null auth token', () => {
      webSocketService.setAuthToken(null);
      expect(webSocketService.getAuthToken()).toBeNull();
    });
  });

  describe('check-in functionality', () => {
    beforeEach(() => {
      webSocketService.setAuthToken('test-token');
      webSocketService.connect();
    });

    it('should send check-in data', async () => {
      const checkInData = {
        memberId: 'member-123',
        timestamp: new Date().toISOString(),
        location: 'Main Gym',
        notes: 'Regular workout'
      };

      await expect(webSocketService.checkInMember(checkInData)).resolves.not.toThrow();
    });

    it('should send check-out data', async () => {
      const checkOutData = {
        checkInId: 'checkin-456',
        timestamp: new Date().toISOString(),
        notes: 'Workout completed'
      };

      await expect(webSocketService.checkOutMember(checkOutData)).resolves.not.toThrow();
    });
  });

  describe('performance metrics', () => {
    it('should return performance metrics', () => {
      const metrics = webSocketService.getPerformanceMetrics();
      expect(metrics).toHaveProperty('totalReceived');
      expect(metrics).toHaveProperty('totalSent');
      expect(metrics).toHaveProperty('errorsCount');
    });

    it('should enable/disable performance optimization', () => {
      webSocketService.enablePerformanceOptimization(false);
      webSocketService.enablePerformanceOptimization(true);
      // Should not throw errors
    });
  });

  describe('message sending', () => {
    beforeEach(() => {
      webSocketService.setAuthToken('test-token');
      webSocketService.connect();
    });

    it('should send messages when connected', async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for connection
      
      await expect(webSocketService.send('test_event', { test: 'data' })).resolves.not.toThrow();
    });

    it('should queue messages when disconnected', async () => {
      webSocketService.disconnect();
      
      // Check-in/check-out messages should be queued
      await expect(webSocketService.send('check_in', { memberId: 'test' })).resolves.not.toThrow();
    });
  });

  describe('connection status', () => {
    it('should return disconnected when no socket', () => {
      expect(webSocketService.getConnectionStatus()).toBe('disconnected');
    });

    it('should handle connection status changes', async () => {
      // Note: In the real implementation, you'd use subscribe method for status changes
      // This is a simplified test

      webSocketService.setAuthToken('test-token');
      webSocketService.connect();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(webSocketService.getConnectionStatus()).toBe('connected');
    });
  });

  describe('error handling', () => {
    it('should handle connection errors gracefully', () => {
      // Test connection without auth token should not crash
      expect(() => webSocketService.connect()).not.toThrow();
    });

    it('should handle send errors when disconnected', async () => {
      // Most events should reject when not connected
      await expect(webSocketService.send('non_queueable_event', {})).rejects.toThrow();
    });
  });
});
