from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from checkins.consumers import JWTAuthMiddleware
from checkins.routing import websocket_urlpatterns

# This will handle HTTP requests
django_asgi_app = get_asgi_application()

# Use only checkins WebSocket URL patterns (remove duplicates)
application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddleware(
                URLRouter(websocket_urlpatterns)
            )
        ),
    }
)