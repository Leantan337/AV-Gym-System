from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import CheckIn

@admin.register(CheckIn)
class CheckInAdmin(admin.ModelAdmin):
    list_display = ('member_name', 'check_in_time', 'check_out_time', 'duration', 'status')
    list_filter = ('check_in_time', 'check_out_time')
    search_fields = ('member__full_name',)
    raw_id_fields = ('member',)
    date_hierarchy = 'check_in_time'
    
    def member_name(self, obj):
        return obj.member.full_name
    member_name.short_description = 'Member'
    
    def duration(self, obj):
        if not obj.check_out_time:
            if obj.check_in_time.date() == timezone.now().date():
                return 'Currently in'
            return 'No check-out'
        
        duration = obj.check_out_time - obj.check_in_time
        hours = duration.seconds // 3600
        minutes = (duration.seconds % 3600) // 60
        
        return f'{hours}h {minutes}m'
    duration.short_description = 'Duration'
    
    def status(self, obj):
        if not obj.check_out_time:
            if obj.check_in_time.date() == timezone.now().date():
                return format_html(
                    '<span style="color: green;">Currently in</span>'
                )
            return format_html(
                '<span style="color: red;">No check-out</span>'
            )
        return format_html(
            '<span style="color: blue;">Completed</span>'
        )
    status.short_description = 'Status'
