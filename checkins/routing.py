"""
WebSocket routing for checkins app.
Handles real-time check-in/check-out WebSocket connections.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/checkins/$', consumers.CheckInConsumer.as_asgi()),
    re_path(r'ws/checkins/(?P<room_name>\w+)/$', consumers.CheckInConsumer.as_asgi()),
]
