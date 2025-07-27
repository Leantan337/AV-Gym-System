// Quick WebSocket test using Node.js
const WebSocket = require('ws');

console.log('🚀 Testing WebSocket Connections...');
console.log('=' * 50);

// Test WS (should work with our fixes)
function testWS() {
    return new Promise((resolve) => {
        console.log('🔄 Testing WS:// connection...');
        const ws = new WebSocket('ws://46.101.193.107:8000/ws/checkins/');
        
        const timeout = setTimeout(() => {
            ws.close();
            console.log('⏰ WS connection timeout');
            resolve(false);
        }, 5000);
        
        ws.on('open', () => {
            clearTimeout(timeout);
            console.log('✅ WS connection successful!');
            ws.close();
            resolve(true);
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.log('❌ WS connection failed:', error.message);
            resolve(false);
        });
    });
}

// Test WSS (should fail due to CSP)
function testWSS() {
    return new Promise((resolve) => {
        console.log('🔄 Testing WSS:// connection...');
        const ws = new WebSocket('wss://46.101.193.107:8000/ws/checkins/');
        
        const timeout = setTimeout(() => {
            ws.close();
            console.log('⏰ WSS connection timeout');
            resolve(false);
        }, 5000);
        
        ws.on('open', () => {
            clearTimeout(timeout);
            console.log('✅ WSS connection successful!');
            ws.close();
            resolve(true);
        });
        
        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.log('❌ WSS connection failed:', error.message);
            resolve(false);
        });
    });
}

async function runTests() {
    const wsResult = await testWS();
    const wssResult = await testWSS();
    
    console.log('\n' + '=' * 50);
    console.log('📊 TEST RESULTS:');
    console.log(`WS://  (non-secure): ${wsResult ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`WSS:// (secure):     ${wssResult ? '✅ PASS' : '❌ FAIL'}`);
    
    if (wsResult && !wssResult) {
        console.log('\n🎯 EXPECTED RESULT: WS works, WSS fails');
        console.log('   This confirms our fix is working correctly!');
    } else if (!wsResult && !wssResult) {
        console.log('\n⚠️  Both protocols failed - check server status');
    } else if (wsResult && wssResult) {
        console.log('\n✅ Both protocols work - server supports both!');
    }
}

runTests().catch(console.error);
