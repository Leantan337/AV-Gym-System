import os
import sys
from django.core.management.base import BaseCommand
from django.core.management import execute_from_command_line
from django.conf import settings


class Command(BaseCommand):
    help = 'Run the Django application with Daphne ASGI server'

    def add_arguments(self, parser):
        parser.add_argument(
            '--port', type=int, default=8000, help='Port to run the server on (default: 8000)'
        )
        parser.add_argument(
            '--bind',
            type=str,
            default='127.0.0.1',
            help='IP address to bind to (default: 127.0.0.1)',
        )
        parser.add_argument(
            '--reload', action='store_true', help='Enable auto-reload on code changes'
        )

    def handle(self, *args, **options):
        # Set Django settings module if not already set
        if not os.environ.get('DJANGO_SETTINGS_MODULE'):
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymapp.settings')

        # Configure Django settings
        import django

        django.setup()

        # Build Daphne command arguments
        daphne_args = [
            'daphne',
            '-b',
            options['bind'],
            '-p',
            str(options['port']),
        ]

        if options['reload']:
            daphne_args.append('--reload')

        daphne_args.append('gymapp.routing:application')

        # Execute Daphne
        self.stdout.write(
            self.style.SUCCESS(f'Starting Daphne server on {options["bind"]}:{options["port"]}')
        )

        # Use subprocess to run Daphne
        import subprocess

        try:
            subprocess.run(daphne_args, check=True)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('Server stopped by user'))
        except subprocess.CalledProcessError as e:
            self.stdout.write(self.style.ERROR(f'Daphne server failed: {e}'))
