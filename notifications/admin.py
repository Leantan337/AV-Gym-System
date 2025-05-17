from django.contrib import admin
from django.utils.html import format_html
from .models import NotificationTemplate, NotificationSetting, NotificationLog, ExpiryNotificationQueue


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'notification_type', 'subject', 'is_active', 'created_at', 'updated_at')
    list_filter = ('notification_type', 'is_active')
    search_fields = ('name', 'subject')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Template Information', {
            'fields': ('name', 'notification_type', 'is_active')
        }),
        ('Email Content', {
            'fields': ('subject', 'body_text', 'body_html')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(NotificationSetting)
class NotificationSettingAdmin(admin.ModelAdmin):
    list_display = ('notification_type', 'template', 'is_email_enabled', 'is_dashboard_enabled', 'get_days_before_expiry')
    list_filter = ('notification_type', 'is_email_enabled', 'is_dashboard_enabled')
    readonly_fields = ('notification_type',)
    
    def get_days_before_expiry(self, obj):
        if obj.notification_type == 'MEMBERSHIP_EXPIRY' and obj.days_before_expiry:
            return ', '.join(str(day) for day in obj.days_before_expiry)
        return '-'
    get_days_before_expiry.short_description = 'Days Before Expiry'


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ('member', 'notification_type', 'subject', 'is_email_sent', 'sent_at')
    list_filter = ('notification_type', 'is_email_sent', 'sent_at')
    search_fields = ('member__full_name', 'subject')
    readonly_fields = ('member', 'notification_type', 'subscription', 'subject', 'message', 'is_email_sent', 'sent_at')
    date_hierarchy = 'sent_at'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ExpiryNotificationQueue)
class ExpiryNotificationQueueAdmin(admin.ModelAdmin):
    list_display = ('subscription', 'days_before_expiry', 'scheduled_date', 'is_processed', 'processed_at')
    list_filter = ('days_before_expiry', 'is_processed', 'scheduled_date')
    search_fields = ('subscription__member__full_name',)
    readonly_fields = ('created_at',)
    date_hierarchy = 'scheduled_date'
    
    def has_add_permission(self, request):
        return False
