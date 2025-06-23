from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


class ReportType(models.TextChoices):
    MEMBERS = 'MEMBERS', _('Members List')
    CHECKINS = 'CHECKINS', _('Check-in History')
    REVENUE = 'REVENUE', _('Revenue Report')
    SUBSCRIPTIONS = 'SUBSCRIPTIONS', _('Subscriptions Report')
    EXPIRING_MEMBERSHIPS = 'EXPIRING_MEMBERSHIPS', _('Expiring Memberships')
    CUSTOM = 'CUSTOM', _('Custom Report')


class ExportFormat(models.TextChoices):
    PDF = 'PDF', _('PDF')
    EXCEL = 'EXCEL', _('Excel')
    CSV = 'CSV', _('CSV')


class ReportJob(models.Model):
    """Tracks report generation jobs"""

    report_type = models.CharField(
        max_length=50,
        choices=ReportType.choices,
        default=ReportType.MEMBERS,
        verbose_name=_('Report Type'),
    )
    export_format = models.CharField(
        max_length=10,
        choices=ExportFormat.choices,
        default=ExportFormat.PDF,
        verbose_name=_('Export Format'),
    )
    parameters = models.JSONField(default=dict, blank=True, verbose_name=_('Report Parameters'))
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='reports',
        verbose_name=_('Created By'),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Created At'))
    status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', _('Pending')),
            ('PROCESSING', _('Processing')),
            ('COMPLETED', _('Completed')),
            ('FAILED', _('Failed')),
        ],
        default='PENDING',
        verbose_name=_('Status'),
    )
    file_path = models.CharField(max_length=255, blank=True, null=True, verbose_name=_('File Path'))
    error_message = models.TextField(blank=True, null=True, verbose_name=_('Error Message'))
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Completed At'))

    def __str__(self):
        return f"{self.get_report_type_display()} ({self.get_export_format_display()}) - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    def mark_completed(self, file_path):
        self.status = 'COMPLETED'
        self.file_path = file_path
        self.completed_at = timezone.now()
        self.save()

    def mark_failed(self, error_message):
        self.status = 'FAILED'
        self.error_message = error_message
        self.completed_at = timezone.now()
        self.save()
