from django.core.asgi import get_asgi_application
from django.urls import re_path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from checkins.consumers import CheckInConsumer, JWTAuthMiddleware
from checkins.routing import websocket_urlpatterns as checkins_websocket_urlpatterns

# This will handle HTTP requests
django_asgi_app = get_asgi_application()

# Combine all WebSocket URL patterns
websocket_urlpatterns = [
    re_path(r'^ws/checkins/?$', CheckInConsumer.as_asgi()),
] + checkins_websocket_urlpatterns

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)
