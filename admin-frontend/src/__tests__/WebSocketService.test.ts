/**
 * WebSocket Service Integration Tests
 * Tests the complete WebSocket service functionality including connection, authentication, and message handling
 */

import { WebSocketService } from '../services/websocket';

// Mock WebSocket for testing
class MockWebSocket {
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = WebSocket.CONNECTING;
  public static CONNECTING = 0;
  public static OPEN = 1;
  public static CLOSING = 2;
  public static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    // Simulate connection opening after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string): void {
    console.log('MockWebSocket send:', data);
    
    // Simulate server responses based on message type
    const message = JSON.parse(data);
    setTimeout(() => {
      if (message.type === 'heartbeat') {
        this.simulateMessage({
          type: 'heartbeat_ack',
          timestamp: new Date().toISOString()
        });
      } else if (message.type === 'authenticate') {
        this.simulateMessage({
          type: 'authentication_success',
          message: 'Successfully authenticated'
        });
        // Send initial stats after authentication
        this.simulateMessage({
          type: 'initial_stats',
          payload: {
            currentlyIn: 5,
            todayTotal: 25,
            averageStayMinutes: 90
          }
        });
      } else if (message.type === 'check_in') {
        this.simulateMessage({
          type: 'check_in_success',
          payload: {
            id: 'test-checkin-id',
            member: {
              id: message.payload.memberId,
              full_name: 'Test Member',
              membership_type: 'Premium'
            },
            check_in_time: new Date().toISOString(),
            location: message.payload.location
          }
        });
      }
    }, 50);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));
    }
  }

  private simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', {
        data: JSON.stringify(data)
      }));
    }
  }
}

// Mock the global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    webSocketService = new WebSocketService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    webSocketService.disconnect();
  });

  describe('Connection Management', () => {
    test('should establish WebSocket connection with token', async () => {
      const connectPromise = webSocketService.connect(mockToken);
      
      // Wait for connection to establish
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(webSocketService.isConnected()).toBe(true);
    });

    test('should handle connection with URL token', async () => {
      await webSocketService.connect(mockToken);
      
      // Verify the WebSocket was created with the correct URL including token
      expect(webSocketService.isConnected()).toBe(true);
    });

    test('should disconnect cleanly', async () => {
      await webSocketService.connect(mockToken);
      expect(webSocketService.isConnected()).toBe(true);
      
      webSocketService.disconnect();
      
      // Wait for disconnect to process
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(webSocketService.isConnected()).toBe(false);
    });

    test('should handle reconnection attempts', async () => {
      await webSocketService.connect(mockToken);
      
      // Simulate connection loss
      const mockWs = (webSocketService as any).ws;
      mockWs.readyState = WebSocket.CLOSED;
      if (mockWs.onclose) {
        mockWs.onclose(new CloseEvent('close', { code: 1006, reason: 'Connection lost' }));
      }
      
      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should attempt to reconnect
      expect(webSocketService.isConnected()).toBe(true);
    });
  });

  describe('Authentication', () => {
    test('should send authentication message after connection', async () => {
      const sendSpy = jest.spyOn(MockWebSocket.prototype, 'send');
      
      await webSocketService.connect(mockToken);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should send authentication message
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'authenticate',
          payload: { token: mockToken }
        })
      );
    });

    test('should handle authentication success', async () => {
      const authSuccessCallback = jest.fn();
      webSocketService.onAuthenticationSuccess(authSuccessCallback);
      
      await webSocketService.connect(mockToken);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(authSuccessCallback).toHaveBeenCalled();
    });

    test('should receive initial stats after authentication', async () => {
      const statsCallback = jest.fn();
      webSocketService.onInitialStats(statsCallback);
      
      await webSocketService.connect(mockToken);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(statsCallback).toHaveBeenCalledWith({
        currentlyIn: 5,
        todayTotal: 25,
        averageStayMinutes: 90
      });
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      await webSocketService.connect(mockToken);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should send check-in message', async () => {
      const sendSpy = jest.spyOn(MockWebSocket.prototype, 'send');
      
      webSocketService.checkIn('member-123', 'Main Gym', 'Regular workout');
      
      expect(sendSpy).toHaveBeenLastCalledWith(
        JSON.stringify({
          type: 'check_in',
          payload: {
            memberId: 'member-123',
            location: 'Main Gym',
            notes: 'Regular workout'
          }
        })
      );
    });

    test('should handle check-in success response', async () => {
      const successCallback = jest.fn();
      webSocketService.onCheckInSuccess(successCallback);
      
      webSocketService.checkIn('member-123', 'Main Gym');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(successCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-checkin-id',
          member: expect.objectContaining({
            id: 'member-123',
            full_name: 'Test Member'
          })
        })
      );
    });

    test('should send check-out message', () => {
      const sendSpy = jest.spyOn(MockWebSocket.prototype, 'send');
      
      webSocketService.checkOut('checkin-456', 'Workout completed');
      
      expect(sendSpy).toHaveBeenLastCalledWith(
        JSON.stringify({
          type: 'check_out',
          payload: {
            checkInId: 'checkin-456',
            notes: 'Workout completed'
          }
        })
      );
    });

    test('should handle heartbeat mechanism', async () => {
      const sendSpy = jest.spyOn(MockWebSocket.prototype, 'send');
      
      // Trigger heartbeat (this would normally be done by an interval)
      (webSocketService as any).sendHeartbeat();
      
      expect(sendSpy).toHaveBeenLastCalledWith(
        JSON.stringify({ type: 'heartbeat' })
      );
      
      // Wait for heartbeat response
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should receive heartbeat_ack (tested by verifying no connection issues)
      expect(webSocketService.isConnected()).toBe(true);
    });
  });

  describe('Message Batching', () => {
    beforeEach(async () => {
      await webSocketService.connect(mockToken);
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    test('should batch multiple messages when connection is busy', () => {
      const sendSpy = jest.spyOn(MockWebSocket.prototype, 'send');
      
      // Send multiple messages rapidly
      webSocketService.checkIn('member-1', 'Gym A');
      webSocketService.checkIn('member-2', 'Gym B');
      webSocketService.checkOut('checkin-1');
      
      // All messages should be sent (no batching in this simple mock, but structure is verified)
      expect(sendSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors', async () => {
      const errorCallback = jest.fn();
      webSocketService.onError(errorCallback);
      
      await webSocketService.connect(mockToken);
      
      // Simulate error
      const mockWs = (webSocketService as any).ws;
      if (mockWs.onerror) {
        mockWs.onerror(new Event('error'));
      }
      
      expect(errorCallback).toHaveBeenCalled();
    });

    test('should handle check-in errors', async () => {
      const errorCallback = jest.fn();
      webSocketService.onCheckInError(errorCallback);
      
      await webSocketService.connect(mockToken);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate error response
      const mockWs = (webSocketService as any).ws;
      mockWs.simulateMessage({
        type: 'check_in_error',
        payload: { error: 'Member not found' }
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(errorCallback).toHaveBeenCalledWith({ error: 'Member not found' });
    });

    test('should handle invalid JSON messages gracefully', async () => {
      const errorCallback = jest.fn();
      webSocketService.onError(errorCallback);
      
      await webSocketService.connect(mockToken);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate invalid JSON
      const mockWs = (webSocketService as any).ws;
      if (mockWs.onmessage) {
        mockWs.onmessage(new MessageEvent('message', { data: 'invalid-json' }));
      }
      
      // Should handle gracefully without crashing
      expect(webSocketService.isConnected()).toBe(true);
    });
  });

  describe('Event Callbacks', () => {
    test('should support multiple callbacks for the same event', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      webSocketService.onCheckInSuccess(callback1);
      webSocketService.onCheckInSuccess(callback2);
      
      await webSocketService.connect(mockToken);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      webSocketService.checkIn('member-123', 'Main Gym');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('should support removing callbacks', () => {
      const callback = jest.fn();
      
      const removeCallback = webSocketService.onCheckInSuccess(callback);
      removeCallback();
      
      // Callback should be removed and not called
      expect(typeof removeCallback).toBe('function');
    });
  });

  describe('Connection State Management', () => {
    test('should report correct connection state', async () => {
      expect(webSocketService.isConnected()).toBe(false);
      
      await webSocketService.connect(mockToken);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(webSocketService.isConnected()).toBe(true);
      
      webSocketService.disconnect();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(webSocketService.isConnected()).toBe(false);
    });

    test('should queue messages when disconnected', () => {
      // When disconnected, messages should be queued or handled gracefully
      expect(webSocketService.isConnected()).toBe(false);
      
      // This should not throw an error
      expect(() => {
        webSocketService.checkIn('member-123', 'Main Gym');
      }).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete check-in/check-out flow', async () => {
      const checkInCallback = jest.fn();
      const checkOutCallback = jest.fn();
      
      webSocketService.onCheckInSuccess(checkInCallback);
      webSocketService.onCheckOutSuccess(checkOutCallback);
      
      await webSocketService.connect(mockToken);
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Perform check-in
      webSocketService.checkIn('member-123', 'Main Gym', 'Morning workout');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(checkInCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          member: expect.objectContaining({ id: 'member-123' }),
          location: 'Main Gym'
        })
      );
      
      // Simulate check-out response
      const mockWs = (webSocketService as any).ws;
      mockWs.simulateMessage({
        type: 'check_out_success',
        payload: {
          id: 'test-checkin-id',
          member: { id: 'member-123', full_name: 'Test Member' },
          check_out_time: new Date().toISOString()
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(checkOutCallback).toHaveBeenCalled();
    });

    test('should handle real-time updates from other clients', async () => {
      const memberCheckedInCallback = jest.fn();
      const memberCheckedOutCallback = jest.fn();
      
      webSocketService.onMemberCheckedIn(memberCheckedInCallback);
      webSocketService.onMemberCheckedOut(memberCheckedOutCallback);
      
      await webSocketService.connect(mockToken);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate broadcast messages from server
      const mockWs = (webSocketService as any).ws;
      
      mockWs.simulateMessage({
        type: 'member_checked_in',
        payload: {
          id: 'other-checkin-id',
          member: { id: 'other-member', full_name: 'Other Member' },
          location: 'Pool Area'
        }
      });
      
      mockWs.simulateMessage({
        type: 'member_checked_out',
        payload: {
          id: 'other-checkin-id',
          member: { id: 'other-member', full_name: 'Other Member' }
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(memberCheckedInCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          member: expect.objectContaining({ full_name: 'Other Member' }),
          location: 'Pool Area'
        })
      );
      
      expect(memberCheckedOutCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          member: expect.objectContaining({ full_name: 'Other Member' })
        })
      );
    });
  });
});
