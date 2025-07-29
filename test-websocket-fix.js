const WebSocket = require('ws');

console.log('🔧 Testing WebSocket URL Fix...');
console.log('📍 Testing URL: ws://46.101.193.107:8000/ws/checkins/');

const ws = new WebSocket('ws://46.101.193.107:8000/ws/checkins/');

ws.on('open', function open() {
  console.log('✅ WebSocket connection successful!');
  console.log('🎯 URL fix is working correctly');
  ws.close();
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket connection failed:', err.message);
  console.log('🔍 This might indicate the URL is still incorrect or there are other issues');
});

ws.on('close', function close() {
  console.log('🔒 WebSocket connection closed');
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Connection timeout - WebSocket endpoint might not be accessible');
  process.exit(1);
}, 10000);