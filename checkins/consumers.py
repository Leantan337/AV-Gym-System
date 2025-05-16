import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import CheckIn

class CheckInConsumer(AsyncWebsocketConsumer):
    room_group_name = 'checkins'

    async def connect(self):
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')
        
        if event_type == 'check_in':
            await self.handle_check_in(data)

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
