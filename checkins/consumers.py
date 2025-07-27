import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.db import models
from .models import CheckIn
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser

User = get_user_model()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Get the token from the query string
        query_string = scope.get('query_string', b'').decode()
        
        if not query_string:
            scope['user'] = AnonymousUser()
            await send({
                'type': 'websocket.close',
                'code': 4001
            })
            return

        query_params = dict(q.split('=', 1) for q in query_string.split('&') if '=' in q)
        token = query_params.get('token', None)

        if token:
            try:
                # Decode the JWT token
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                user = await self.get_user(user_id)
                
                if user and not isinstance(user, AnonymousUser):
                    scope['user'] = user
                    print(f"WebSocket: User authenticated via URL token: {user.username}")
                    return await super().__call__(scope, receive, send)
                else:
                    print("WebSocket: Invalid user from token")
                    scope['user'] = AnonymousUser()
                    
            except Exception as e:
                print(f"JWT Auth error (URL token): {e}")
                scope['user'] = AnonymousUser()
        else:
            print("WebSocket: No token provided")
            scope['user'] = AnonymousUser()

        # Close connection immediately for invalid authentication
        await send({
            'type': 'websocket.close',
            'code': 4001
        })
        return

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return AnonymousUser()


class CheckInConsumer(AsyncWebsocketConsumer):
    room_group_name = 'checkins'

    async def connect(self):
        print("WebSocket: connect called")
        
        # Check if user was authenticated by JWTAuthMiddleware
        user = self.scope.get('user')
        if isinstance(user, AnonymousUser) or not user:
            print("WebSocket: No authenticated user, closing connection")
            await self.close(code=4001)
            return
        
        # Accept the connection - user is authenticated
        await self.accept()
        print(f"WebSocket: User {user.username} connected and authenticated via URL token")
        
        # Add to group immediately since user is authenticated
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        print(f"WebSocket: User {user.username} added to group {self.room_group_name}")
        
        # Send initial stats after connection with proper error handling
        try:
            print("WebSocket: Fetching initial stats...")
            stats = await self.get_check_in_stats()
            print("WebSocket: Initial stats fetched.")
            await self.send(
                json.dumps({'type': 'initial_stats', 'payload': stats})
            )
            print("WebSocket: Initial stats sent.")
        except Exception as e:
            print(f"WebSocket: Error fetching or sending initial stats: {e}")
            # Send error message instead of silent failure
            try:
                await self.send(
                    json.dumps({
                        'type': 'error', 
                        'message': 'Failed to load initial statistics',
                        'retry': True
                    })
                )
            except Exception as send_error:
                print(f"WebSocket: Error sending error message: {send_error}")

    async def disconnect(self, close_code):
        print(f"WebSocket: disconnect called, code={close_code}")
        try:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        except Exception as e:
            print(f"WebSocket: Error during group disconnect: {e}")

    async def receive(self, text_data):
        print(f"WebSocket: received data: {text_data}")
        
        try:
            data = json.loads(text_data)
            event_type = data.get('type')
            print(f"WebSocket: Processing message type: {event_type}")

            # Handle heartbeat before authentication check
            if event_type == 'heartbeat':
                try:
                    await self.send(
                        json.dumps(
                            {'type': 'heartbeat_ack', 'timestamp': timezone.now().isoformat()}
                        )
                    )
                except Exception as e:
                    print(f"WebSocket: Error sending heartbeat response: {e}")
                return

            # Handle batch messages
            if event_type == 'batch':
                await self.handle_batch_messages(data.get('batches', {}))
                return

            # Remove authenticate message handling - authentication is URL-only
            if event_type == 'authenticate':
                print("WebSocket: Received authenticate message - not supported (use URL auth)")
                await self.send(
                    json.dumps({
                        'type': 'error', 
                        'message': 'Message-based authentication not supported. Use URL token.'
                    })
                )
                return

            # For all other messages, verify user is still authenticated
            if isinstance(self.scope["user"], AnonymousUser):
                try:
                    await self.send(
                        json.dumps({'type': 'error', 'message': 'Authentication required'})
                    )
                except Exception as send_error:
                    print(f"WebSocket: Error sending auth required: {send_error}")
                await self.close(code=4001)
                return

            # Handle check-in/check-out events
            if event_type == 'check_in':
                await self.handle_check_in(data.get('payload', {}))
            elif event_type == 'check_out':
                await self.handle_check_out(data.get('payload', {}))
            else:
                print(f"WebSocket: Unknown event type: {event_type}")
                
        except json.JSONDecodeError:
            print("WebSocket: Invalid JSON received")
            try:
                await self.send(json.dumps({'type': 'error', 'message': 'Invalid JSON format'}))
            except Exception as send_error:
                print(f"WebSocket: Error sending JSON error: {send_error}")
        except Exception as e:
            print(f"WebSocket: Error processing message: {e}")
            try:
                await self.send(json.dumps({'type': 'error', 'message': 'Internal server error'}))
            except Exception as send_error:
                print(f"WebSocket: Error sending server error: {send_error}")

    async def handle_batch_messages(self, batches):
        """Handle batched messages from frontend"""
        for event_type, messages in batches.items():
            for message_data in messages:
                if event_type == 'check_in':
                    await self.handle_check_in(message_data)
                elif event_type == 'check_out':
                    await self.handle_check_out(message_data)

    async def handle_check_in(self, payload):
        """Handle check-in request"""
        try:
            member_id = payload.get('memberId')
            location = payload.get('location', 'Unknown')
            notes = payload.get('notes', '')
            
            result = await self.process_check_in(member_id, location, notes)
            
            if result['success']:
                # Send success response to sender
                await self.send(json.dumps({
                    'type': 'check_in_success',
                    'payload': result['check_in']
                }))
                
                # Broadcast to all clients
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'member_checked_in',
                        'check_in': result['check_in']
                    }
                )
                
                # Send updated stats
                stats = await self.get_check_in_stats()
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'check_in_stats_update',
                        'stats': stats
                    }
                )
            else:
                await self.send(json.dumps({
                    'type': 'check_in_error',
                    'payload': {'error': result['error']}
                }))
                
        except Exception as e:
            print(f"WebSocket: Error in handle_check_in: {e}")
            await self.send(json.dumps({
                'type': 'check_in_error',
                'payload': {'error': 'Internal server error during check-in'}
            }))

    async def handle_check_out(self, payload):
        """Handle check-out request"""
        try:
            check_in_id = payload.get('checkInId')
            notes = payload.get('notes', '')
            
            result = await self.process_check_out(check_in_id, notes)
            
            if result['success']:
                # Send success response to sender
                await self.send(json.dumps({
                    'type': 'check_out_success',
                    'payload': result['check_out']
                }))
                
                # Broadcast to all clients
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'member_checked_out',
                        'check_out': result['check_out']
                    }
                )
                
                # Send updated stats
                stats = await self.get_check_in_stats()
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'check_in_stats_update',
                        'stats': stats
                    }
                )
            else:
                await self.send(json.dumps({
                    'type': 'check_out_error',
                    'payload': {'error': result['error']}
                }))
                
        except Exception as e:
            print(f"WebSocket: Error in handle_check_out: {e}")
            await self.send(json.dumps({
                'type': 'check_out_error',
                'payload': {'error': 'Internal server error during check-out'}
            }))

    @database_sync_to_async
    def process_check_in(self, member_id, location, notes):
        """Process check-in with optimized database queries"""
        try:
            from members.models import Member
            
            # Use select_related to avoid N+1 queries
            member = Member.objects.select_related('membership_plan').get(id=member_id)
            
            # Check if member is already checked in
            existing_checkin = CheckIn.objects.filter(
                member=member, 
                check_out_time__isnull=True
            ).first()
            
            if existing_checkin:
                return {
                    'success': False,
                    'error': f'{member.full_name} is already checked in'
                }
            
            # Create new check-in
            check_in = CheckIn.objects.create(
                member=member,
                location=location,
                notes=notes
            )
            
            return {
                'success': True,
                'check_in': {
                    'id': str(check_in.id),
                    'member': {
                        'id': str(member.id),
                        'full_name': member.full_name,
                        'email': member.email
                    },
                    'location': check_in.location,
                    'check_in_time': check_in.check_in_time.isoformat(),
                    'notes': check_in.notes
                }
            }
            
        except Exception as e:
            print(f"Error in process_check_in: {e}")
            return {
                'success': False,
                'error': str(e) if 'Member' in str(e) else 'Member not found'
            }

    @database_sync_to_async
    def process_check_out(self, check_in_id, notes):
        """Process check-out with optimized database queries"""
        try:
            # Use select_related to avoid N+1 queries
            check_in = CheckIn.objects.select_related('member').get(
                id=check_in_id,
                check_out_time__isnull=True
            )
            
            check_in.check_out_time = timezone.now()
            if notes:
                check_in.notes = f"{check_in.notes}\nCheck-out: {notes}" if check_in.notes else f"Check-out: {notes}"
            check_in.save()
            
            return {
                'success': True,
                'check_out': {
                    'id': str(check_in.id),
                    'member': {
                        'id': str(check_in.member.id),
                        'full_name': check_in.member.full_name,
                        'email': check_in.member.email
                    },
                    'location': check_in.location,
                    'check_in_time': check_in.check_in_time.isoformat(),
                    'check_out_time': check_in.check_out_time.isoformat(),
                    'notes': check_in.notes
                }
            }
            
        except CheckIn.DoesNotExist:
            return {
                'success': False,
                'error': 'Check-in not found or already checked out'
            }
        except Exception as e:
            print(f"Error in process_check_out: {e}")
            return {
                'success': False,
                'error': 'Internal server error'
            }

    @database_sync_to_async
    def get_check_in_stats(self):
        """Get check-in statistics with optimized queries"""
        try:
            today = timezone.now().date()
            
            # Use efficient aggregation queries
            currently_in = CheckIn.objects.filter(
                check_out_time__isnull=True
            ).count()
            
            today_total = CheckIn.objects.filter(
                check_in_time__date=today
            ).count()
            
            # Calculate average stay time for completed check-ins today
            today_completed = CheckIn.objects.filter(
                check_in_time__date=today,
                check_out_time__isnull=False
            ).extra(
                select={
                    'duration': 'EXTRACT(EPOCH FROM (check_out_time - check_in_time))/60'
                }
            ).values_list('duration', flat=True)
            
            avg_stay = int(sum(today_completed) / len(today_completed)) if today_completed else 0
            
            return {
                'currentlyIn': currently_in,
                'todayTotal': today_total,
                'averageStayMinutes': avg_stay,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error calculating stats: {e}")
            return {
                'currentlyIn': 0,
                'todayTotal': 0,
                'averageStayMinutes': 0,
                'timestamp': timezone.now().isoformat(),
                'error': 'Stats calculation failed'
            }

    # Group message handlers
    async def member_checked_in(self, event):
        await self.send(json.dumps({
            'type': 'member_checked_in',
            'payload': event['check_in']
        }))

    async def member_checked_out(self, event):
        await self.send(json.dumps({
            'type': 'member_checked_out',
            'payload': event['check_out']
        }))

    async def check_in_stats_update(self, event):
        await self.send(json.dumps({
            'type': 'check_in_stats',
            'payload': event['stats']
        }))