from django.contrib import admin
from django.utils.html import format_html
from .models import Member


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = (
        'full_name',
        'phone',
        'status',
        'subscription_status',
        'member_since',
        'image_preview',
    )
    list_filter = ('status', 'created_at')
    search_fields = ('full_name', 'phone', 'address')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Personal Information', {'fields': ('full_name', 'phone', 'address', 'image')}),
        ('Status', {'fields': ('status', 'notes')}),
        ('System Information', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )

    def subscription_status(self, obj):
        active_subscription = obj.subscriptions.filter(status='active').first()
        if active_subscription:
            return format_html(
                '<span style="color: green;">Active until {}</span>', active_subscription.end_date
            )
        return format_html('<span style="color: red;">No active subscription</span>')

    subscription_status.short_description = 'Subscription'

    def member_since(self, obj):
        return obj.created_at.strftime('%Y-%m-%d')

    member_since.short_description = 'Member Since'

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 50px;"/>', obj.image.url)
        return '(No image)'

    image_preview.short_description = 'Image'

    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions

    def mark_as_active(self, request, queryset):
        queryset.update(status='active')
        self.message_user(request, f'{queryset.count()} members were marked as active.')

    mark_as_active.short_description = 'Mark selected members as active'

    def mark_as_inactive(self, request, queryset):
        queryset.update(status='inactive')
        self.message_user(request, f'{queryset.count()} members were marked as inactive.')

    mark_as_inactive.short_description = 'Mark selected members as inactive'

    actions = [mark_as_active, mark_as_inactive]
