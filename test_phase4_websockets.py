#!/usr/bin/env python3
"""
Phase 4 WebSocket Real-time Features Test
Tests the enhanced real-time features implemented in Phase 4:
- Enhanced real-time dashboard updates
- Live member activity feed
- Real-time notifications system
- Enhanced check-in/check-out broadcasting
"""

import asyncio
import websockets
import json
import time
import sys
from datetime import datetime

class Phase4WebSocketTester:
    def __init__(self, ws_url, auth_token=None):
        self.ws_url = ws_url
        self.auth_token = auth_token
        self.websocket = None
        self.received_messages = []
        self.test_results = {
            'connection': False,
            'authentication': False,
            'initial_stats': False,
            'stats_updates': False,
            'activity_notifications': False,
            'member_events': False,
            'heartbeat': False
        }

    async def connect(self):
        """Establish WebSocket connection with authentication"""
        try:
            url = self.ws_url
            if self.auth_token:
                url += f"?token={self.auth_token}"
            
            print(f"🔌 Connecting to: {url}")
            self.websocket = await websockets.connect(url)
            self.test_results['connection'] = True
            print("✅ WebSocket connection established")
            return True
            
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False

    async def listen_for_messages(self, duration=10):
        """Listen for WebSocket messages for specified duration"""
        print(f"👂 Listening for messages for {duration} seconds...")
        start_time = time.time()
        
        try:
            while time.time() - start_time < duration:
                try:
                    # Wait for message with timeout
                    message = await asyncio.wait_for(
                        self.websocket.recv(), 
                        timeout=1.0
                    )
                    
                    data = json.loads(message)
                    self.received_messages.append({
                        'timestamp': datetime.now().isoformat(),
                        'data': data
                    })
                    
                    # Analyze message type
                    msg_type = data.get('type', 'unknown')
                    print(f"📨 Received: {msg_type}")
                    
                    # Update test results based on message type
                    if msg_type == 'initial_stats':
                        self.test_results['initial_stats'] = True
                        print("✅ Initial stats received")
                        
                    elif msg_type == 'stats_update':
                        self.test_results['stats_updates'] = True
                        print("✅ Stats update received")
                        
                    elif msg_type == 'activity_notification':
                        self.test_results['activity_notifications'] = True
                        print("✅ Activity notification received")
                        
                    elif msg_type in ['member_checked_in', 'member_checked_out']:
                        self.test_results['member_events'] = True
                        print("✅ Member event received")
                        
                    elif msg_type == 'heartbeat_ack':
                        self.test_results['heartbeat'] = True
                        print("✅ Heartbeat ack received")
                        
                except asyncio.TimeoutError:
                    # No message received, continue listening
                    continue
                    
        except Exception as e:
            print(f"⚠️ Error while listening: {e}")

    async def send_heartbeat(self):
        """Send heartbeat message to test connection health"""
        try:
            heartbeat_msg = {
                'type': 'heartbeat',
                'timestamp': datetime.now().isoformat()
            }
            await self.websocket.send(json.dumps(heartbeat_msg))
            print("💓 Heartbeat sent")
            return True
        except Exception as e:
            print(f"❌ Failed to send heartbeat: {e}")
            return False

    async def simulate_check_in(self, member_id="test-member-123"):
        """Simulate a check-in event to test real-time features"""
        try:
            check_in_msg = {
                'type': 'check_in',
                'payload': {
                    'memberId': member_id,
                    'location': 'Main Gym',
                    'notes': 'Phase 4 test check-in'
                }
            }
            await self.websocket.send(json.dumps(check_in_msg))
            print(f"🏋️ Check-in simulation sent for member: {member_id}")
            return True
        except Exception as e:
            print(f"❌ Failed to send check-in: {e}")
            return False

    async def run_comprehensive_test(self):
        """Run comprehensive Phase 4 feature test"""
        print("🚀 Starting Phase 4 WebSocket Real-time Features Test")
        print("=" * 60)
        
        # Test 1: Connection
        if not await self.connect():
            return False
            
        # Test 2: Listen for initial messages
        print("\n📡 Phase 1: Listening for initial messages...")
        await self.listen_for_messages(5)
        
        # Test 3: Send heartbeat
        print("\n💓 Phase 2: Testing heartbeat...")
        await self.send_heartbeat()
        await self.listen_for_messages(3)
        
        # Test 4: Simulate check-in (if we have a valid member)
        print("\n🏋️ Phase 3: Testing check-in simulation...")
        # Note: This might fail if member doesn't exist, but tests the message flow
        await self.simulate_check_in()
        await self.listen_for_messages(5)
        
        # Final listening period
        print("\n👂 Phase 4: Final message collection...")
        await self.listen_for_messages(10)
        
        await self.websocket.close()
        
        return True

    def print_test_results(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 60)
        print("📊 PHASE 4 WEBSOCKET TEST RESULTS")
        print("=" * 60)
        
        # Test Results Summary
        total_tests = len(self.test_results)
        passed_tests = sum(self.test_results.values())
        
        print(f"\n✅ Tests Passed: {passed_tests}/{total_tests}")
        print(f"📈 Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\n🔍 Detailed Results:")
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"  {test_name:20}: {status}")
        
        # Message Analysis
        print(f"\n📨 Messages Received: {len(self.received_messages)}")
        
        if self.received_messages:
            print("\n📋 Message Types Received:")
            message_types = {}
            for msg in self.received_messages:
                msg_type = msg['data'].get('type', 'unknown')
                message_types[msg_type] = message_types.get(msg_type, 0) + 1
            
            for msg_type, count in message_types.items():
                print(f"  {msg_type:20}: {count} messages")
        
        # Phase 4 Feature Analysis
        print("\n🚀 Phase 4 Features Status:")
        
        features = {
            'Real-time Stats': self.test_results['initial_stats'] or self.test_results['stats_updates'],
            'Activity Feed': self.test_results['activity_notifications'],
            'Member Events': self.test_results['member_events'],
            'Connection Health': self.test_results['heartbeat'],
            'Basic Connectivity': self.test_results['connection']
        }
        
        for feature, status in features.items():
            status_icon = "✅" if status else "❌"
            print(f"  {feature:20}: {status_icon}")
        
        # Overall Assessment
        print("\n🎯 PHASE 4 ASSESSMENT:")
        if passed_tests >= total_tests * 0.8:
            print("🎉 EXCELLENT: Phase 4 real-time features are working well!")
        elif passed_tests >= total_tests * 0.6:
            print("👍 GOOD: Most Phase 4 features are operational.")
        elif passed_tests >= total_tests * 0.4:
            print("⚠️ PARTIAL: Some Phase 4 features need attention.")
        else:
            print("🔧 NEEDS WORK: Phase 4 implementation requires fixes.")

    def save_results_to_file(self, filename="phase4_test_results.json"):
        """Save test results to file for analysis"""
        results = {
            'test_timestamp': datetime.now().isoformat(),
            'test_results': self.test_results,
            'message_count': len(self.received_messages),
            'received_messages': self.received_messages
        }
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"💾 Test results saved to: {filename}")

async def main():
    """Main test execution"""
    # Configuration
    WS_URL = "ws://46.101.193.107:8001/ws/checkins/"
    
    # For testing with authentication, you would need a valid JWT token
    # AUTH_TOKEN = "your_jwt_token_here"
    AUTH_TOKEN = None  # Testing without auth for now
    
    print("🧪 Phase 4 WebSocket Real-time Features Test Suite")
    print(f"🌐 Target URL: {WS_URL}")
    print(f"🔐 Authentication: {'Enabled' if AUTH_TOKEN else 'Disabled (testing connection only)'}")
    
    # Create and run tester
    tester = Phase4WebSocketTester(WS_URL, AUTH_TOKEN)
    
    try:
        await tester.run_comprehensive_test()
        tester.print_test_results()
        tester.save_results_to_file()
        
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Starting Phase 4 WebSocket test in 3 seconds...")
    time.sleep(3)
    asyncio.run(main())
