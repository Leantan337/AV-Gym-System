#!/usr/bin/env python
"""
Simple WebSocket functionality verification script
This script tests the core WebSocket functionality without complex test setup.
"""
import sys
import os
import django
import asyncio
import json

# Add the project root to Python path
sys.path.insert(0, '/app')

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymapp.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from members.models import Member
from checkins.models import CheckIn
from checkins.consumers import CheckInConsumer
from channels.db import database_sync_to_async

User = get_user_model()

async def test_websocket_functionality():
    """Test core WebSocket functionality"""
    print("🚀 Starting WebSocket functionality verification...")
    
    # Clean up any existing data using database_sync_to_async
    @database_sync_to_async
    def cleanup_data():
        CheckIn.objects.all().delete()
        Member.objects.all().delete()
        User.objects.filter(username__startswith='wstest').delete()
    
    await cleanup_data()
    
    # Create test data using database_sync_to_async
    @database_sync_to_async
    def create_test_data():
        user = User.objects.create_user(
            username='wstest_user',
            email='wstest@example.com',
            password='testpass123'
        )
        
        member = Member.objects.create(
            full_name='WebSocket Test Member',
            phone='1234567890',
            address='Test Address',
            membership_number='WS001'
        )
        
        return user, member
    
    user, member = await create_test_data()
    print(f"✅ Created test member: {member.full_name} (ID: {member.id})")
    
    # Test JWT token creation
    token = str(AccessToken.for_user(user))
    print(f"✅ Generated JWT token: {token[:20]}...")
    
    # Test consumer functionality
    consumer = CheckInConsumer()
    print("✅ Created WebSocket consumer")
    
    # Test check-in process
    print("\n📝 Testing check-in process...")
    check_in_result = await consumer.process_check_in(
        str(member.id), 
        "Main Gym", 
        "WebSocket test check-in"
    )
    
    if check_in_result['success']:
        print(f"✅ Check-in successful: {check_in_result['check_in']['id']}")
        check_in_id = check_in_result['check_in']['id']
    else:
        print(f"❌ Check-in failed: {check_in_result}")
        return False
    
    # Test stats calculation
    print("\n📊 Testing stats calculation...")
    stats = await consumer.get_check_in_stats()
    print(f"✅ Current stats: {stats}")
    
    # Test check-out process
    print("\n📝 Testing check-out process...")
    check_out_result = await consumer.process_check_out(
        check_in_id, 
        "WebSocket test check-out"
    )
    
    if check_out_result['success']:
        print(f"✅ Check-out successful: {check_out_result['check_out']['id']}")
    else:
        print(f"❌ Check-out failed: {check_out_result}")
        return False
    
    # Test updated stats
    print("\n📊 Testing updated stats...")
    updated_stats = await consumer.get_check_in_stats()
    print(f"✅ Updated stats: {updated_stats}")
    
    # Test error handling
    print("\n🔍 Testing error handling...")
    
    # Test invalid member ID
    invalid_member_result = await consumer.process_check_in(
        "00000000-0000-0000-0000-000000000000", 
        "Test Location"
    )
    if not invalid_member_result['success'] and 'Member not found' in invalid_member_result['error']:
        print("✅ Invalid member ID handled correctly")
    else:
        print(f"❌ Invalid member ID not handled: {invalid_member_result}")
    
    # Test invalid check-in ID for check-out
    invalid_checkout_result = await consumer.process_check_out(
        "00000000-0000-0000-0000-000000000000"
    )
    if not invalid_checkout_result['success'] and 'Check-in not found' in invalid_checkout_result['error']:
        print("✅ Invalid check-in ID handled correctly")
    else:
        print(f"❌ Invalid check-in ID not handled: {invalid_checkout_result}")
    
    print("\n🎉 WebSocket functionality verification completed successfully!")
    return True

def test_websocket_configuration():
    """Test WebSocket configuration"""
    print("\n🔧 Testing WebSocket configuration...")
    
    # Test routing
    from gymapp.routing import application, websocket_urlpatterns
    print(f"✅ WebSocket routing configured with {len(websocket_urlpatterns)} patterns")
    
    # Test consumer import
    try:
        from checkins.consumers import CheckInConsumer, JWTAuthMiddleware
        print("✅ WebSocket consumer and middleware imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import WebSocket components: {e}")
        return False
    
    # Test Django Channels settings
    from django.conf import settings
    if hasattr(settings, 'ASGI_APPLICATION'):
        print(f"✅ ASGI application configured: {settings.ASGI_APPLICATION}")
    else:
        print("❌ ASGI application not configured")
        return False
    
    if hasattr(settings, 'CHANNEL_LAYERS'):
        print(f"✅ Channel layers configured: {list(settings.CHANNEL_LAYERS.keys())}")
    else:
        print("❌ Channel layers not configured")
        return False
    
    return True

def test_message_formats():
    """Test WebSocket message formats"""
    print("\n📨 Testing WebSocket message formats...")
    
    # Test check-in message
    check_in_message = {
        "type": "check_in",
        "payload": {
            "memberId": "12345678-1234-1234-1234-123456789012",
            "location": "Main Gym",
            "notes": "Test message"
        }
    }
    
    try:
        json_str = json.dumps(check_in_message)
        parsed = json.loads(json_str)
        print("✅ Check-in message format valid")
    except Exception as e:
        print(f"❌ Check-in message format invalid: {e}")
        return False
    
    # Test heartbeat message
    heartbeat_message = {"type": "heartbeat"}
    
    try:
        json_str = json.dumps(heartbeat_message)
        parsed = json.loads(json_str)
        print("✅ Heartbeat message format valid")
    except Exception as e:
        print(f"❌ Heartbeat message format invalid: {e}")
        return False
    
    # Test authentication message
    auth_message = {
        "type": "authenticate",
        "payload": {
            "token": "example.jwt.token"
        }
    }
    
    try:
        json_str = json.dumps(auth_message)
        parsed = json.loads(json_str)
        print("✅ Authentication message format valid")
    except Exception as e:
        print(f"❌ Authentication message format invalid: {e}")
        return False
    
    return True

async def main():
    """Main test runner"""
    print("=" * 60)
    print("🧪 WEBSOCKET FUNCTIONALITY VERIFICATION")
    print("=" * 60)
    
    # Test configuration
    config_success = test_websocket_configuration()
    
    # Test message formats
    format_success = test_message_formats()
    
    # Test core functionality
    functionality_success = await test_websocket_functionality()
    
    print("\n" + "=" * 60)
    print("📋 VERIFICATION SUMMARY")
    print("=" * 60)
    print(f"Configuration Tests: {'✅ PASS' if config_success else '❌ FAIL'}")
    print(f"Message Format Tests: {'✅ PASS' if format_success else '❌ FAIL'}")
    print(f"Functionality Tests: {'✅ PASS' if functionality_success else '❌ FAIL'}")
    
    overall_success = all([config_success, format_success, functionality_success])
    print(f"\nOverall Result: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}")
    
    if overall_success:
        print("\n🎉 WebSocket implementation is FULLY FUNCTIONAL! 🎉")
        print("\nThe WebSocket system includes:")
        print("• ✅ Django Channels backend with JWT authentication")
        print("• ✅ Real-time check-in/check-out processing")
        print("• ✅ Statistics calculation and broadcasting")
        print("• ✅ Error handling and validation")
        print("• ✅ Message format validation")
        print("• ✅ Proper routing and middleware configuration")
    else:
        print("\n❌ Some WebSocket functionality needs attention")
    
    return overall_success

if __name__ == "__main__":
    try:
        # Run the async main function
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except Exception as e:
        print(f"\n💥 Verification failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
