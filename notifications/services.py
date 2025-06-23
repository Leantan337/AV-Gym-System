from django.core.mail import send_mail, EmailMultiAlternatives
from django.template import Template, Context
from django.utils import timezone
from django.conf import settings
from datetime import date
from .models import NotificationLog, NotificationType, NotificationTemplate


class NotificationService:
    """Service for sending notifications to members"""

    @staticmethod
    def get_template_context(member, subscription=None):
        """Get the context for rendering notification templates"""
        context = {
            'member_name': member.full_name,
            'member_id': member.id,
            'current_date': date.today().strftime('%Y-%m-%d'),
            'gym_name': 'AV Gym',
            'gym_address': '123 Gym Street, Workout City',
            'gym_phone': '(123) 456-7890',
            'gym_email': 'contact@avgym.com',
            'dashboard_url': f"{settings.SITE_URL if hasattr(settings, 'SITE_URL') else 'http://localhost:3000'}/dashboard",
        }

        if subscription:
            context.update(
                {
                    'plan_name': subscription.plan.name,
                    'subscription_start_date': subscription.start_date.strftime('%Y-%m-%d'),
                    'subscription_end_date': subscription.end_date.strftime('%Y-%m-%d'),
                    'days_remaining': (subscription.end_date - date.today()).days,
                    'subscription_id': subscription.id,
                }
            )

        return context

    @staticmethod
    def render_template(template_text, context):
        """Render a template with the given context"""
        template = Template(template_text)
        rendered = template.render(Context(context))
        return rendered

    @staticmethod
    def send_email_notification(
        member,
        subject,
        text_content,
        html_content=None,
        notification_type=NotificationType.GENERAL,
        subscription=None,
    ):
        """Send an email notification to a member"""
        # Check if member has an email address
        if not hasattr(member, 'email') or not member.email:
            # Create log without sending email
            log = NotificationLog.objects.create(
                notification_type=notification_type,
                member=member,
                subscription=subscription,
                subject=subject,
                message=text_content,
                is_email_sent=False,
            )
            return log

        # Create email
        from_email = settings.DEFAULT_FROM_EMAIL
        to_email = member.email

        success = False
        try:
            if html_content:
                # Send HTML email with text alternative
                email = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
                email.attach_alternative(html_content, "text/html")
                email.send(fail_silently=False)
                success = True
            else:
                # Send plain text email
                success = send_mail(
                    subject, text_content, from_email, [to_email], fail_silently=False
                )
        except Exception as e:
            print(f"Error sending email to {to_email}: {str(e)}")
            success = False

        # Create notification log
        log = NotificationLog.objects.create(
            notification_type=notification_type,
            member=member,
            subscription=subscription,
            subject=subject,
            message=text_content,
            is_email_sent=bool(success),
        )

        return log

    @classmethod
    def send_membership_expiry_notification(cls, subscription, days_before_expiry):
        """Send a membership expiry notification for a specific subscription"""
        member = subscription.member

        # Get template or use default
        try:
            template = NotificationTemplate.objects.get(
                notification_type=NotificationType.MEMBERSHIP_EXPIRY, is_active=True
            )
        except NotificationTemplate.DoesNotExist:
            # Use a default template
            subject = f"Your AV Gym membership expires in {days_before_expiry} days"
            text_content = f"""Dear {member.full_name},\n\n
                Your AV Gym membership plan '{subscription.plan.name}' will expire in {days_before_expiry} days on {subscription.end_date.strftime('%Y-%m-%d')}.\n\n
                Please visit our gym or login to your account to renew your membership and continue enjoying our facilities.\n\n
                Thank you for being a valued member of AV Gym.\n\n
                Best regards,\n
                The AV Gym Team
                """
            html_content = None
        else:
            # Render the template with context
            context = cls.get_template_context(member, subscription)
            context['days_before_expiry'] = days_before_expiry

            subject = cls.render_template(template.subject, context)
            text_content = cls.render_template(template.body_text, context)
            html_content = (
                cls.render_template(template.body_html, context) if template.body_html else None
            )

        # Send the notification
        return cls.send_email_notification(
            member=member,
            subject=subject,
            text_content=text_content,
            html_content=html_content,
            notification_type=NotificationType.MEMBERSHIP_EXPIRY,
            subscription=subscription,
        )
