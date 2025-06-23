from django.contrib import admin
from django.utils.html import format_html
from .models import MembershipPlan, MembershipSubscription


@admin.register(MembershipPlan)
class MembershipPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'duration_days', 'billing_frequency', 'active_subscribers')
    list_filter = ('billing_frequency',)
    search_fields = ('name',)

    def active_subscribers(self, obj):
        count = obj.membershipsubscription_set.filter(status='active').count()
        return format_html(
            '<span style="color: {}">{} subscribers</span>', 'green' if count > 0 else 'red', count
        )

    active_subscribers.short_description = 'Active Subscribers'


@admin.register(MembershipSubscription)
class MembershipSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        'member_name',
        'plan_name',
        'start_date',
        'end_date',
        'status',
        'days_remaining',
    )
    list_filter = ('status', 'start_date', 'end_date')
    search_fields = ('member__full_name', 'plan__name')
    raw_id_fields = ('member', 'plan')

    def member_name(self, obj):
        return obj.member.full_name

    member_name.short_description = 'Member'

    def plan_name(self, obj):
        return obj.plan.name

    plan_name.short_description = 'Plan'

    def days_remaining(self, obj):
        if obj.status != 'active':
            return '-'
        if obj.end_date and obj.start_date:
            end_date = obj.end_date.date() if hasattr(obj.end_date, 'date') else obj.end_date
            days = (obj.end_date - obj.start_date).days
            if days < 0:
                return "Expired"
            color = 'green' if days > 7 else 'orange' if days > 0 else 'red'
            return format_html('<span style="color: {}">{} days</span>', color, days)

    days_remaining.short_description = 'Days Remaining'
