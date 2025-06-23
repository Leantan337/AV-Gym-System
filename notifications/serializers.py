from rest_framework import serializers
from .models import (
    NotificationTemplate,
    NotificationSetting,
    NotificationLog,
    ExpiryNotificationQueue,
)


class NotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = [
            'id',
            'name',
            'notification_type',
            'subject',
            'body_text',
            'body_html',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSetting
        fields = [
            'id',
            'notification_type',
            'template',
            'is_email_enabled',
            'is_dashboard_enabled',
            'days_before_expiry',
        ]
        read_only_fields = ['id']


class NotificationLogSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()

    class Meta:
        model = NotificationLog
        fields = [
            'id',
            'notification_type',
            'member',
            'member_name',
            'subscription',
            'subject',
            'message',
            'is_email_sent',
            'sent_at',
        ]
        read_only_fields = ['id', 'sent_at']

    def get_member_name(self, obj):
        return obj.member.full_name if obj.member else None


class ExpiryNotificationQueueSerializer(serializers.ModelSerializer):
    member_name = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    end_date = serializers.SerializerMethodField()

    class Meta:
        model = ExpiryNotificationQueue
        fields = [
            'id',
            'subscription',
            'member_name',
            'plan_name',
            'end_date',
            'days_before_expiry',
            'scheduled_date',
            'is_processed',
            'processed_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_member_name(self, obj):
        return (
            obj.subscription.member.full_name
            if obj.subscription and obj.subscription.member
            else None
        )

    def get_plan_name(self, obj):
        return obj.subscription.plan.name if obj.subscription and obj.subscription.plan else None

    def get_end_date(self, obj):
        return obj.subscription.end_date if obj.subscription else None
