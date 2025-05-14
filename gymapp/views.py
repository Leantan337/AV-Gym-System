from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import models
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from members.models import Member
from plans.models import MembershipPlan, MembershipSubscription
from checkins.models import CheckIn
from invoices.models import Invoice

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_statistics(request):
    # Time ranges
    today = timezone.now().date()
    thirty_days_ago = timezone.now() - timedelta(days=30)
    
    # Member statistics
    total_members = Member.objects.count()
    active_members = Member.objects.filter(status='active').count()
    new_members_30d = Member.objects.filter(
        created_at__gte=thirty_days_ago
    ).count()
    
    # Subscription statistics
    active_subscriptions = MembershipSubscription.objects.filter(
        status='active',
        end_date__gte=today
    ).count()
    subscription_revenue = MembershipSubscription.objects.filter(
        status='active',
        end_date__gte=today
    ).aggregate(total=Sum('plan__price'))['total'] or 0
    
    # Check-in statistics
    todays_checkins = CheckIn.objects.filter(
        check_in_time__date=today
    ).count()
    checkins_30d = CheckIn.objects.filter(
        check_in_time__gte=thirty_days_ago
    ).count()
    
    # Most popular plans
    popular_plans = MembershipPlan.objects.annotate(
        subscriber_count=Count('membershipsubscription', filter=models.Q(
            membershipsubscription__status='active',
            membershipsubscription__end_date__gte=today
        ))
    ).order_by('-subscriber_count')[:5]
    
    # Financial statistics
    total_revenue = Invoice.objects.filter(
        status='paid'
    ).aggregate(total=Sum('amount'))['total'] or 0
    revenue_30d = Invoice.objects.filter(
        status='paid',
        created_at__gte=thirty_days_ago
    ).aggregate(total=Sum('amount'))['total'] or 0
    pending_payments = Invoice.objects.filter(
        status='pending'
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    return Response({
        'members': {
            'total': total_members,
            'active': active_members,
            'new_last_30_days': new_members_30d
        },
        'subscriptions': {
            'active': active_subscriptions,
            'revenue': subscription_revenue,
            'popular_plans': [
                {
                    'name': plan.name,
                    'subscribers': plan.subscriber_count
                }
                for plan in popular_plans
            ]
        },
        'checkins': {
            'today': todays_checkins,
            'last_30_days': checkins_30d
        },
        'finance': {
            'total_revenue': total_revenue,
            'revenue_last_30_days': revenue_30d,
            'pending_payments': pending_payments
        }
    })
