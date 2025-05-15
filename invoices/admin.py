from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from .models import Invoice

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'member_link', 'total', 'status', 'due_date', 'days_until_due')
    list_filter = ('status', 'created_at', 'due_date')
    search_fields = ('member__full_name', 'id')
    raw_id_fields = ('member', 'template')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'due_date'
    
    fieldsets = (
        ('Invoice Information', {
            'fields': ('member', 'template', 'subtotal', 'tax', 'total')
        }),
        ('Status', {
            'fields': ('status', 'due_date')
        }),
        ('System Information', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def invoice_number(self, obj):
        return f'INV-{obj.id}'
    invoice_number.short_description = 'Invoice #'
    
    def member_link(self, obj):
        url = reverse('admin:members_member_change', args=[obj.member.id])
        return format_html('<a href="{}">{}</a>', url, obj.member.full_name)
    member_link.short_description = 'Member'
    
    def days_until_due(self, obj):
        if obj.status == 'paid':
            return '-'
        
        days = (obj.due_date - timezone.now().date()).days
        if days < 0:
            return format_html(
                '<span style="color: red;">{} days overdue</span>',
                abs(days)
            )
        elif days == 0:
            return format_html(
                '<span style="color: orange;">Due today</span>'
            )
        return format_html(
            '<span style="color: green;">{} days</span>',
            days
        )
    days_until_due.short_description = 'Days Until Due'
    
    def get_actions(self, request):
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions
    
    def mark_as_paid(self, request, queryset):
        queryset.update(status='paid')
        self.message_user(request, f'{queryset.count()} invoices were marked as paid.')
    mark_as_paid.short_description = 'Mark selected invoices as paid'
    
    actions = [mark_as_paid]
