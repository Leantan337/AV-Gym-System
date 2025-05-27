/**
 * WebSocket Test Helper
 * 
 * This utility helps with testing WebSocket functionality in the browser.
 * It provides functions to:
 * 1. Monitor WebSocket traffic
 * 2. Simulate network conditions
 * 3. Generate test metrics
 * 
 * Usage:
 * - Run startMonitoring() in browser console to begin monitoring
 * - Use the provided helper functions during testing
 * - Check results with getTestResults() when done
 */

// Singleton instance
let instance = null;

class WebSocketTestHelper {
  constructor() {
    if (instance) {
      return instance;
    }
    
    this.originalWebSocket = window.WebSocket;
    this.monitoring = false;
    this.stats = this.resetStats();
    this.sockets = [];
    this.eventTimestamps = {};
    
    // Test results
    this.testResults = {
      messageDeliveryTimes: [],
      reconnectionTimes: [],
      uiUpdateTimes: [],
      memorySnapshots: []
    };
    
    instance = this;
  }
  
  resetStats() {
    return {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      connectionAttempts: 0,
      successfulConnections: 0,
      disconnections: 0,
      reconnections: 0,
      errors: 0,
      messageTypes: {},
      lastActivity: null
    };
  }
  
  /**
   * Start monitoring WebSocket traffic
   */
  startMonitoring() {
    if (this.monitoring) {
      console.log('Already monitoring WebSocket traffic');
      return;
    }
    
    this.monitoring = true;
    this.stats = this.resetStats();
    this.monitorTime = Date.now();
    
    // Replace the WebSocket constructor
    const self = this;
    window.WebSocket = function(url, protocols) {
      const socket = new self.originalWebSocket(url, protocols);
      self.interceptSocket(socket, url);
      return socket;
    };
    
    // Copy static properties
    window.WebSocket.CONNECTING = self.originalWebSocket.CONNECTING;
    window.WebSocket.OPEN = self.originalWebSocket.OPEN;
    window.WebSocket.CLOSING = self.originalWebSocket.CLOSING;
    window.WebSocket.CLOSED = self.originalWebSocket.CLOSED;
    
    console.log('WebSocket monitoring started!');
    console.log('Available commands:');
    console.log('- wsTest.getStats() - Get current statistics');
    console.log('- wsTest.simulateDisconnect() - Simulate network disconnection');
    console.log('- wsTest.simulateReconnect() - Simulate network reconnection');
    console.log('- wsTest.getTestResults() - Get test results');
    console.log('- wsTest.stopMonitoring() - Stop monitoring');
  }
  
  /**
   * Stop monitoring and restore original WebSocket
   */
  stopMonitoring() {
    if (!this.monitoring) {
      console.log('Not currently monitoring WebSocket traffic');
      return;
    }
    
    window.WebSocket = this.originalWebSocket;
    this.monitoring = false;
    console.log('WebSocket monitoring stopped after ' + this.formatDuration(Date.now() - this.monitorTime));
    console.log('Final statistics:', this.getStats());
  }
  
  /**
   * Intercept a WebSocket instance to monitor its traffic
   */
  interceptSocket(socket, url) {
    const self = this;
    self.stats.connectionAttempts++;
    self.stats.lastActivity = Date.now();
    
    this.markEvent('connection_attempt');
    
    // Add socket to tracked sockets
    this.sockets.push(socket);
    
    // Intercept onopen
    const originalOnOpen = socket.onopen;
    socket.onopen = function(event) {
      self.stats.successfulConnections++;
      self.stats.lastActivity = Date.now();
      self.markEvent('connection_success');
      console.log(`%cWebSocket Connected: ${url}`, 'color: green');
      
      if (self.stats.reconnections > 0) {
        // Calculate reconnection time
        const reconnectionTime = Date.now() - self.disconnectTime;
        self.testResults.reconnectionTimes.push(reconnectionTime);
        console.log(`Reconnection took ${reconnectionTime}ms`);
      }
      
      if (originalOnOpen) originalOnOpen.apply(this, arguments);
    };
    
    // Intercept onclose
    const originalOnClose = socket.onclose;
    socket.onclose = function(event) {
      self.stats.disconnections++;
      self.stats.lastActivity = Date.now();
      self.disconnectTime = Date.now();
      self.markEvent('disconnection');
      console.log(`%cWebSocket Disconnected: ${url}`, 'color: red');
      
      if (originalOnClose) originalOnClose.apply(this, arguments);
    };
    
    // Intercept onerror
    const originalOnError = socket.onerror;
    socket.onerror = function(event) {
      self.stats.errors++;
      self.stats.lastActivity = Date.now();
      self.markEvent('error');
      console.log(`%cWebSocket Error: ${url}`, 'color: red', event);
      
      if (originalOnError) originalOnError.apply(this, arguments);
    };
    
    // Intercept onmessage
    const originalOnMessage = socket.onmessage;
    socket.onmessage = function(event) {
      self.stats.messagesReceived++;
      self.stats.bytesReceived += event.data.length;
      self.stats.lastActivity = Date.now();
      
      try {
        const message = JSON.parse(event.data);
        const messageType = message.type || 'unknown';
        
        // Track message types
        if (!self.stats.messageTypes[messageType]) {
          self.stats.messageTypes[messageType] = 0;
        }
        self.stats.messageTypes[messageType]++;
        
        // Check if this is a response to a tracked message
        if (self.sentMessages && self.sentMessages[messageType]) {
          const sentTime = self.sentMessages[messageType];
          const deliveryTime = Date.now() - sentTime;
          self.testResults.messageDeliveryTimes.push({
            type: messageType,
            deliveryTime
          });
          delete self.sentMessages[messageType];
          
          console.log(`Message delivery time for ${messageType}: ${deliveryTime}ms`);
        }
        
        // Special handling for check-in events to measure UI update time
        if (messageType === 'check_in_update') {
          self.markEvent('check_in_received');
          // Start monitoring for DOM updates that would indicate UI refresh
          self.monitorUiUpdates('dashboard-check-in-count', 'recent-check-ins');
        }
        
        console.log(`%c⬇️ Received ${messageType}:`, 'color: blue', message);
      } catch (e) {
        console.log(`%c⬇️ Received non-JSON message:`, 'color: blue', event.data);
      }
      
      if (originalOnMessage) originalOnMessage.apply(this, arguments);
    };
    
    // Intercept send
    const originalSend = socket.send;
    socket.send = function(data) {
      self.stats.messagesSent++;
      self.stats.bytesSent += data.length;
      self.stats.lastActivity = Date.now();
      
      try {
        const message = JSON.parse(data);
        const messageType = message.type || 'unknown';
        
        // Track when this message was sent for delivery time calculation
        if (!self.sentMessages) self.sentMessages = {};
        self.sentMessages[messageType] = Date.now();
        
        // Special handling for check-in events
        if (messageType === 'check_in') {
          self.markEvent('check_in_sent');
        }
        
        console.log(`%c⬆️ Sent ${messageType}:`, 'color: green', message);
      } catch (e) {
        console.log(`%c⬆️ Sent non-JSON message:`, 'color: green', data);
      }
      
      return originalSend.apply(this, arguments);
    };
  }
  
  /**
   * Monitor UI updates after receiving a message
   */
  monitorUiUpdates(...selectors) {
    const startTime = Date.now();
    const self = this;
    
    // Take a snapshot of current DOM elements
    const initialState = selectors.map(selector => {
      const element = document.querySelector(selector);
      return element ? element.innerHTML : null;
    });
    
    // Check for changes every 10ms
    const interval = setInterval(() => {
      let changed = false;
      
      selectors.forEach((selector, index) => {
        const element = document.querySelector(selector);
        if (element && element.innerHTML !== initialState[index]) {
          changed = true;
        }
      });
      
      if (changed) {
        clearInterval(interval);
        const updateTime = Date.now() - startTime;
        self.testResults.uiUpdateTimes.push(updateTime);
        self.markEvent('ui_updated');
        console.log(`UI updated in ${updateTime}ms after receiving WebSocket message`);
      }
      
      // Stop checking after 2 seconds
      if (Date.now() - startTime > 2000) {
        clearInterval(interval);
        console.log('No UI update detected within 2 seconds');
      }
    }, 10);
  }
  
  /**
   * Mark an event timestamp for timing analysis
   */
  markEvent(eventName) {
    if (!this.eventTimestamps[eventName]) {
      this.eventTimestamps[eventName] = [];
    }
    this.eventTimestamps[eventName].push(Date.now());
  }
  
  /**
   * Get current statistics
   */
  getStats() {
    const duration = this.monitoring ? Date.now() - this.monitorTime : 0;
    
    return {
      ...this.stats,
      duration: this.formatDuration(duration),
      messagesPerSecond: duration ? (this.stats.messagesReceived / (duration / 1000)).toFixed(2) : 0,
      activeConnections: this.sockets.filter(s => s.readyState === WebSocket.OPEN).length,
      pendingConnections: this.sockets.filter(s => s.readyState === WebSocket.CONNECTING).length
    };
  }
  
  /**
   * Simulate network disconnection
   */
  simulateDisconnect() {
    if (!this.monitoring) {
      console.log('Start monitoring first with startMonitoring()');
      return;
    }
    
    console.log('%cSimulating network disconnection...', 'color: orange');
    this.markEvent('simulated_disconnect');
    
    // Find the app's WebSocketService instance
    const wsService = window.wsService || this.findWebSocketService();
    
    if (wsService && wsService.socket) {
      // Force socket to close
      wsService.socket.close();
      this.disconnectTime = Date.now();
      console.log('WebSocket connection closed');
    } else {
      console.log('No active WebSocket connection found');
    }
  }
  
  /**
   * Simulate network reconnection
   */
  simulateReconnect() {
    if (!this.monitoring) {
      console.log('Start monitoring first with startMonitoring()');
      return;
    }
    
    console.log('%cSimulating network reconnection...', 'color: green');
    this.markEvent('simulated_reconnect');
    this.stats.reconnections++;
    
    // Find the app's WebSocketService instance
    const wsService = window.wsService || this.findWebSocketService();
    
    if (wsService) {
      // Call reconnect or connect method if available
      if (typeof wsService.manualReconnect === 'function') {
        wsService.manualReconnect();
        console.log('Manual reconnect triggered');
      } else if (typeof wsService.connect === 'function') {
        wsService.connect();
        console.log('Connect method called');
      } else {
        console.log('No reconnect method found in WebSocketService');
      }
    } else {
      console.log('WebSocketService not found');
    }
  }
  
  /**
   * Take a memory snapshot and add to test results
   */
  takeMemorySnapshot() {
    this.testResults.memorySnapshots.push({
      timestamp: Date.now(),
      jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit,
      totalJSHeapSize: performance.memory?.totalJSHeapSize,
      usedJSHeapSize: performance.memory?.usedJSHeapSize
    });
    
    console.log('Memory snapshot taken:', this.testResults.memorySnapshots[this.testResults.memorySnapshots.length - 1]);
  }
  
  /**
   * Get comprehensive test results
   */
  getTestResults() {
    // Calculate average message delivery time
    const avgDeliveryTime = this.testResults.messageDeliveryTimes.length
      ? this.testResults.messageDeliveryTimes.reduce((sum, item) => sum + item.deliveryTime, 0) / this.testResults.messageDeliveryTimes.length
      : 0;
    
    // Calculate average reconnection time
    const avgReconnectionTime = this.testResults.reconnectionTimes.length
      ? this.testResults.reconnectionTimes.reduce((sum, time) => sum + time, 0) / this.testResults.reconnectionTimes.length
      : 0;
    
    // Calculate average UI update time
    const avgUiUpdateTime = this.testResults.uiUpdateTimes.length
      ? this.testResults.uiUpdateTimes.reduce((sum, time) => sum + time, 0) / this.testResults.uiUpdateTimes.length
      : 0;
    
    // Calculate memory usage trend
    let memoryTrend = 'No data';
    if (this.testResults.memorySnapshots.length >= 2) {
      const firstSnapshot = this.testResults.memorySnapshots[0];
      const lastSnapshot = this.testResults.memorySnapshots[this.testResults.memorySnapshots.length - 1];
      
      if (lastSnapshot.usedJSHeapSize > firstSnapshot.usedJSHeapSize) {
        const increase = lastSnapshot.usedJSHeapSize - firstSnapshot.usedJSHeapSize;
        const percentIncrease = ((increase / firstSnapshot.usedJSHeapSize) * 100).toFixed(2);
        memoryTrend = `Increasing: +${this.formatBytes(increase)} (+${percentIncrease}%)`;
      } else {
        const decrease = firstSnapshot.usedJSHeapSize - lastSnapshot.usedJSHeapSize;
        const percentDecrease = ((decrease / firstSnapshot.usedJSHeapSize) * 100).toFixed(2);
        memoryTrend = `Stable/Decreasing: -${this.formatBytes(decrease)} (-${percentDecrease}%)`;
      }
    }
    
    return {
      testDuration: this.formatDuration(Date.now() - this.monitorTime),
      messageStats: {
        totalSent: this.stats.messagesSent,
        totalReceived: this.stats.messagesReceived,
        byMessageType: this.stats.messageTypes
      },
      connectionStats: {
        attempts: this.stats.connectionAttempts,
        successes: this.stats.successfulConnections,
        disconnections: this.stats.disconnections,
        reconnections: this.stats.reconnections,
        errors: this.stats.errors
      },
      performanceMetrics: {
        messageDeliveryTime: {
          average: `${avgDeliveryTime.toFixed(2)}ms`,
          min: this.testResults.messageDeliveryTimes.length 
            ? `${Math.min(...this.testResults.messageDeliveryTimes.map(item => item.deliveryTime))}ms`
            : 'N/A',
          max: this.testResults.messageDeliveryTimes.length
            ? `${Math.max(...this.testResults.messageDeliveryTimes.map(item => item.deliveryTime))}ms`
            : 'N/A',
          target: '< 500ms'
        },
        reconnectionTime: {
          average: `${avgReconnectionTime.toFixed(2)}ms`,
          min: this.testResults.reconnectionTimes.length
            ? `${Math.min(...this.testResults.reconnectionTimes)}ms`
            : 'N/A',
          max: this.testResults.reconnectionTimes.length
            ? `${Math.max(...this.testResults.reconnectionTimes)}ms`
            : 'N/A',
          target: '< 3000ms'
        },
        uiUpdateTime: {
          average: `${avgUiUpdateTime.toFixed(2)}ms`,
          min: this.testResults.uiUpdateTimes.length
            ? `${Math.min(...this.testResults.uiUpdateTimes)}ms`
            : 'N/A',
          max: this.testResults.uiUpdateTimes.length
            ? `${Math.max(...this.testResults.uiUpdateTimes)}ms`
            : 'N/A',
          target: '< 100ms'
        },
        memoryUsage: {
          trend: memoryTrend,
          snapshots: this.testResults.memorySnapshots.length,
          target: 'No growth over time'
        }
      },
      timeline: this.getEventTimeline(),
      rawData: this.testResults
    };
  }
  
  /**
   * Create a timeline of events
   */
  getEventTimeline() {
    const timeline = [];
    const startTime = this.monitorTime;
    
    // Flatten all events into a single timeline
    Object.entries(this.eventTimestamps).forEach(([eventName, timestamps]) => {
      timestamps.forEach(timestamp => {
        timeline.push({
          event: eventName,
          timestamp,
          relativeTime: timestamp - startTime
        });
      });
    });
    
    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp - b.timestamp);
    
    // Format for display
    return timeline.map(item => ({
      event: item.event,
      time: this.formatDuration(item.relativeTime)
    }));
  }
  
  /**
   * Try to find the WebSocketService instance in the application
   */
  findWebSocketService() {
    // Try to find in global scope
    if (window.wsService) return window.wsService;
    
    // Look for it in React component instances (requires React DevTools)
    // This is a best effort approach and may not work in all cases
    console.log('Could not find WebSocketService automatically');
    return null;
  }
  
  /**
   * Format bytes as human-readable string
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  /**
   * Format duration in milliseconds as human-readable string
   */
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Create global instance for console access
window.wsTest = new WebSocketTestHelper();

// Usage instructions
console.log(`
WebSocket Test Helper loaded!

To start monitoring:
  wsTest.startMonitoring()

During testing:
  wsTest.getStats() - See current statistics
  wsTest.simulateDisconnect() - Simulate network disconnection
  wsTest.simulateReconnect() - Simulate network reconnection
  wsTest.takeMemorySnapshot() - Take a memory usage snapshot

When finished:
  wsTest.getTestResults() - See comprehensive test results
  wsTest.stopMonitoring() - Stop monitoring
`);

export default window.wsTest;
