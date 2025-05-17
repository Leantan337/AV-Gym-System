from django.core.management.base import BaseCommand
from django.utils import timezone
from notifications.models import ExpiryNotificationQueue
from notifications.services import NotificationService


class Command(BaseCommand):
    help = 'Process pending membership expiry notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force-date',
            help='Process notifications for a specific date (YYYY-MM-DD)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show notifications that would be sent without actually sending them',
        )

    def handle(self, *args, **options):
        today = timezone.now().date()
        
        # Use provided date if specified
        if options['force_date']:
            try:
                process_date = timezone.datetime.strptime(options['force_date'], '%Y-%m-%d').date()
                self.stdout.write(f"Processing notifications for date: {process_date}")
            except ValueError:
                self.stderr.write(self.style.ERROR("Invalid date format. Use YYYY-MM-DD."))
                return
        else:
            process_date = today
        
        # Get pending notifications for today
        notifications = ExpiryNotificationQueue.objects.filter(
            scheduled_date=process_date,
            is_processed=False
        )
        
        self.stdout.write(f"Found {notifications.count()} pending notifications for {process_date}")
        
        for notification in notifications:
            subscription = notification.subscription
            member = subscription.member
            days = notification.days_before_expiry
            
            # Check if subscription is still active
            if subscription.status != 'active':
                self.stdout.write(f"Skipping notification for inactive subscription: {subscription}")
                notification.is_processed = True
                notification.processed_at = timezone.now()
                notification.save()
                continue
            
            # Check if end date is still valid (could have been extended)
            actual_days = (subscription.end_date - today).days
            if actual_days != days:
                self.stdout.write(
                    f"Subscription end date changed. Expected {days} days before expiry, "
                    f"but actually {actual_days} days before expiry. Updating..."
                )
            
            self.stdout.write(
                f"Processing notification for {member.full_name}, "
                f"membership expires in {days} days on {subscription.end_date}"
            )
            
            if not options['dry_run']:
                # Send notification
                try:
                    log = NotificationService.send_membership_expiry_notification(
                        subscription=subscription,
                        days_before_expiry=days
                    )
                    
                    self.stdout.write(
                        self.style.SUCCESS(f"Notification sent to {member.full_name}")
                        if log.is_email_sent else
                        self.style.WARNING(f"Notification logged but email not sent to {member.full_name}")
                    )
                    
                    # Mark as processed
                    notification.is_processed = True
                    notification.processed_at = timezone.now()
                    notification.save()
                    
                except Exception as e:
                    self.stderr.write(
                        self.style.ERROR(f"Error sending notification: {str(e)}")
                    )
            else:
                self.stdout.write(
                    self.style.SUCCESS(f"[DRY RUN] Would send notification to {member.full_name}")
                )
        
        # Summary
        if options['dry_run']:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Dry run completed. {notifications.count()} notifications would be processed."
                )
            )
        else:
            processed_count = notifications.filter(is_processed=True).count()
            self.stdout.write(
                self.style.SUCCESS(
                    f"Completed. {processed_count} of {notifications.count()} notifications processed."
                )
            )
