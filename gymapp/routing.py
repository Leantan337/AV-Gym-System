from django.core.asgi import get_asgi_application
from django.urls import re_path
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from checkins.consumers import CheckInConsumer, JWTAuthMiddleware

# This will handle HTTP requests
django_asgi_app = get_asgi_application()

websocket_urlpatterns = [
    re_path(r'ws/checkins/$', CheckInConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})
