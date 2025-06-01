"""
ASGI config for gymapp project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gymapp.settings")
django.setup()  # Initialize Django ASGI application early to ensure apps are loaded

# Import the routing application after Django is set up
from .routing import application
