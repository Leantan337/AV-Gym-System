from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count, Sum
from django.utils import timezone
from members.models import Member
from plans.models import MembershipSubscription
from invoices.models import Invoice
from checkins.models import CheckIn

class GymAdminSite(admin.AdminSite):
    site_header = 'AV Gym Management System'
    site_title = 'AV Gym Admin'
    index_title = 'Gym Management Dashboard'
    
    def get_app_list(self, request):
        app_list = super().get_app_list(request)
        # Add custom stats at the top
        stats_app = {
            'name': 'Dashboard',
            'app_label': 'dashboard',
            'app_url': '/admin/',
            'has_module_perms': True,
            'models': [
                {
                    'name': 'Quick Stats',
                    'object_name': 'QuickStats',
                    'perms': {'view': True},
                    'admin_url': '#',
                }
            ]
        }
        return [stats_app] + app_list
    
    def index(self, request, extra_context=None):
        # Get today's date
        today = timezone.now().date()
        
        # Member statistics
        total_members = Member.objects.count()
        active_members = Member.objects.filter(status='active').count()
        new_members = Member.objects.filter(
            created_at__date=today
        ).count()
        
        # Subscription statistics
        active_subscriptions = MembershipSubscription.objects.filter(
            status='active',
            end_date__gte=today
        ).count()
        expiring_soon = MembershipSubscription.objects.filter(
            status='active',
            end_date__range=[today, today + timezone.timedelta(days=7)]
        ).count()
        
        # Financial statistics
        today_revenue = Invoice.objects.filter(
            created_at__date=today,
            status='paid'
        ).aggregate(total=Sum('amount'))['total'] or 0
        pending_payments = Invoice.objects.filter(
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Check-in statistics
        today_checkins = CheckIn.objects.filter(
            check_in_time__date=today
        ).count()
        current_in_gym = CheckIn.objects.filter(
            check_in_time__date=today,
            check_out_time__isnull=True
        ).count()
        
        extra_context = {
            'title': 'Gym Management Dashboard',
            'stats': {
                'members': {
                    'total': total_members,
                    'active': active_members,
                    'new_today': new_members,
                },
                'subscriptions': {
                    'active': active_subscriptions,
                    'expiring_soon': expiring_soon,
                },
                'finance': {
                    'today_revenue': today_revenue,
                    'pending_payments': pending_payments,
                },
                'checkins': {
                    'today': today_checkins,
                    'current': current_in_gym,
                }
            }
        }
        return super().index(request, extra_context)

# Create custom admin site instance
gym_admin = GymAdminSite(name='gymadmin')

# Register your models with the custom admin site
from members.admin import MemberAdmin
from members.models import Member
gym_admin.register(Member, MemberAdmin)

from plans.admin import MembershipPlanAdmin, MembershipSubscriptionAdmin
from plans.models import MembershipPlan, MembershipSubscription
gym_admin.register(MembershipPlan, MembershipPlanAdmin)
gym_admin.register(MembershipSubscription, MembershipSubscriptionAdmin)

from checkins.admin import CheckInAdmin
from checkins.models import CheckIn
gym_admin.register(CheckIn, CheckInAdmin)

from invoices.admin import InvoiceAdmin
from invoices.models import Invoice
gym_admin.register(Invoice, InvoiceAdmin)
