"""
ASGI config for gymapp project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
import django
from django.core.asgi import get_asgi_application

# Initialize Django settings and apps FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymapp.settings')
django.setup()  # Initialize Django ASGI application early to ensure apps are loaded

# NOW import other modules that depend on Django apps being loaded
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
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
