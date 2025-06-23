from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from plans.models import MembershipSubscription
from .models import NotificationSetting, ExpiryNotificationQueue, NotificationType


@receiver(post_save, sender=MembershipSubscription)
def create_expiry_notifications(sender, instance, created, **kwargs):
    """Create or update expiry notification queue items when a subscription is created or updated"""
    if instance.status != 'active':
        # Remove any pending notifications for inactive subscriptions
        ExpiryNotificationQueue.objects.filter(subscription=instance, is_processed=False).delete()
        return

    # Get notification settings for membership expiry
    try:
        notification_settings = NotificationSetting.objects.get(
            notification_type=NotificationType.MEMBERSHIP_EXPIRY
        )
    except NotificationSetting.DoesNotExist:
        # Create default settings if they don't exist
        notification_settings = NotificationSetting.objects.create(
            notification_type=NotificationType.MEMBERSHIP_EXPIRY,
            days_before_expiry=[30, 15, 7, 3, 1],
        )

    # Get days before expiry from settings
    days_before_expiry = notification_settings.days_before_expiry

    # Clear existing unprocessed notifications for this subscription
    ExpiryNotificationQueue.objects.filter(subscription=instance, is_processed=False).delete()

    # Calculate notification dates and create queue items
    for days in days_before_expiry:
        notification_date = instance.end_date - timedelta(days=days)

        # Only create notifications for future dates
        if notification_date >= timezone.now().date():
            ExpiryNotificationQueue.objects.create(
                subscription=instance, days_before_expiry=days, scheduled_date=notification_date
            )
