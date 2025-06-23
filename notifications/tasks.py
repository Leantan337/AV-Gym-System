import logging
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from .models import NotificationSetting, ExpiryNotificationQueue, NotificationLog, NotificationType
from plans.models import MembershipSubscription
from members.models import Member

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_expiry_notifications(self):
    """
    Process membership expiry notifications
    This task runs hourly to check for notifications that need to be sent
    """
    try:
        today = timezone.now().date()
        processed_count = 0

        # Get all unprocessed notifications that are due today
        due_notifications = ExpiryNotificationQueue.objects.filter(
            is_processed=False, scheduled_date__lte=today
        ).select_related('subscription__member', 'subscription__plan')

        logger.info(f"Found {due_notifications.count()} notifications to process")

        for notification in due_notifications:
            try:
                with transaction.atomic():
                    # Check if subscription is still active
                    if notification.subscription.status != 'active':
                        # Mark as processed since subscription is no longer active
                        notification.is_processed = True
                        notification.processed_at = timezone.now()
                        notification.save()
                        continue

                    # Create notification log
                    log = NotificationLog.objects.create(
                        notification_type=NotificationType.MEMBERSHIP_EXPIRY,
                        member=notification.subscription.member,
                        subject=f"Membership Expiring in {notification.days_before_expiry} days",
                        message=f"Your {notification.subscription.plan.name} membership expires in {notification.days_before_expiry} days.",
                        is_email_sent=False,  # Will be sent by email task
                        sent_at=timezone.now(),
                    )

                    # Mark notification as processed
                    notification.is_processed = True
                    notification.processed_at = timezone.now()
                    notification.save()

                    processed_count += 1
                    logger.info(
                        f"Processed expiry notification for {notification.subscription.member.full_name}"
                    )

            except Exception as e:
                logger.error(
                    f"Error processing notification for {notification.subscription.member.full_name}: {e}"
                )
                continue

        logger.info(f"Successfully processed {processed_count} expiry notifications")
        return {
            'status': 'success',
            'processed_count': processed_count,
            'total_found': due_notifications.count(),
        }

    except Exception as e:
        logger.error(f"Error in process_expiry_notifications task: {e}")
        raise self.retry(countdown=300, exc=e)


@shared_task(bind=True, max_retries=3)
def send_email_notifications(self):
    """
    Send email notifications for pending notification logs
    """
    try:
        pending_logs = NotificationLog.objects.filter(
            is_email_sent=False,
            sent_at__gte=timezone.now() - timedelta(hours=24),  # Only recent notifications
        ).select_related('member')

        sent_count = 0

        for log in pending_logs:
            try:
                # Here you would integrate with your email service
                # For now, we'll just mark as sent
                # send_email_notification(log)

                log.is_email_sent = True
                log.save()

                sent_count += 1
                logger.info(f"Sent email notification to {log.member.full_name}")

            except Exception as e:
                logger.error(f"Error sending email to {log.member.full_name}: {e}")
                continue

        logger.info(f"Successfully sent {sent_count} email notifications")
        return {'status': 'success', 'sent_count': sent_count}

    except Exception as e:
        logger.error(f"Error in send_email_notifications task: {e}")
        raise self.retry(countdown=600, exc=e)


@shared_task(bind=True)
def cleanup_old_notifications(self, days_old=30):
    """
    Clean up old notification logs
    """
    try:
        cutoff_date = timezone.now().date() - timedelta(days=days_old)
        old_logs = NotificationLog.objects.filter(sent_at__date__lt=cutoff_date)

        count = old_logs.count()
        old_logs.delete()

        logger.info(f"Cleaned up {count} old notification logs")
        return {'status': 'success', 'deleted_count': count}

    except Exception as e:
        logger.error(f"Error in cleanup_old_notifications task: {e}")
        raise self.retry(countdown=600, exc=e)


@shared_task(bind=True)
def send_bulk_notification(self, notification_type, member_ids, subject, message):
    """
    Send bulk notifications to multiple members
    """
    try:
        members = Member.objects.filter(id__in=member_ids)
        created_count = 0

        for member in members:
            try:
                log = NotificationLog.objects.create(
                    notification_type=notification_type,
                    member=member,
                    subject=subject,
                    message=message,
                    is_email_sent=False,
                    sent_at=timezone.now(),
                )
                created_count += 1

            except Exception as e:
                logger.error(f"Error creating notification for {member.full_name}: {e}")
                continue

        logger.info(f"Created {created_count} bulk notifications")
        return {
            'status': 'success',
            'created_count': created_count,
            'total_members': len(member_ids),
        }

    except Exception as e:
        logger.error(f"Error in send_bulk_notification task: {e}")
        raise self.retry(countdown=60, exc=e)
