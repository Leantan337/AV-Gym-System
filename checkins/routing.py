"""
WebSocket routing for checkins app.
Handles real-time check-in/check-out WebSocket connections.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/checkins/$', consumers.CheckInConsumer.as_asgi()),
    # Remove room_name pattern if not needed, or implement proper room logic
    # re_path(r'ws/checkins/(?P<room_name>\w+)/$', consumers.CheckInConsumer.as_asgi()),
]