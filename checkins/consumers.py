import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import CheckIn
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from channels.middleware import BaseMiddleware
from channels.auth import AuthMiddlewareStack
from django.contrib.auth.models import AnonymousUser

User = get_user_model()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Get the token from the query string
        query_string = scope.get('query_string', b'').decode()
        query_params = dict(q.split('=') for q in query_string.split('&') if q)
        token = query_params.get('token', None)

        if token:
            try:
                # Decode the JWT token
                access_token = AccessToken(token)
                user_id = access_token['user_id']
                user = await self.get_user(user_id)
                scope['user'] = user
                print(f"WebSocket: User authenticated via URL token: {user.username}")
            except Exception as e:
                print(f"JWT Auth error (URL token): {e}")
                scope['user'] = AnonymousUser()
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

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
        # Accept the connection first to allow authentication message
        await self.accept()
        print("WebSocket: connection accepted")

    async def disconnect(self, close_code):
        print(f"WebSocket: disconnect called, code={close_code}")
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        print(f"WebSocket: received data: {text_data}")
        print(f"WebSocket: Processing message type: {json.loads(text_data).get('type')}")
        try:
            data = json.loads(text_data)
            event_type = data.get('type')
            
            # Handle heartbeat before authentication check
            if event_type == 'heartbeat':
                # Respond to heartbeat with a heartbeat_ack
                await self.send(json.dumps({
                    'type': 'heartbeat_ack',
                    'timestamp': timezone.now().isoformat()
                }))
                return
            
            if event_type == 'authenticate':
                # Handle authentication message
                token = data.get('payload', {}).get('token')
                if token:
                    try:
                        access_token = AccessToken(token)
                        user_id = access_token['user_id']
                        user = await self.get_user(user_id)
                        if not isinstance(user, AnonymousUser):
                            self.scope['user'] = user
                            print(f"WebSocket: User authenticated via message: {user.username}")
                            # Add to group after successful authentication
                            await self.channel_layer.group_add(
                                self.room_group_name,
                                self.channel_name
                            )
                            await self.send(json.dumps({
                                'type': 'authentication_success',
                                'message': 'Successfully authenticated'
                            }))
                            
                            # Send initial stats after authentication
                            print("WebSocket: Fetching initial stats...")
                            try:
                                stats = await self.get_check_in_stats()
                                print("WebSocket: Initial stats fetched.")
                                await self.send(json.dumps({
                                    'type': 'initial_stats',
                                    'payload': stats
                                }))
                                print("WebSocket: Initial stats sent.")
                            except Exception as e:
                                print(f"WebSocket: Error fetching or sending initial stats: {e}")
                                # Decide how to handle this error - closing the connection might be appropriate
                                # await self.close()
                            
                            return
                    except Exception as e:
                        print(f"Authentication error (message): {e}")
                        await self.send(json.dumps({
                            'type': 'authentication_error',
                            'message': 'Invalid token'
                        }))
                        await self.close()
                        return
                else:
                    await self.send(json.dumps({
                        'type': 'authentication_error',
                        'message': 'No token provided'
                    }))
                    await self.close()
                    return
            
            # For non-authentication messages, check if user is authenticated
            if isinstance(self.scope["user"], AnonymousUser):
                await self.send(json.dumps({
                    'type': 'error',
                    'message': 'Authentication required'
                }))
                await self.close()
                return

            if event_type == 'check_in':
                await self.handle_check_in(data)
        except json.JSONDecodeError:
            print("WebSocket: Invalid JSON received")
            await self.send(json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))

    @database_sync_to_async
    def get_user(self, user_id):
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return AnonymousUser()

    @database_sync_to_async
    def get_check_in_stats(self):
        from members.models import Member
        currently_in = CheckIn.objects.filter(check_out_time__isnull=True).count()
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_total = CheckIn.objects.filter(check_in_time__gte=today_start).count()
        # Calculate average stay - this is a simplified example
        # A more accurate calculation would involve completed check-ins
        completed_checkins_today = CheckIn.objects.filter(
            check_in_time__gte=today_start,
            check_out_time__isnull=False
        )
        total_stay_minutes = sum([
            (ci.check_out_time - ci.check_in_time).total_seconds() / 60
            for ci in completed_checkins_today
        ])
        average_stay_minutes = round(total_stay_minutes / completed_checkins_today.count()) if completed_checkins_today.count() > 0 else 0
        
        return {
            'currentlyIn': currently_in,
            'todayTotal': today_total,
            'averageStayMinutes': average_stay_minutes,
        }

    async def handle_check_in(self, data):
        check_in = await self.create_check_in(data)
        if check_in:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'check_in_update',
                    'data': {
                        'id': str(check_in.id),
                        'member': {
                            'id': str(check_in.member.id),
                            'full_name': check_in.member.full_name,
                        },
                        'check_in_time': check_in.check_in_time.isoformat(),
                        'check_out_time': check_in.check_out_time.isoformat() if check_in.check_out_time else None,
                        'status': 'checked_in' if not check_in.check_out_time else 'checked_out',
                    }
                }
            )

    @database_sync_to_async
    def create_check_in(self, data):
        from members.models import Member
        
        try:
            member = Member.objects.get(id=data['member_id'])
            check_in = CheckIn.objects.create(
                member=member,
                check_in_time=timezone.now()
            )
            return check_in
        except (Member.DoesNotExist, KeyError):
            return None
