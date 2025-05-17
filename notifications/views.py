from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta

from .models import NotificationTemplate, NotificationSetting, NotificationLog, ExpiryNotificationQueue, NotificationType
from .serializers import NotificationTemplateSerializer, NotificationSettingSerializer, NotificationLogSerializer, ExpiryNotificationQueueSerializer
from .services import NotificationService


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    """API endpoint for notification templates"""
    queryset = NotificationTemplate.objects.all()
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
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
            'subscription_start_date': sample_data.get('subscription_start_date', 
                                                     (timezone.now() - timedelta(days=60)).strftime('%Y-%m-%d')),
            'subscription_end_date': sample_data.get('subscription_end_date',
                                                   (timezone.now() + timedelta(days=15)).strftime('%Y-%m-%d')),
            'days_remaining': sample_data.get('days_remaining', '15'),
            'subscription_id': sample_data.get('subscription_id', 'SUB98765'),
            'days_before_expiry': sample_data.get('days_before_expiry', '15')
        }
        
        # Render the template with the sample data
        try:
            subject = NotificationService.render_template(template.subject, default_data)
            body_text = NotificationService.render_template(template.body_text, default_data)
            
            body_html = None
            if template.body_html:
                body_html = NotificationService.render_template(template.body_html, default_data)
            
            return Response({
                'subject': subject,
                'body_text': body_text,
                'body_html': body_html,
                'sample_data': default_data
            })
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
            settings = NotificationSetting.objects.get(notification_type=NotificationType.MEMBERSHIP_EXPIRY)
            serializer = self.get_serializer(settings)
            return Response(serializer.data)
        except NotificationSetting.DoesNotExist:
            # Return default settings
            return Response({
                'notification_type': NotificationType.MEMBERSHIP_EXPIRY,
                'is_email_enabled': True,
                'is_dashboard_enabled': True,
                'days_before_expiry': [30, 15, 7, 3, 1]
            })


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
            settings = NotificationSetting.objects.get(notification_type=NotificationType.MEMBERSHIP_EXPIRY)
            days_before_expiry = settings.days_before_expiry
        except NotificationSetting.DoesNotExist:
            days_before_expiry = [30, 15, 7, 3, 1]
        
        # Get today's date
        today = timezone.now().date()
        
        # Find subscriptions expiring within the configured time periods
        max_days = max(days_before_expiry) if days_before_expiry else 30
        
        expiring_subscriptions = MembershipSubscription.objects.filter(
            status='active',
            end_date__gte=today,
            end_date__lte=today + timedelta(days=max_days)
        ).select_related('member', 'plan').order_by('end_date')
        
        # Group subscriptions by time period
        result = {
            'upcoming_expirations': [],
            'total_count': expiring_subscriptions.count()
        }
        
        for subscription in expiring_subscriptions:
            days_remaining = (subscription.end_date - today).days
            
            result['upcoming_expirations'].append({
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
            })
        
        return Response(result)
