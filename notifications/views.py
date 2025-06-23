from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta

from .models import (
    NotificationTemplate,
    NotificationSetting,
    NotificationLog,
    ExpiryNotificationQueue,
    NotificationType,
)
from .serializers import (
    NotificationTemplateSerializer,
    NotificationSettingSerializer,
    NotificationLogSerializer,
    ExpiryNotificationQueueSerializer,
)
from .services import NotificationService


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    """API endpoint for notification templates"""

    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def bulk_send(self, request):
        """Send notifications to multiple members at once"""
        template_id = request.data.get('template_id')
        member_ids = request.data.get('member_ids', [])
        send_email = request.data.get('send_email', True)
        show_on_dashboard = request.data.get('show_on_dashboard', True)
        custom_subject = request.data.get('custom_subject')
        custom_message = request.data.get('custom_message')

        if not template_id:
            return Response(
                {'error': 'Template ID is required'}, status=status.HTTP_400_BAD_REQUEST
            )

        if not member_ids or not isinstance(member_ids, list):
            return Response(
                {'error': 'At least one member ID is required'}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            template = NotificationTemplate.objects.get(id=template_id)

            # Get the members
            from members.models import Member

            members = Member.objects.filter(id__in=member_ids)

            if not members.exists():
                return Response(
                    {'error': 'No valid members found'}, status=status.HTTP_400_BAD_REQUEST
                )

            # Process each member
            notification_service = NotificationService()
            results = {'success': [], 'failed': []}

            for member in members:
                try:
                    # Prepare member data
                    member_data = {
                        'member_name': f'{member.first_name} {member.last_name}',
                        'member_id': str(member.id),
                        'current_date': timezone.now().strftime('%Y-%m-%d'),
                        'gym_name': 'AV Gym',
                        'gym_address': '123 Fitness St, Gymville',
                        'gym_phone': '555-123-4567',
                        'gym_email': 'info@avgym.com',
                        'dashboard_url': 'https://avgym.com/dashboard',
                    }

                    # Get active membership if any
                    from plans.models import MembershipSubscription

                    subscription = MembershipSubscription.objects.filter(
                        member=member, is_active=True
                    ).first()

                    if subscription:
                        member_data.update(
                            {
                                'plan_name': subscription.plan.name,
                                'subscription_start_date': subscription.start_date.strftime(
                                    '%Y-%m-%d'
                                ),
                                'subscription_end_date': (
                                    subscription.end_date.strftime('%Y-%m-%d')
                                    if subscription.end_date
                                    else 'N/A'
                                ),
                                'subscription_id': str(subscription.id),
                            }
                        )

                        # Calculate days remaining if end_date exists
                        if subscription.end_date:
                            days_remaining = (subscription.end_date - timezone.now().date()).days
                            member_data['days_remaining'] = str(max(0, days_remaining))
                            member_data['days_before_expiry'] = str(max(0, days_remaining))

                    # Use custom subject/message if provided
                    subject = custom_subject or template.subject
                    body_text = custom_message or template.body_text
                    body_html = template.body_html if not custom_message else None

                    # Render the templates with member data
                    rendered_subject = notification_service.render_template(subject, member_data)
                    rendered_body_text = notification_service.render_template(
                        body_text, member_data
                    )
                    rendered_body_html = (
                        notification_service.render_template(body_html, member_data)
                        if body_html
                        else None
                    )

                    # Create notification log entry
                    notification_log = NotificationLog.objects.create(
                        notification_type=template.notification_type,
                        member=member,
                        subscription=subscription,
                        subject=rendered_subject,
                        message=rendered_body_text,
                        is_email_sent=False,
                    )

                    # Send email if requested
                    if send_email and member.email:
                        from django.core.mail import EmailMultiAlternatives
                        from django.conf import settings

                        email = EmailMultiAlternatives(
                            subject=rendered_subject,
                            body=rendered_body_text,
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            to=[member.email],
                        )

                        if rendered_body_html:
                            email.attach_alternative(rendered_body_html, "text/html")

                        email.send()
                        notification_log.is_email_sent = True
                        notification_log.save()

                    results['success'].append(
                        {
                            'member_id': str(member.id),
                            'email': member.email,
                            'name': f'{member.first_name} {member.last_name}',
                        }
                    )

                except Exception as e:
                    results['failed'].append(
                        {
                            'member_id': str(member.id),
                            'email': member.email if hasattr(member, 'email') else 'Unknown',
                            'name': (
                                f'{member.first_name} {member.last_name}'
                                if hasattr(member, 'first_name')
                                else 'Unknown'
                            ),
                            'error': str(e),
                        }
                    )

            # Return the results
            return Response(
                {
                    'status': 'success',
                    'total_members': len(member_ids),
                    'successful': len(results['success']),
                    'failed': len(results['failed']),
                    'results': results,
                }
            )

        except NotificationTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Preview a notification template with sample data"""
        template = self.get_object()

        # Get sample data from request or use defaults
        sample_data = request.data.get('sample_data', {})

        # Set default sample data if not provided
        default_data = {
            'member_name': sample_data.get('member_name', 'John Doe'),
            'member_id': sample_data.get('member_id', 'MEM12345'),
            'current_date': timezone.now().strftime('%Y-%m-%d'),
            'gym_name': 'AV Gym',
            'gym_address': '123 Fitness St, Gymville',
            'gym_phone': '555-123-4567',
            'gym_email': 'info@avgym.com',
            'dashboard_url': 'https://avgym.com/dashboard',
            'plan_name': sample_data.get('plan_name', 'Premium Membership'),
            'subscription_start_date': sample_data.get(
                'subscription_start_date',
                (timezone.now() - timedelta(days=60)).strftime('%Y-%m-%d'),
            ),
            'subscription_end_date': sample_data.get(
                'subscription_end_date', (timezone.now() + timedelta(days=15)).strftime('%Y-%m-%d')
            ),
            'days_remaining': sample_data.get('days_remaining', '15'),
            'subscription_id': sample_data.get('subscription_id', 'SUB98765'),
            'days_before_expiry': sample_data.get('days_before_expiry', '15'),
        }

        # Render the template with the sample data
        try:
            subject = NotificationService.render_template(template.subject, default_data)
            body_text = NotificationService.render_template(template.body_text, default_data)

            body_html = None
            if template.body_html:
                body_html = NotificationService.render_template(template.body_html, default_data)

            return Response(
                {
                    'subject': subject,
                    'body_text': body_text,
                    'body_html': body_html,
                    'sample_data': default_data,
                }
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class NotificationSettingViewSet(viewsets.ModelViewSet):
    """API endpoint for notification settings"""

    queryset = NotificationSetting.objects.all()
    serializer_class = NotificationSettingSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def get_expiry_settings(self, request):
        """Get membership expiry notification settings"""
        try:
            settings = NotificationSetting.objects.get(
                notification_type=NotificationType.MEMBERSHIP_EXPIRY
            )
            serializer = self.get_serializer(settings)
            return Response(serializer.data)
        except NotificationSetting.DoesNotExist:
            # Return default settings
            return Response(
                {
                    'notification_type': NotificationType.MEMBERSHIP_EXPIRY,
                    'is_email_enabled': True,
                    'is_dashboard_enabled': True,
                    'days_before_expiry': [30, 15, 7, 3, 1],
                }
            )


class NotificationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for notification logs (readonly)"""

    queryset = NotificationLog.objects.all()
    serializer_class = NotificationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by member
        member_id = self.request.query_params.get('member', None)
        if member_id:
            queryset = queryset.filter(member_id=member_id)

        # Filter by time range
        time_range = self.request.query_params.get('time_range', None)
        if time_range:
            now = timezone.now()
            if time_range == 'week':
                start_date = now - timedelta(days=7)
            elif time_range == 'month':
                start_date = now - timedelta(days=30)
            elif time_range == 'quarter':
                start_date = now - timedelta(days=90)
            else:
                start_date = now - timedelta(days=7)  # Default to week

            queryset = queryset.filter(sent_at__gte=start_date)

        return queryset

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """Get notification metrics"""
        # Get time-filtered queryset
        queryset = self.get_queryset()

        # Calculate metrics
        total_notifications = queryset.count()
        email_sent_count = queryset.filter(is_email_sent=True).count()
        dashboard_count = total_notifications  # Assuming all are shown on dashboard

        # Count by notification type
        from django.db.models import Count

        type_counts = queryset.values('notification_type').annotate(count=Count('id'))
        notification_types = {item['notification_type']: item['count'] for item in type_counts}

        # Count unique members
        member_count = queryset.values('member').distinct().count()

        # Generate metrics by type
        type_metrics = []
        for notification_type, count in notification_types.items():
            type_queryset = queryset.filter(notification_type=notification_type)
            email_count = type_queryset.filter(is_email_sent=True).count()

            type_metrics.append(
                {
                    'notification_type': notification_type,
                    'count': count,
                    'email_sent_count': email_count,
                    'dashboard_count': count,
                }
            )

        # Generate daily metrics
        from django.db.models.functions import TruncDate

        daily_counts = (
            queryset.annotate(date=TruncDate('sent_at'))
            .values('date')
            .annotate(
                count=Count('id'), email_count=Count('id', filter=models.Q(is_email_sent=True))
            )
            .order_by('date')
        )

        daily_metrics = [
            {
                'date': item['date'].isoformat(),
                'count': item['count'],
                'email_count': item['email_count'],
                'dashboard_count': item['count'],
            }
            for item in daily_counts
        ]

        # Calculate percentages
        delivery_percentage = (
            (email_sent_count / total_notifications * 100) if total_notifications > 0 else 0
        )

        # In a real system, you would track opens. For this demo, we'll calculate a mock open rate
        open_rate_percentage = 75.0  # Mock value

        summary = {
            'total_notifications': total_notifications,
            'email_sent_count': email_sent_count,
            'dashboard_count': dashboard_count,
            'total_members_notified': member_count,
            'notification_types': notification_types,
            'delivery_percentage': round(delivery_percentage, 1),
            'open_rate_percentage': open_rate_percentage,
        }

        return Response(
            {'summary': summary, 'type_metrics': type_metrics, 'daily_metrics': daily_metrics}
        )

        # Filter by notification type
        notification_type = self.request.query_params.get('type', None)
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)

        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)

        if start_date:
            queryset = queryset.filter(sent_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(sent_at__lte=end_date)

        return queryset.order_by('-sent_at')


class ExpiryNotificationQueueViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for expiry notification queue (readonly)"""

    queryset = ExpiryNotificationQueue.objects.all()
    serializer_class = ExpiryNotificationQueueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by subscription
        subscription_id = self.request.query_params.get('subscription', None)
        if subscription_id:
            queryset = queryset.filter(subscription_id=subscription_id)

        # Filter by processed status
        is_processed = self.request.query_params.get('processed', None)
        if is_processed is not None:
            queryset = queryset.filter(is_processed=(is_processed.lower() == 'true'))

        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)

        if start_date:
            queryset = queryset.filter(scheduled_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(scheduled_date__lte=end_date)

        return queryset.order_by('scheduled_date', 'days_before_expiry')


class DashboardNotificationsViewSet(viewsets.ViewSet):
    """API endpoint for dashboard notifications"""

    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def expiring_memberships(self, request):
        """Get a list of memberships that are expiring soon"""
        from plans.models import MembershipSubscription

        # Get notification settings for MEMBERSHIP_EXPIRY
        try:
            settings = NotificationSetting.objects.get(
                notification_type=NotificationType.MEMBERSHIP_EXPIRY
            )
            days_before_expiry = settings.days_before_expiry
        except NotificationSetting.DoesNotExist:
            days_before_expiry = [30, 15, 7, 3, 1]

        # Get today's date
        today = timezone.now().date()

        # Find subscriptions expiring within the configured time periods
        max_days = max(days_before_expiry) if days_before_expiry else 30

        expiring_subscriptions = (
            MembershipSubscription.objects.filter(
                status='active', end_date__gte=today, end_date__lte=today + timedelta(days=max_days)
            )
            .select_related('member', 'plan')
            .order_by('end_date')
        )

        # Group subscriptions by time period
        result = {'upcoming_expirations': [], 'total_count': expiring_subscriptions.count()}

        for subscription in expiring_subscriptions:
            days_remaining = (subscription.end_date - today).days

            result['upcoming_expirations'].append(
                {
                    'id': str(subscription.id),
                    'member': {
                        'id': str(subscription.member.id),
                        'name': subscription.member.full_name,
                    },
                    'plan': {
                        'id': str(subscription.plan.id),
                        'name': subscription.plan.name,
                    },
                    'end_date': subscription.end_date.strftime('%Y-%m-%d'),
                    'days_remaining': days_remaining,
                    'status': subscription.status,
                }
            )

        return Response(result)
