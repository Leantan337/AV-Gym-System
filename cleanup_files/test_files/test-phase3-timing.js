#!/usr/bin/env node

// WebSocket Connection Test for Phase 3 Timing Fixes
// Tests Docker local setup: localhost:3000 -> ws://localhost:8000

console.log('🧪 PHASE 3 WEBSOCKET CONNECTION TEST');
console.log('=====================================');
console.log('Testing connection timing fixes with Docker local setup...\n');

const WebSocket = require('ws');

// Test WebSocket connection to Docker backend
const wsUrl = 'ws://localhost:8000/ws/checkins/?token=test-token';
console.log(`📡 Connecting to: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

let testResults = {
  handshakeTime: null,
  connectionEstablished: false,
  authenticationPassed: false,
  timingIssues: false
};

const startTime = Date.now();

ws.on('open', () => {
  testResults.handshakeTime = Date.now() - startTime;
  testResults.connectionEstablished = true;
  
  console.log(`✅ WebSocket handshake successful in ${testResults.handshakeTime}ms`);
  console.log('🔐 Testing authentication flow...');
  
  // Test if connection stays open (auth success)
  setTimeout(() => {
    if (ws.readyState === WebSocket.OPEN) {
      testResults.authenticationPassed = true;
      console.log('✅ Authentication successful - connection maintained');
      
      // Test Phase 3 timing fix: send message immediately
      ws.send(JSON.stringify({
        type: 'test_message',
        timestamp: Date.now()
      }));
      
      console.log('📤 Test message sent to verify timing fixes');
    } else {
      console.log('❌ Authentication failed - connection closed');
    }
    
    printResults();
    ws.close();
  }, 1000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 Received message:', message.type);
    
    if (message.type === 'heartbeat_ack') {
      console.log('💓 Heartbeat acknowledged - connection stable');
    }
  } catch (error) {
    console.log('📨 Received raw message:', data.toString());
  }
});

ws.on('error', (error) => {
  console.log(`❌ WebSocket error: ${error.message}`);
  testResults.timingIssues = true;
  printResults();
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
  if (!testResults.connectionEstablished) {
    testResults.timingIssues = true;
  }
  printResults();
});

// Timeout after 5 seconds
setTimeout(() => {
  if (ws.readyState === WebSocket.CONNECTING) {
    console.log('⏰ Connection timeout - potential timing issues');
    testResults.timingIssues = true;
    ws.close();
  }
}, 5000);

function printResults() {
  console.log('\n📊 PHASE 3 TEST RESULTS');
  console.log('========================');
  console.log(`Handshake Time: ${testResults.handshakeTime || 'N/A'}ms`);
  console.log(`Connection: ${testResults.connectionEstablished ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Authentication: ${testResults.authenticationPassed ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`Timing Issues: ${testResults.timingIssues ? '❌ DETECTED' : '✅ NONE'}`);
  
  console.log('\n🎯 Phase 3 Connection Timing Status:');
  if (testResults.connectionEstablished && !testResults.timingIssues) {
    console.log('✅ Phase 3 timing fixes working correctly');
    console.log('🚀 Ready for Phase 4: Real-time Features');
  } else {
    console.log('⚠️  Timing issues detected - Phase 3 needs attention');
  }
  
  console.log('\n🐳 Docker Local Setup:');
  console.log('- Frontend: http://localhost:3000');
  console.log('- Backend: http://localhost:8000');
  console.log('- WebSocket: ws://localhost:8000/ws/checkins/');
  
  process.exit(testResults.timingIssues ? 1 : 0);
}
