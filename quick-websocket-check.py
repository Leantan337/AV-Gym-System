#!/usr/bin/env python3
"""
Quick WebSocket Connection Test Script
Tests both ws:// and wss:// protocols to verify our fixes work
"""
import asyncio
import websockets
import json
import sys
from datetime import datetime

class WebSocketTester:
    def __init__(self, base_url="46.101.193.107:8000"):
        self.base_url = base_url
        self.token = None
        
    async def get_auth_token(self):
        """Get auth token via HTTP API"""
        import aiohttp
        try:
            async with aiohttp.ClientSession() as session:
                # Try to get token - adjust credentials as needed
                login_data = {
                    "username": "admin",  # Adjust as needed
                    "password": "your_password"  # Adjust as needed
                }
                async with session.post(f"http://{self.base_url}/api/auth/login/", 
                                      json=login_data) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.token = data.get('access') or data.get('token')
                        print(f"✅ Got auth token: {self.token[:20]}...")
                        return self.token
                    else:
                        print(f"❌ Auth failed: {response.status}")
                        return None
        except Exception as e:
            print(f"❌ Auth error: {e}")
            return None
    
    async def test_websocket_connection(self, protocol="ws"):
        """Test WebSocket connection with specified protocol"""
        url = f"{protocol}://{self.base_url}/ws/checkins/"
        print(f"\n🔄 Testing {protocol.upper()} connection to: {url}")
        
        try:
            # Add token to headers if available
            headers = {}
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"
            
            async with websockets.connect(url, extra_headers=headers) as websocket:
                print(f"✅ {protocol.upper()} connection successful!")
                
                # Send a test message
                test_message = {
                    "type": "ping",
                    "timestamp": datetime.now().isoformat()
                }
                await websocket.send(json.dumps(test_message))
                print(f"📤 Sent test message: {test_message}")
                
                # Wait for response (with timeout)
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    print(f"📥 Received response: {response}")
                    return True
                except asyncio.TimeoutError:
                    print(f"⚠️  No response received (timeout)")
                    return True  # Connection worked, just no response
                    
        except websockets.exceptions.InvalidStatusCode as e:
            print(f"❌ {protocol.upper()} connection failed: HTTP {e.status_code}")
            if e.status_code == 403:
                print("   This might be due to CSP blocking the connection")
            return False
        except Exception as e:
            print(f"❌ {protocol.upper()} connection error: {e}")
            return False
    
    async def run_tests(self):
        """Run comprehensive WebSocket tests"""
        print("🚀 Starting WebSocket Connection Tests")
        print("=" * 50)
        
        # Get auth token first
        await self.get_auth_token()
        
        # Test both protocols
        ws_result = await self.test_websocket_connection("ws")
        wss_result = await self.test_websocket_connection("wss")
        
        print("\n" + "=" * 50)
        print("📊 TEST RESULTS:")
        print(f"WS://  (non-secure): {'✅ PASS' if ws_result else '❌ FAIL'}")
        print(f"WSS:// (secure):     {'✅ PASS' if wss_result else '❌ FAIL'}")
        
        if ws_result and not wss_result:
            print("\n🎯 EXPECTED RESULT: WS works, WSS fails")
            print("   This confirms our fix is working correctly!")
        elif not ws_result and not wss_result:
            print("\n⚠️  Both protocols failed - check server status")
        elif ws_result and wss_result:
            print("\n✅ Both protocols work - server supports both!")
        
        return ws_result or wss_result

async def main():
    tester = WebSocketTester()
    success = await tester.run_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
