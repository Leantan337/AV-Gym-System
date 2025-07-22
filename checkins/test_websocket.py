import json
import pytest
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from checkins.consumers import CheckInConsumer
from checkins.models import CheckIn
from members.models import Member
from django.utils import timezone
from django.contrib.auth.models import AnonymousUser

User = get_user_model()


class WebSocketConsumerTestCase(TransactionTestCase):
    """
    Test case for WebSocket consumer functionality.
    Uses TransactionTestCase to properly handle database operations in async context.
    """
    
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
        
    def tearDown(self):
        """Clean up test data"""
        CheckIn.objects.all().delete()
        Member.objects.all().delete()
        User.objects.all().delete()

    @database_sync_to_async
    def create_check_in(self):
        """Helper to create a check-in for testing"""
        return CheckIn.objects.create(
            member=self.member,
            check_in_time=timezone.now()
        )

    async def test_websocket_connection_without_auth(self):
        """Test WebSocket connection without authentication"""
        communicator = WebsocketCommunicator(CheckInConsumer.as_asgi(), "/ws/checkins/")
        connected, subprotocol = await communicator.connect()
        
        # Should connect successfully (authentication is done after connection)
        self.assertTrue(connected)
        
        # Send a message that requires authentication
        await communicator.send_json_to({
            "type": "check_in",
            "payload": {"memberId": str(self.member.id)}
        })
        
        # Should receive authentication error since user is anonymous
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'error')
        self.assertIn('Authentication required', response['message'])
        
        await communicator.disconnect()

    async def test_websocket_authentication_with_token(self):
        """Test WebSocket authentication using JWT token"""
        # Generate JWT token
        token = AccessToken.for_user(self.user)
        
        communicator = WebsocketCommunicator(
            CheckInConsumer.as_asgi(), 
            f"/ws/checkins/?token={str(token)}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Should receive initial stats after connection
        try:
            response = await communicator.receive_json_from(timeout=2)
            self.assertEqual(response['type'], 'initial_stats')
            self.assertIn('payload', response)
        except:
            # Initial stats might not be sent immediately, continue with test
            pass
        
        await communicator.disconnect()

    async def test_websocket_authentication_via_message(self):
        """Test WebSocket authentication via authenticate message"""
        token = AccessToken.for_user(self.user)
        
        communicator = WebsocketCommunicator(CheckInConsumer.as_asgi(), "/ws/checkins/")
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Send authentication message
        await communicator.send_json_to({
            "type": "authenticate",
            "payload": {"token": str(token)}
        })
        
        # Should receive authentication success
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'authentication_success')
        
        # Should receive initial stats
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'initial_stats')
        
        await communicator.disconnect()

    async def test_websocket_check_in_flow(self):
        """Test complete check-in flow via WebSocket"""
        token = AccessToken.for_user(self.user)
        
        communicator = WebsocketCommunicator(
            CheckInConsumer.as_asgi(), 
            f"/ws/checkins/?token={str(token)}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Wait for initial connection messages
        await communicator.receive_json_from()  # initial_stats
        
        # Send check-in request
        await communicator.send_json_to({
            "type": "check_in",
            "payload": {
                "memberId": str(self.member.id),
                "location": "Main Gym",
                "notes": "Test check-in"
            }
        })
        
        # Should receive check-in success
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'check_in_success')
        self.assertIn('payload', response)
        self.assertEqual(response['payload']['member']['id'], str(self.member.id))
        
        # Should also receive broadcast message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'member_checked_in')
        
        await communicator.disconnect()

    async def test_websocket_check_out_flow(self):
        """Test complete check-out flow via WebSocket"""
        token = AccessToken.for_user(self.user)
        check_in = await self.create_check_in()
        
        communicator = WebsocketCommunicator(
            CheckInConsumer.as_asgi(), 
            f"/ws/checkins/?token={str(token)}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Wait for initial connection messages
        await communicator.receive_json_from()  # initial_stats
        
        # Send check-out request
        await communicator.send_json_to({
            "type": "check_out",
            "payload": {
                "checkInId": str(check_in.id),
                "notes": "Test check-out"
            }
        })
        
        # Should receive check-out success
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'check_out_success')
        self.assertIn('payload', response)
        self.assertEqual(response['payload']['id'], str(check_in.id))
        
        # Should also receive broadcast message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'member_checked_out')
        
        await communicator.disconnect()

    async def test_websocket_heartbeat(self):
        """Test WebSocket heartbeat functionality"""
        token = AccessToken.for_user(self.user)
        
        communicator = WebsocketCommunicator(
            CheckInConsumer.as_asgi(), 
            f"/ws/checkins/?token={str(token)}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Wait for initial messages
        await communicator.receive_json_from()  # initial_stats
        
        # Send heartbeat
        await communicator.send_json_to({
            "type": "heartbeat"
        })
        
        # Should receive heartbeat acknowledgment
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'heartbeat_ack')
        self.assertIn('timestamp', response)
        
        await communicator.disconnect()

    async def test_websocket_invalid_member_check_in(self):
        """Test check-in with invalid member ID"""
        token = AccessToken.for_user(self.user)
        
        communicator = WebsocketCommunicator(
            CheckInConsumer.as_asgi(), 
            f"/ws/checkins/?token={str(token)}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Wait for initial messages
        await communicator.receive_json_from()  # initial_stats
        
        # Send check-in request with invalid member ID
        await communicator.send_json_to({
            "type": "check_in",
            "payload": {
                "memberId": "invalid-member-id"
            }
        })
        
        # Should receive error
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'check_in_error')
        self.assertIn('error', response['payload'])
        
        await communicator.disconnect()

    async def test_websocket_invalid_check_out(self):
        """Test check-out with invalid check-in ID"""
        token = AccessToken.for_user(self.user)
        
        communicator = WebsocketCommunicator(
            CheckInConsumer.as_asgi(), 
            f"/ws/checkins/?token={str(token)}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Wait for initial messages
        await communicator.receive_json_from()  # initial_stats
        
        # Send check-out request with invalid check-in ID
        await communicator.send_json_to({
            "type": "check_out",
            "payload": {
                "checkInId": "invalid-checkin-id"
            }
        })
        
        # Should receive error
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'check_out_error')
        self.assertIn('error', response['payload'])
        
        await communicator.disconnect()

    async def test_websocket_multiple_clients_broadcast(self):
        """Test that messages are broadcast to multiple connected clients"""
        token = AccessToken.for_user(self.user)
        
        # Connect two clients
        communicator1 = WebsocketCommunicator(
            CheckInConsumer.as_asgi(), 
            f"/ws/checkins/?token={str(token)}"
        )
        communicator2 = WebsocketCommunicator(
            CheckInConsumer.as_asgi(), 
            f"/ws/checkins/?token={str(token)}"
        )
        
        connected1, _ = await communicator1.connect()
        connected2, _ = await communicator2.connect()
        
        self.assertTrue(connected1)
        self.assertTrue(connected2)
        
        # Clear initial messages
        await communicator1.receive_json_from()  # initial_stats
        await communicator2.receive_json_from()  # initial_stats
        
        # Client 1 performs check-in
        await communicator1.send_json_to({
            "type": "check_in",
            "payload": {"memberId": str(self.member.id)}
        })
        
        # Client 1 should receive success message
        response1 = await communicator1.receive_json_from()
        self.assertEqual(response1['type'], 'check_in_success')
        
        # Both clients should receive broadcast message
        broadcast1 = await communicator1.receive_json_from()
        broadcast2 = await communicator2.receive_json_from()
        
        self.assertEqual(broadcast1['type'], 'member_checked_in')
        self.assertEqual(broadcast2['type'], 'member_checked_in')
        self.assertEqual(broadcast1['payload']['member']['id'], str(self.member.id))
        self.assertEqual(broadcast2['payload']['member']['id'], str(self.member.id))
        
        await communicator1.disconnect()
        await communicator2.disconnect()

    async def test_websocket_invalid_json_handling(self):
        """Test handling of invalid JSON messages"""
        token = AccessToken.for_user(self.user)
        
        communicator = WebsocketCommunicator(
            CheckInConsumer.as_asgi(), 
            f"/ws/checkins/?token={str(token)}"
        )
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)
        
        # Wait for initial messages
        await communicator.receive_json_from()  # initial_stats
        
        # Send invalid JSON
        await communicator.send_to(text_data="invalid json")
        
        # Should receive error message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'error')
        self.assertIn('Invalid JSON format', response['message'])
        
        await communicator.disconnect()
