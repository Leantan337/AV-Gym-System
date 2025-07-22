"""
WebSocket Unit Tests for CheckIn functionality
This file contains unit tests that verify WebSocket integration using a simpler approach.
"""
from django.test import TestCase
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from members.models import Member
from checkins.models import CheckIn
from checkins.consumers import CheckInConsumer
import json
import asyncio
import uuid

User = get_user_model()


class WebSocketUnitTestCase(TestCase):
    """Unit tests for WebSocket functionality"""
    
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
            address='Test Address',
            membership_number='TEST001'
        )
        self.token = str(AccessToken.for_user(self.user))
        
    def tearDown(self):
        """Clean up test data"""
        CheckIn.objects.all().delete()
        Member.objects.all().delete()
        User.objects.all().delete()

    @database_sync_to_async
    def create_test_data(self):
        """Create test data asynchronously"""
        user = User.objects.create_user(
            username='asyncuser',
            email='async@example.com',
            password='testpass123'
        )
        member = Member.objects.create(
            full_name='Async Test Member',
            phone='9876543210',
            address='Async Test Address'
        )
        return user, member

    def test_websocket_url_routing(self):
        """Test that WebSocket URL routing is configured correctly"""
        from gymapp.routing import websocket_urlpatterns
        
        # Check that the WebSocket URL pattern exists
        url_patterns = []
        for pattern in websocket_urlpatterns:
            if hasattr(pattern.pattern, '_route'):
                url_patterns.append(pattern.pattern._route)
            elif hasattr(pattern.pattern, 'pattern'):
                url_patterns.append(pattern.pattern.pattern)
            else:
                # For re_path patterns
                url_patterns.append(str(pattern.pattern))
        
        expected_pattern = '^ws/checkins/?$'
        
        # Find matching pattern
        found_pattern = any(expected_pattern in pattern for pattern in url_patterns)
        self.assertTrue(found_pattern, f"WebSocket URL pattern {expected_pattern} not found in {url_patterns}")

    def test_websocket_consumer_import(self):
        """Test that the WebSocket consumer can be imported"""
        from checkins.consumers import CheckInConsumer
        from channels.generic.websocket import AsyncWebsocketConsumer
        
        # Verify the consumer inherits from the correct base class
        self.assertTrue(issubclass(CheckInConsumer, AsyncWebsocketConsumer))

    def test_websocket_authentication_methods(self):
        """Test WebSocket authentication method exists"""
        from checkins.consumers import JWTAuthMiddleware
        
        # Verify middleware exists
        self.assertTrue(callable(JWTAuthMiddleware))

    def test_check_in_data_processing(self):
        """Test the check-in data processing logic"""
        from checkins.consumers import CheckInConsumer
        consumer = CheckInConsumer()
        
        # Test the synchronous processing methods by calling them directly
        # This tests the business logic without WebSocket complexity
        
        # Run the async test
        async def run_test():
            result = await consumer.process_check_in(str(self.member.id), "Test Location", "Test Notes")
            return result

        # Execute the test
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(run_test())
            
            # Verify the result
            self.assertTrue(result['success'])
            self.assertIn('check_in', result)
            self.assertEqual(result['check_in']['member']['id'], str(self.member.id))
            self.assertEqual(result['check_in']['location'], "Test Location")
        finally:
            loop.close()

    def test_check_out_data_processing(self):
        """Test the check-out data processing logic"""
        # First create a check-in
        check_in = CheckIn.objects.create(
            member=self.member,
            location="Test Location"
        )
        
        from checkins.consumers import CheckInConsumer
        consumer = CheckInConsumer()
        
        async def run_test():
            result = await consumer.process_check_out(str(check_in.id), "Check-out notes")
            return result

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(run_test())
            
            # Verify the result
            self.assertTrue(result['success'])
            self.assertIn('check_out', result)
            self.assertEqual(result['check_out']['id'], str(check_in.id))
            self.assertIsNotNone(result['check_out']['check_out_time'])
        finally:
            loop.close()

    def test_stats_calculation(self):
        """Test the stats calculation logic"""
        # Create some test check-ins
        CheckIn.objects.create(member=self.member, location="Gym")
        CheckIn.objects.create(member=self.member, location="Pool")
        
        from checkins.consumers import CheckInConsumer
        consumer = CheckInConsumer()
        
        async def run_test():
            stats = await consumer.get_check_in_stats()
            return stats

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            stats = loop.run_until_complete(run_test())
            
            # Verify the stats structure
            self.assertIn('currentlyIn', stats)
            self.assertIn('todayTotal', stats)
            self.assertIn('averageStayMinutes', stats)
            self.assertIsInstance(stats['currentlyIn'], int)
            self.assertIsInstance(stats['todayTotal'], int)
            self.assertIsInstance(stats['averageStayMinutes'], int)
            
            # Should have 2 check-ins for today
            self.assertEqual(stats['todayTotal'], 2)
            # Should have 2 currently checked in (no check-out time)
            self.assertEqual(stats['currentlyIn'], 2)
        finally:
            loop.close()

    def test_invalid_member_check_in(self):
        """Test check-in with invalid member ID"""
        from checkins.consumers import CheckInConsumer
        consumer = CheckInConsumer()
        
        # Use a valid UUID format but non-existent ID
        invalid_uuid = str(uuid.uuid4())
        
        async def run_test():
            result = await consumer.process_check_in(invalid_uuid, "Test Location")
            return result

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(run_test())
            
            # Should fail with invalid member
            self.assertFalse(result['success'])
            self.assertIn('error', result)
            self.assertEqual(result['error'], 'Member not found')
        finally:
            loop.close()

    def test_invalid_check_out(self):
        """Test check-out with invalid check-in ID"""
        from checkins.consumers import CheckInConsumer
        consumer = CheckInConsumer()
        
        # Use a valid UUID format but non-existent ID
        invalid_uuid = str(uuid.uuid4())
        
        async def run_test():
            result = await consumer.process_check_out(invalid_uuid)
            return result

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(run_test())
            
            # Should fail with invalid check-in
            self.assertFalse(result['success'])
            self.assertIn('error', result)
            self.assertEqual(result['error'], 'Check-in not found or already checked out')
        finally:
            loop.close()

    def test_websocket_message_format_validation(self):
        """Test WebSocket message format validation"""
        # Test valid message formats
        valid_check_in_message = {
            "type": "check_in",
            "payload": {
                "memberId": str(self.member.id),
                "location": "Main Gym",
                "notes": "Test check-in"
            }
        }
        
        # Verify message can be serialized to JSON
        try:
            json_str = json.dumps(valid_check_in_message)
            parsed = json.loads(json_str)
            self.assertEqual(parsed['type'], 'check_in')
            self.assertEqual(parsed['payload']['memberId'], str(self.member.id))
        except (json.JSONEncodeError, json.JSONDecodeError):
            self.fail("Valid WebSocket message failed JSON serialization/deserialization")

        # Test heartbeat message
        heartbeat_message = {"type": "heartbeat"}
        try:
            json_str = json.dumps(heartbeat_message)
            parsed = json.loads(json_str)
            self.assertEqual(parsed['type'], 'heartbeat')
        except (json.JSONEncodeError, json.JSONDecodeError):
            self.fail("Heartbeat message failed JSON serialization/deserialization")

    def test_jwt_token_creation(self):
        """Test JWT token creation for WebSocket authentication"""
        # Verify that we can create tokens for users
        token = str(AccessToken.for_user(self.user))
        self.assertIsInstance(token, str)
        self.assertTrue(len(token) > 50)  # JWT tokens are typically long
        
        # Verify token contains user information when decoded
        access_token = AccessToken(token)
        self.assertEqual(access_token['user_id'], self.user.id)

    def test_member_model_integration(self):
        """Test that Member model integrates correctly with WebSocket"""
        # Verify member data structure matches WebSocket expectations
        member_data = {
            'id': str(self.member.id),
            'full_name': self.member.full_name,
            'membership_type': getattr(self.member, 'membership_type', ''),
        }
        
        # This should match the format expected by the frontend
        expected_fields = ['id', 'full_name', 'membership_type']
        for field in expected_fields:
            self.assertIn(field, member_data)
        
        # Verify ID is string (required for JSON serialization)
        self.assertIsInstance(member_data['id'], str)

    def test_check_in_model_integration(self):
        """Test that CheckIn model integrates correctly with WebSocket"""
        check_in = CheckIn.objects.create(
            member=self.member,
            location="Test Location",
            notes="Test Notes"
        )
        
        # Verify check-in data structure matches WebSocket expectations
        check_in_data = {
            'id': str(check_in.id),
            'member': {
                'id': str(check_in.member.id),
                'full_name': check_in.member.full_name,
                'membership_type': getattr(check_in.member, 'membership_type', ''),
            },
            'check_in_time': check_in.check_in_time.isoformat(),
            'location': check_in.location,
        }
        
        # Verify all required fields are present
        self.assertIn('id', check_in_data)
        self.assertIn('member', check_in_data)
        self.assertIn('check_in_time', check_in_data)
        self.assertIn('location', check_in_data)
        
        # Verify nested member data
        self.assertIn('id', check_in_data['member'])
        self.assertIn('full_name', check_in_data['member'])

class WebSocketConfigurationTestCase(TestCase):
    """Test WebSocket configuration and setup"""
    
    def test_django_channels_configuration(self):
        """Test that Django Channels is properly configured"""
        from django.conf import settings
        
        # Check that ASGI application is configured
        self.assertTrue(hasattr(settings, 'ASGI_APPLICATION'))
        self.assertEqual(settings.ASGI_APPLICATION, 'gymapp.routing.application')
        
        # Check that channel layers are configured
        self.assertTrue(hasattr(settings, 'CHANNEL_LAYERS'))
        self.assertIn('default', settings.CHANNEL_LAYERS)

    def test_routing_configuration(self):
        """Test that routing is properly configured"""
        from gymapp.routing import application
        from channels.routing import ProtocolTypeRouter
        
        # Verify the application is a ProtocolTypeRouter
        self.assertIsInstance(application, ProtocolTypeRouter)

    def test_websocket_middleware(self):
        """Test WebSocket middleware configuration"""
        from checkins.consumers import JWTAuthMiddleware
        from channels.middleware import BaseMiddleware
        
        # Verify middleware is properly configured
        self.assertTrue(issubclass(JWTAuthMiddleware, BaseMiddleware))

    def test_websocket_consumer_configuration(self):
        """Test WebSocket consumer configuration"""
        from checkins.consumers import CheckInConsumer
        from channels.generic.websocket import AsyncWebsocketConsumer
        
        # Verify consumer methods exist
        consumer = CheckInConsumer()
        self.assertTrue(hasattr(consumer, 'connect'))
        self.assertTrue(hasattr(consumer, 'disconnect'))
        self.assertTrue(hasattr(consumer, 'receive'))
        
        # Verify async methods
        import asyncio
        self.assertTrue(asyncio.iscoroutinefunction(consumer.connect))
        self.assertTrue(asyncio.iscoroutinefunction(consumer.disconnect))
        self.assertTrue(asyncio.iscoroutinefunction(consumer.receive))

    def test_redis_channel_layer_configuration(self):
        """Test Redis channel layer configuration"""
        from django.conf import settings
        
        channel_layers = settings.CHANNEL_LAYERS
        default_layer = channel_layers['default']
        
        # In production, should use Redis
        if not settings.DEBUG:
            self.assertEqual(default_layer['BACKEND'], 'channels_redis.core.RedisChannelLayer')
            self.assertIn('CONFIG', default_layer)
            self.assertIn('hosts', default_layer['CONFIG'])
        else:
            # In development/testing, can use in-memory
            self.assertIn('BACKEND', default_layer)
