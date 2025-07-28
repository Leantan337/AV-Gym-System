"""
ASGI config for gymapp project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
import django
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymapp.settings')
django.setup()  # Initialize Django ASGI application early to ensure apps are loaded

# Import after Django setup to avoid circular imports
from checkins.consumers import JWTAuthMiddleware
import checkins.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        AuthMiddlewareStack(
            URLRouter(
                checkins.routing.websocket_urlpatterns
            )
        )
    ),
})
