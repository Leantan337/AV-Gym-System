/**
 * WebSocket Service Integration Tests
 * These tests verify the WebSocket service functionality in a browser environment
 */

// Global mock for WebSocket
const mockWebSocketInstances: MockWebSocket[] = [];

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private messageQueue: string[] = [];

  constructor(url: string) {
    this.url = url;
    mockWebSocketInstances.push(this);
    
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    if (this.readyState === MockWebSocket.OPEN) {
      this.messageQueue.push(data);
      // Echo back for testing
      setTimeout(() => {
        if (this.onmessage) {
          const message = JSON.parse(data);
          let response;
          
          if (message.type === 'authenticate') {
            response = { type: 'authentication_success' };
          } else if (message.type === 'heartbeat') {
            response = { type: 'heartbeat_ack', timestamp: new Date().toISOString() };
          } else if (message.type === 'check_in') {
            response = { 
              type: 'check_in_success', 
              payload: { 
                id: 'test-checkin-id',
                member: { id: message.data?.memberId, full_name: 'Test Member' }
              }
            };
          } else if (message.type === 'check_out') {
            response = { 
              type: 'check_out_success', 
              payload: { 
                id: message.data?.checkInId,
                check_out_time: new Date().toISOString()
              }
            };
          }
          
          if (response) {
            this.onmessage(new MessageEvent('message', { 
              data: JSON.stringify(response) 
            }));
          }
        }
      }, 10);
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { 
        data: JSON.stringify(data) 
      }));
    }
  }

  getLastMessage() {
    return this.messageQueue[this.messageQueue.length - 1];
  }

  getAllMessages() {
    return [...this.messageQueue];
  }
}

// Mock WebSocket globally
(window as any).WebSocket = MockWebSocket;

import { WebSocketService } from '../websocket';

describe('WebSocket Service Integration Tests', () => {
  let wsService: WebSocketService;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    // Clear previous instances
    mockWebSocketInstances.length = 0;
    
    // Create a new service instance for each test
    wsService = new WebSocketService('ws://localhost:8000/ws/checkins/');
    
    // Get reference to the mock WebSocket instance
    setTimeout(() => {
      mockWebSocket = mockWebSocketInstances[0];
    }, 50);
  });

  afterEach(() => {
    if (wsService) {
      wsService.disconnect();
    }
    mockWebSocketInstances.length = 0;
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection', (done: jest.DoneCallback) => {
      const statusHandler = jest.fn();
      wsService.subscribe('connection_status', statusHandler);

      setTimeout(() => {
        expect(statusHandler).toHaveBeenCalledWith('connected');
        done();
      }, 100);
    });

    it('should handle authentication', (done: jest.DoneCallback) => {
      wsService.setAuthToken('test-token');
      
      setTimeout(() => {
        const messages = mockWebSocket.getAllMessages();
        const authMessage = messages.find(msg => {
          const parsed = JSON.parse(msg);
          return parsed.type === 'authenticate';
        });
        
        expect(authMessage).toBeDefined();
        if (authMessage) {
          const parsed = JSON.parse(authMessage);
          expect(parsed.payload.token).toBe('test-token');
        }
        done();
      }, 100);
    });

    it('should handle connection failures and retry', (done: jest.DoneCallback) => {
      const statusHandler = jest.fn();
      wsService.subscribe('connection_status', statusHandler);

      setTimeout(() => {
        // Simulate connection error
        mockWebSocket.simulateError();
        
        setTimeout(() => {
          // Should attempt to reconnect
          expect(statusHandler).toHaveBeenCalledWith('connecting');
          done();
        }, 50);
      }, 50);
    });

    it('should maintain heartbeat', (done: jest.DoneCallback) => {
      setTimeout(() => {
        // Wait for heartbeat interval
        setTimeout(() => {
          const messages = mockWebSocket.getAllMessages();
          const heartbeatMessage = messages.find(msg => {
            const parsed = JSON.parse(msg);
            return parsed.type === 'heartbeat';
          });
          
          expect(heartbeatMessage).toBeDefined();
          done();
        }, 11000); // Wait for heartbeat interval
      }, 50);
    }, 15000);
  });

  describe('Message Handling', () => {
    beforeEach((done: jest.DoneCallback) => {
      // Wait for connection to be established
      setTimeout(done, 50);
    });

    it('should send check-in messages', async () => {
      await wsService.send('check_in', { memberId: 'member-123' });
      
      const lastMessage = mockWebSocket.getLastMessage();
      const parsed = JSON.parse(lastMessage);
      
      expect(parsed.type).toBe('check_in');
      expect(parsed.data.memberId).toBe('member-123');
    });

    it('should send check-out messages', async () => {
      await wsService.send('check_out', { checkInId: 'checkin-123' });
      
      const lastMessage = mockWebSocket.getLastMessage();
      const parsed = JSON.parse(lastMessage);
      
      expect(parsed.type).toBe('check_out');
      expect(parsed.data.checkInId).toBe('checkin-123');
    });

    it('should handle received messages', (done: jest.DoneCallback) => {
      const messageHandler = jest.fn();
      wsService.subscribe('check_in_success', messageHandler);

      // Simulate received message
      mockWebSocket.simulateMessage({
        type: 'check_in_success',
        payload: { id: 'test-id', member: { full_name: 'Test Member' } }
      });

      setTimeout(() => {
        expect(messageHandler).toHaveBeenCalledWith({
          id: 'test-id',
          member: { full_name: 'Test Member' }
        });
        done();
      }, 50);
    });

    it('should handle subscription and unsubscription', () => {
      const messageHandler = jest.fn();
      const unsubscribe = wsService.subscribe('test_event', messageHandler);

      // Simulate message
      mockWebSocket.simulateMessage({ type: 'test_event', payload: 'test-data' });

      expect(messageHandler).toHaveBeenCalledWith('test-data');

      // Unsubscribe and test again
      unsubscribe();
      messageHandler.mockClear();

      mockWebSocket.simulateMessage({ type: 'test_event', payload: 'test-data-2' });

      expect(messageHandler).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach((done: jest.DoneCallback) => {
      setTimeout(done, 50);
    });

    it('should handle authentication errors', (done: jest.DoneCallback) => {
      const statusHandler = jest.fn();
      wsService.subscribe('connection_status', statusHandler);

      // Simulate authentication error
      mockWebSocket.simulateMessage({
        type: 'authentication_error',
        payload: { message: 'Invalid token' }
      });

      setTimeout(() => {
        expect(statusHandler).toHaveBeenCalledWith('authentication_failed');
        done();
      }, 50);
    });

    it('should handle malformed messages gracefully', (done: jest.DoneCallback) => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {
        // Mock console.error implementation
      });

      // Simulate malformed message
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage(new MessageEvent('message', { 
          data: 'invalid json' 
        }));
      }

      setTimeout(() => {
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
        done();
      }, 50);
    });
  });

  describe('Integration with Check-in Operations', () => {
    beforeEach((done: jest.DoneCallback) => {
      setTimeout(done, 50);
    });

    it('should perform complete check-in flow', async () => {
      const successHandler = jest.fn();
      wsService.subscribe('check_in_success', successHandler);

      await wsService.checkInMember({ 
        memberId: 'member-123',
        timestamp: new Date().toISOString(),
        location: 'Main Gym'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(successHandler).toHaveBeenCalled();
      if (successHandler.mock.calls.length > 0) {
        const callArgs = successHandler.mock.calls[0][0];
        expect(callArgs.member.id).toBe('member-123');
      }
    });

    it('should perform complete check-out flow', async () => {
      const successHandler = jest.fn();
      wsService.subscribe('check_out_success', successHandler);

      await wsService.checkOutMember({ 
        checkInId: 'checkin-123',
        timestamp: new Date().toISOString()
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(successHandler).toHaveBeenCalled();
      if (successHandler.mock.calls.length > 0) {
        const callArgs = successHandler.mock.calls[0][0];
        expect(callArgs.id).toBe('checkin-123');
      }
    });
  });
});
