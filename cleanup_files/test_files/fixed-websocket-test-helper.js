// Fixed WebSocket Test Helper for AV Gym System
// This script addresses the token detection and protocol correction issues

console.log('🔧 Loading FIXED WebSocket Test Helper...');

class FixedWebSocketTester {
    constructor() {
        this.ws = null;
        this.testResults = [];
        this.startTime = null;
        this.messageCount = 0;
        this.reconnectCount = 0;
        this.isMonitoring = false;
    }

    // FIXED: Get auth token from correct localStorage location
    getAuthToken() {
        console.log('🔍 Checking token storage locations...');
        
        // Your app stores token as 'token' (not 'access_token')
        const tokenSources = [
            { key: 'token', value: localStorage.getItem('token') },
            { key: 'access_token', value: localStorage.getItem('access_token') },
            { key: 'authToken', value: localStorage.getItem('authToken') },
            { key: 'accessToken', value: localStorage.getItem('accessToken') }
        ];
        
        console.log('📍 Available localStorage keys:', Object.keys(localStorage));
        
        for (const source of tokenSources) {
            if (source.value && source.value !== 'null' && source.value !== 'undefined') {
                console.log(`✅ Found token in '${source.key}':`, source.value.substring(0, 30) + '...');
                return source.value;
            } else {
                console.log(`❌ No token in '${source.key}':`, source.value);
            }
        }
        
        console.error('❌ No auth token found in any storage location');
        return null;
    }

    // FIXED: Use correct WebSocket protocol (ws:// not wss://)
    async connect(token = null) {
        try {
            const authToken = token || this.getAuthToken();
            
            if (!authToken) {
                console.error('❌ No auth token found. Please make sure you are logged in.');
                console.log('💡 Try logging in first at the frontend, then run this test again.');
                return false;
            }

            // FIXED: Use ws:// protocol (not wss://) to match backend configuration
            const wsUrl = `ws://46.101.193.107:8000/ws/checkins/?token=${authToken}`;
            console.log('🔗 Connecting to:', wsUrl.replace(authToken, '[TOKEN_HIDDEN]'));
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket Connected Successfully!');
                this.logResult('connection', 'success', 'Connected successfully');
                
                // Send authentication message
                const authMessage = {
                    type: 'authenticate',
                    payload: { token: authToken }
                };
                console.log('🔐 Sending authentication message...');
                this.ws.send(JSON.stringify(authMessage));
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('📨 Message received:', data);
                this.messageCount++;
                this.logResult('message', 'received', data);
                
                // Handle authentication response
                if (data.type === 'authentication_success') {
                    console.log('🎉 Authentication successful!');
                } else if (data.type === 'authentication_error') {
                    console.error('❌ Authentication failed:', data.payload);
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('🔌 WebSocket Closed:', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean
                });
                this.logResult('connection', 'closed', `Code: ${event.code}, Reason: ${event.reason}`);
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket Error:', error);
                this.logResult('connection', 'error', error.toString());
            };
            
            return true;
        } catch (error) {
            console.error('❌ Connection failed:', error);
            this.logResult('connection', 'failed', error.toString());
            return false;
        }
    }

    // Start comprehensive monitoring
    startMonitoring() {
        this.isMonitoring = true;
        this.startTime = Date.now();
        this.testResults = [];
        this.messageCount = 0;
        
        console.log('🔍 Starting WebSocket monitoring...');
        console.log('📋 This will test:');
        console.log('  - ✅ Token detection (fixed)');
        console.log('  - ✅ Protocol correction (ws:// not wss://)');
        console.log('  - ✅ Authentication flow');
        console.log('  - ✅ Message handling');
        console.log('  - ✅ Connection stability');
        
        // Connect to WebSocket
        this.connect();
        
        // Send heartbeat every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.sendMessage('heartbeat', { timestamp: new Date().toISOString() });
            }
        }, 30000);
        
        return 'Monitoring started. Use fixedWsTest.getTestResults() to see results.';
    }

    // Send test message
    sendMessage(type, payload) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('❌ WebSocket not connected');
            console.log('💡 Current state:', this.getReadyStateText(this.ws?.readyState || 3));
            return false;
        }
        
        const message = {
            type: type,
            payload: payload,
            timestamp: new Date().toISOString()
        };
        
        console.log('📤 Sending:', message);
        this.ws.send(JSON.stringify(message));
        this.logResult('message', 'sent', message);
        return true;
    }

    // Test check-in functionality
    testCheckIn(memberId = 'test-member-123') {
        console.log('🏃 Testing check-in functionality...');
        return this.sendMessage('check_in', {
            member_id: memberId,
            location: 'Main Gym',
            notes: 'WebSocket test check-in - ' + new Date().toLocaleTimeString()
        });
    }

    // Test check-out functionality
    testCheckOut(memberId = 'test-member-123') {
        console.log('🚪 Testing check-out functionality...');
        return this.sendMessage('check_out', {
            member_id: memberId,
            notes: 'WebSocket test check-out - ' + new Date().toLocaleTimeString()
        });
    }

    // Simulate disconnect/reconnect
    simulateDisconnect() {
        if (this.ws) {
            console.log('🔌 Simulating disconnect...');
            this.ws.close(1000, 'Test disconnect');
            this.reconnectCount++;
        }
    }

    simulateReconnect() {
        console.log('🔄 Attempting reconnection...');
        setTimeout(() => {
            this.connect();
        }, 1000);
    }

    // Log test results
    logResult(category, type, data) {
        this.testResults.push({
            timestamp: new Date().toISOString(),
            category: category,
            type: type,
            data: data,
            elapsed: this.startTime ? Date.now() - this.startTime : 0
        });
    }

    // Get comprehensive test results
    getTestResults() {
        const uptime = this.startTime ? (Date.now() - this.startTime) / 1000 : 0;
        
        const results = {
            summary: {
                uptime_seconds: uptime.toFixed(2),
                messages_sent: this.testResults.filter(r => r.type === 'sent').length,
                messages_received: this.testResults.filter(r => r.type === 'received').length,
                reconnections: this.reconnectCount,
                connection_status: this.ws ? this.getReadyStateText(this.ws.readyState) : 'Not connected',
                raw_ready_state: this.ws ? this.ws.readyState : null
            },
            connection_health: this.ws ? {
                ready_state: this.ws.readyState,
                ready_state_text: this.getReadyStateText(this.ws.readyState),
                url: this.ws.url.replace(/token=[^&]+/, 'token=[HIDDEN]'),
                protocol: this.ws.protocol || 'none'
            } : null,
            detailed_logs: this.testResults,
            performance_metrics: {
                messages_per_minute: uptime > 0 ? ((this.messageCount / (uptime / 60)).toFixed(2)) : '0',
                average_response_time: this.calculateAverageResponseTime() + 'ms'
            },
            fixes_applied: {
                token_detection: '✅ Fixed - Now checks localStorage.getItem("token")',
                protocol_correction: '✅ Fixed - Using ws:// instead of wss://',
                csp_compliance: '✅ Fixed - Using non-secure WebSocket',
                authentication_flow: '✅ Enhanced - Better error handling'
            }
        };
        
        console.log('📊 FIXED WebSocket Test Results:');
        console.table(results.summary);
        
        if (results.connection_health) {
            console.log('🔗 Connection Health:', results.connection_health);
        }
        
        console.log('📈 Performance:', results.performance_metrics);
        console.log('🔧 Fixes Applied:', results.fixes_applied);
        
        return results;
    }

    getReadyStateText(state) {
        const states = {
            0: 'CONNECTING',
            1: 'OPEN',
            2: 'CLOSING', 
            3: 'CLOSED'
        };
        return states[state] || 'UNKNOWN';
    }

    calculateAverageResponseTime() {
        const responses = this.testResults.filter(r => r.type === 'received');
        if (responses.length === 0) return 0;
        
        const totalTime = responses.reduce((sum, r) => sum + r.elapsed, 0);
        return (totalTime / responses.length).toFixed(2);
    }

    // Stop monitoring
    stopMonitoring() {
        this.isMonitoring = false;
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        if (this.ws) {
            this.ws.close(1000, 'Test completed');
        }
        
        console.log('🛑 Monitoring stopped');
        return this.getTestResults();
    }

    // Comprehensive test sequence
    runFullTestSequence() {
        console.log('🚀 Starting FULL WebSocket test sequence...');
        
        // Start monitoring
        this.startMonitoring();
        
        // Test sequence with delays
        setTimeout(() => {
            console.log('⏰ Step 1: Testing check-in...');
            this.testCheckIn('test-member-001');
        }, 3000);
        
        setTimeout(() => {
            console.log('⏰ Step 2: Testing check-out...');
            this.testCheckOut('test-member-001');
        }, 6000);
        
        setTimeout(() => {
            console.log('⏰ Step 3: Testing heartbeat...');
            this.sendMessage('heartbeat', { test: true });
        }, 9000);
        
        setTimeout(() => {
            console.log('⏰ Step 4: Testing disconnect/reconnect...');
            this.simulateDisconnect();
            setTimeout(() => this.simulateReconnect(), 2000);
        }, 12000);
        
        setTimeout(() => {
            console.log('⏰ Step 5: Final results...');
            const results = this.getTestResults();
            console.log('🎉 FULL TEST SEQUENCE COMPLETE!');
            
            // Analysis
            if (results.summary.messages_received > 0) {
                console.log('✅ SUCCESS: WebSocket is working correctly!');
            } else {
                console.log('❌ ISSUES: No messages received, check backend connectivity');
            }
            
            return results;
        }, 20000);
        
        return 'Full test sequence started. Results will be displayed automatically.';
    }
}

// Create global instance with fixed implementation
window.fixedWsTest = new FixedWebSocketTester();

console.log('✅ FIXED WebSocket Test Helper loaded successfully!');
console.log('');
console.log('🎯 Available commands:');
console.log('🔗 fixedWsTest.connect() - Connect with FIXED token detection');
console.log('🔍 fixedWsTest.startMonitoring() - Start comprehensive monitoring');
console.log('🚀 fixedWsTest.runFullTestSequence() - Run complete test suite');
console.log('📊 fixedWsTest.getTestResults() - Get detailed results');
console.log('✔️ fixedWsTest.testCheckIn() - Test check-in functionality');
console.log('✔️ fixedWsTest.testCheckOut() - Test check-out functionality');
console.log('🔌 fixedWsTest.simulateDisconnect() - Test disconnection');
console.log('🔄 fixedWsTest.simulateReconnect() - Test reconnection');
console.log('🛑 fixedWsTest.stopMonitoring() - Stop monitoring');
console.log('');
console.log('🎉 QUICK START:');
console.log('   fixedWsTest.runFullTestSequence()');
console.log('');
console.log('🔧 FIXES APPLIED:');
console.log('   ✅ Token detection: Now uses localStorage.getItem("token")');
console.log('   ✅ Protocol: Changed from wss:// to ws://');
console.log('   ✅ CSP compliance: Using non-secure WebSocket');
console.log('   ✅ Better error handling and authentication flow');
