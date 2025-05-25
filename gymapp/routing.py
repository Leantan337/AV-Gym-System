from django.core.asgi import get_asgi_application
from django.urls import re_path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from checkins.consumers import CheckInConsumer

# This will handle HTTP requests
django_asgi_app = get_asgi_application()

websocket_urlpatterns = [
    re_path(r'ws/checkins/$', CheckInConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
