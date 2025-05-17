from django.db import models
import uuid
from django.utils.translation import gettext_lazy as _
from members.models import Member
from plans.models import MembershipSubscription


class NotificationType(models.TextChoices):
    MEMBERSHIP_EXPIRY = 'MEMBERSHIP_EXPIRY', _('Membership Expiry')
    PAYMENT_DUE = 'PAYMENT_DUE', _('Payment Due')
    GENERAL = 'GENERAL', _('General Notification')


class NotificationTemplate(models.Model):
    """Template for different types of notifications"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name=_('Template Name'))
    notification_type = models.CharField(
        max_length=50, 
        choices=NotificationType.choices,
        default=NotificationType.GENERAL,
        verbose_name=_('Notification Type')
    )
    subject = models.CharField(max_length=200, verbose_name=_('Email Subject'))
    body_text = models.TextField(verbose_name=_('Email Body (Text)'))
    body_html = models.TextField(verbose_name=_('Email Body (HTML)'), blank=True)
    is_active = models.BooleanField(default=True, verbose_name=_('Active'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Created At'))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_('Updated At'))
    
    def __str__(self):
        return f"{self.name} ({self.get_notification_type_display()})"


class NotificationSetting(models.Model):
    """Global settings for notifications"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification_type = models.CharField(
        max_length=50, 
        choices=NotificationType.choices,
        unique=True,
        verbose_name=_('Notification Type')
    )
    template = models.ForeignKey(
        NotificationTemplate, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='settings',
        verbose_name=_('Default Template')
    )
    is_email_enabled = models.BooleanField(default=True, verbose_name=_('Send Email'))
    is_dashboard_enabled = models.BooleanField(default=True, verbose_name=_('Show on Dashboard'))
    
    # Membership expiry specific settings
    days_before_expiry = models.JSONField(
        default=list,
        verbose_name=_('Days Before Expiry'),
        help_text=_('List of days before expiry to send notifications (e.g. [30, 15, 7, 3, 1])')
    )
    
    def __str__(self):
        return f"Settings for {self.get_notification_type_display()}"


class NotificationLog(models.Model):
    """Log of notifications sent to members"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification_type = models.CharField(
        max_length=50, 
        choices=NotificationType.choices,
        verbose_name=_('Notification Type')
    )
    member = models.ForeignKey(
        Member, 
        on_delete=models.CASCADE, 
        related_name='notification_logs',
        verbose_name=_('Member')
    )
    subscription = models.ForeignKey(
        MembershipSubscription, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='notification_logs',
        verbose_name=_('Related Subscription')
    )
    subject = models.CharField(max_length=200, verbose_name=_('Email Subject'))
    message = models.TextField(verbose_name=_('Message Sent'))
    is_email_sent = models.BooleanField(default=False, verbose_name=_('Email Sent'))
    sent_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Sent At'))
    
    def __str__(self):
        return f"{self.get_notification_type_display()} to {self.member} on {self.sent_at.strftime('%Y-%m-%d')}"


class ExpiryNotificationQueue(models.Model):
    """Queue for membership expiry notifications"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(
        MembershipSubscription, 
        on_delete=models.CASCADE, 
        related_name='expiry_notifications',
        verbose_name=_('Subscription')
    )
    days_before_expiry = models.IntegerField(verbose_name=_('Days Before Expiry'))
    scheduled_date = models.DateField(verbose_name=_('Scheduled Date'))
    is_processed = models.BooleanField(default=False, verbose_name=_('Processed'))
    processed_at = models.DateTimeField(null=True, blank=True, verbose_name=_('Processed At'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('Created At'))
    
    class Meta:
        unique_together = ('subscription', 'days_before_expiry')
        ordering = ['scheduled_date', 'days_before_expiry']
    
    def __str__(self):
        return f"Notification for {self.subscription} ({self.days_before_expiry} days before expiry)"
