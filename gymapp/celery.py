import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gymapp.settings')

app = Celery('gymapp')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

# Configure Celery Beat schedule
app.conf.beat_schedule = {
    'generate-daily-invoices': {
        'task': 'invoices.tasks.generate_daily_invoices',
        'schedule': 86400.0,  # Run daily (24 hours)
    },
    'process-expiry-notifications': {
        'task': 'notifications.tasks.process_expiry_notifications',
        'schedule': 3600.0,  # Run hourly
    },
    'cleanup-old-reports': {
        'task': 'reports.tasks.cleanup_old_reports',
        'schedule': 604800.0,  # Run weekly
    },
}

# Configure Celery settings
app.conf.update(
    # Task serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    # Task routing
    task_routes={
        'invoices.tasks.*': {'queue': 'invoices'},
        'notifications.tasks.*': {'queue': 'notifications'},
        'reports.tasks.*': {'queue': 'reports'},
    },
    # Worker settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    # Result backend (optional, for task results)
    result_backend=None,  # Disable result backend for performance
    # Logging
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s] [%(task_name)s(%(task_id)s)] %(message)s',
)


@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
