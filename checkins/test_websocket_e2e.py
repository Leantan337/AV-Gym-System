import pytest
import asyncio
import json
import websockets
import requests
from django.test import LiveServerTestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from members.models import Member
from checkins.models import CheckIn
from django.utils import timezone

User = get_user_model()


class WebSocketEndToEndTestCase(LiveServerTestCase):
    """
    End-to-end WebSocket tests that test the complete flow
    from frontend to backend including authentication and real-time updates.
    """
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # Get the WebSocket URL from the live server
        cls.ws_url = cls.live_server_url.replace('http', 'ws') + '/ws/checkins/'
        
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.member = Member.objects.create(
            full_name='Test Member',
            phone='1234567890',
            address='Test Address'
        )
        self.token = str(AccessToken.for_user(self.user))
        
    def tearDown(self):
        """Clean up test data"""
        CheckIn.objects.all().delete()
        Member.objects.all().delete()
        User.objects.all().delete()

    async def async_test_websocket_connection_and_auth(self):
        """Test WebSocket connection and authentication"""
        uri = f"{self.ws_url}?token={self.token}"
        
        async with websockets.connect(uri) as websocket:
            # Should receive initial stats after authentication
            response = await websocket.recv()
            data = json.loads(response)
            self.assertEqual(data['type'], 'initial_stats')
            self.assertIn('payload', data)

    def test_websocket_connection_and_auth(self):
        """Wrapper for async WebSocket test"""
        asyncio.run(self.async_test_websocket_connection_and_auth())

    async def async_test_check_in_flow(self):
        """Test complete check-in flow"""
        uri = f"{self.ws_url}?token={self.token}"
        
        async with websockets.connect(uri) as websocket:
            # Wait for initial stats
            await websocket.recv()
            
            # Send check-in request
            check_in_message = {
                "type": "check_in",
                "payload": {
                    "memberId": str(self.member.id),
                    "location": "Main Gym",
                    "notes": "E2E test check-in"
                }
            }
            await websocket.send(json.dumps(check_in_message))
            
            # Should receive check-in success
            response = await websocket.recv()
            data = json.loads(response)
            self.assertEqual(data['type'], 'check_in_success')
            self.assertEqual(data['payload']['member']['id'], str(self.member.id))
            
            # Should also receive broadcast
            response = await websocket.recv()
            data = json.loads(response)
            self.assertEqual(data['type'], 'member_checked_in')
            
            return data['payload']['id']  # Return check-in ID for checkout

    def test_check_in_flow(self):
        """Wrapper for async check-in test"""
        asyncio.run(self.async_test_check_in_flow())

    async def async_test_check_out_flow(self):
        """Test complete check-out flow"""
        uri = f"{self.ws_url}?token={self.token}"
        
        async with websockets.connect(uri) as websocket:
            # Wait for initial stats
            await websocket.recv()
            
            # First perform check-in
            check_in_message = {
                "type": "check_in",
                "payload": {"memberId": str(self.member.id)}
            }
            await websocket.send(json.dumps(check_in_message))
            
            # Get check-in success response
            response = await websocket.recv()
            check_in_data = json.loads(response)
            check_in_id = check_in_data['payload']['id']
            
            # Clear broadcast message
            await websocket.recv()
            
            # Now perform check-out
            check_out_message = {
                "type": "check_out",
                "payload": {
                    "checkInId": check_in_id,
                    "notes": "E2E test check-out"
                }
            }
            await websocket.send(json.dumps(check_out_message))
            
            # Should receive check-out success
            response = await websocket.recv()
            data = json.loads(response)
            self.assertEqual(data['type'], 'check_out_success')
            self.assertEqual(data['payload']['id'], check_in_id)
            self.assertIsNotNone(data['payload']['check_out_time'])
            
            # Should also receive broadcast
            response = await websocket.recv()
            data = json.loads(response)
            self.assertEqual(data['type'], 'member_checked_out')

    def test_check_out_flow(self):
        """Wrapper for async check-out test"""
        asyncio.run(self.async_test_check_out_flow())

    async def async_test_multiple_clients(self):
        """Test broadcasting to multiple clients"""
        uri = f"{self.ws_url}?token={self.token}"
        
        # Connect two clients
        async with websockets.connect(uri) as ws1, websockets.connect(uri) as ws2:
            # Wait for initial stats on both connections
            await ws1.recv()
            await ws2.recv()
            
            # Client 1 performs check-in
            check_in_message = {
                "type": "check_in",
                "payload": {"memberId": str(self.member.id)}
            }
            await ws1.send(json.dumps(check_in_message))
            
            # Client 1 should receive success message
            response1 = await ws1.recv()
            data1 = json.loads(response1)
            self.assertEqual(data1['type'], 'check_in_success')
            
            # Both clients should receive broadcast
            broadcast1 = await ws1.recv()
            broadcast2 = await ws2.recv()
            
            broadcast1_data = json.loads(broadcast1)
            broadcast2_data = json.loads(broadcast2)
            
            self.assertEqual(broadcast1_data['type'], 'member_checked_in')
            self.assertEqual(broadcast2_data['type'], 'member_checked_in')
            self.assertEqual(broadcast1_data['payload']['member']['id'], str(self.member.id))
            self.assertEqual(broadcast2_data['payload']['member']['id'], str(self.member.id))

    def test_multiple_clients(self):
        """Wrapper for async multiple clients test"""
        asyncio.run(self.async_test_multiple_clients())

    async def async_test_heartbeat(self):
        """Test heartbeat functionality"""
        uri = f"{self.ws_url}?token={self.token}"
        
        async with websockets.connect(uri) as websocket:
            # Wait for initial stats
            await websocket.recv()
            
            # Send heartbeat
            heartbeat_message = {"type": "heartbeat"}
            await websocket.send(json.dumps(heartbeat_message))
            
            # Should receive heartbeat acknowledgment
            response = await websocket.recv()
            data = json.loads(response)
            self.assertEqual(data['type'], 'heartbeat_ack')
            self.assertIn('timestamp', data)

    def test_heartbeat(self):
        """Wrapper for async heartbeat test"""
        asyncio.run(self.async_test_heartbeat())

    async def async_test_authentication_failure(self):
        """Test authentication failure scenarios"""
        # Test with invalid token
        uri = f"{self.ws_url}?token=invalid-token"
        
        try:
            async with websockets.connect(uri) as websocket:
                # Send a message that requires authentication
                check_in_message = {
                    "type": "check_in",
                    "payload": {"memberId": str(self.member.id)}
                }
                await websocket.send(json.dumps(check_in_message))
                
                # Should receive authentication error
                response = await websocket.recv()
                data = json.loads(response)
                self.assertEqual(data['type'], 'error')
                self.assertIn('Authentication required', data['message'])
        except websockets.exceptions.ConnectionClosedError:
            # Connection might be closed due to auth failure, which is acceptable
            pass

    def test_authentication_failure(self):
        """Wrapper for async authentication failure test"""
        asyncio.run(self.async_test_authentication_failure())

    async def async_test_invalid_message_handling(self):
        """Test handling of invalid messages"""
        uri = f"{self.ws_url}?token={self.token}"
        
        async with websockets.connect(uri) as websocket:
            # Wait for initial stats
            await websocket.recv()
            
            # Send invalid JSON
            await websocket.send("invalid json")
            
            # Should receive error message
            response = await websocket.recv()
            data = json.loads(response)
            self.assertEqual(data['type'], 'error')
            self.assertIn('Invalid JSON format', data['message'])

    def test_invalid_message_handling(self):
        """Wrapper for async invalid message test"""
        asyncio.run(self.async_test_invalid_message_handling())

    def test_rest_api_integration(self):
        """Test that WebSocket updates are consistent with REST API"""
        # This test ensures that WebSocket operations result in 
        # the same database state as REST API operations
        
        # First, get initial check-in count via API
        api_url = f"{self.live_server_url}/api/checkins/"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        initial_response = requests.get(api_url, headers=headers)
        initial_count = len(initial_response.json()['results'])
        
        # Perform check-in via WebSocket
        asyncio.run(self.async_test_check_in_flow())
        
        # Verify via API that check-in was created
        final_response = requests.get(api_url, headers=headers)
        final_count = len(final_response.json()['results'])
        
        self.assertEqual(final_count, initial_count + 1)


class WebSocketPerformanceTestCase(LiveServerTestCase):
    """
    Performance tests for WebSocket functionality
    """
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.ws_url = cls.live_server_url.replace('http', 'ws') + '/ws/checkins/'
        
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.member = Member.objects.create(
            full_name='Test Member',
            email='member@example.com',
            phone_number='1234567890',
            date_joined=timezone.now()
        )
        self.token = str(AccessToken.for_user(self.user))

    async def async_test_concurrent_connections(self):
        """Test handling of multiple concurrent connections"""
        uri = f"{self.ws_url}?token={self.token}"
        
        # Create multiple concurrent connections
        connections = []
        try:
            for i in range(10):
                conn = await websockets.connect(uri)
                connections.append(conn)
                # Wait for initial stats
                await conn.recv()
            
            # Send check-in from first connection
            check_in_message = {
                "type": "check_in",
                "payload": {"memberId": str(self.member.id)}
            }
            await connections[0].send(json.dumps(check_in_message))
            
            # First connection should receive success
            await connections[0].recv()
            
            # All connections should receive broadcast
            for conn in connections:
                response = await conn.recv()
                data = json.loads(response)
                self.assertEqual(data['type'], 'member_checked_in')
                
        finally:
            # Clean up connections
            for conn in connections:
                await conn.close()

    def test_concurrent_connections(self):
        """Wrapper for async concurrent connections test"""
        asyncio.run(self.async_test_concurrent_connections())

    async def async_test_message_throughput(self):
        """Test message throughput under load"""
        uri = f"{self.ws_url}?token={self.token}"
        
        async with websockets.connect(uri) as websocket:
            # Wait for initial stats
            await websocket.recv()
            
            # Send multiple heartbeat messages rapidly
            start_time = asyncio.get_event_loop().time()
            message_count = 50
            
            for i in range(message_count):
                await websocket.send(json.dumps({"type": "heartbeat"}))
                # Receive response
                await websocket.recv()
            
            end_time = asyncio.get_event_loop().time()
            duration = end_time - start_time
            
            # Should handle at least 10 messages per second
            self.assertLess(duration, message_count / 10)

    def test_message_throughput(self):
        """Wrapper for async message throughput test"""
        asyncio.run(self.async_test_message_throughput())
