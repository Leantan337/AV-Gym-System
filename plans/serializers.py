from rest_framework import serializers
from .models import MembershipPlan, MembershipSubscription


class MembershipPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipPlan
        fields = [
            'id',
            'name',
            'price',
            'duration_days',
            'billing_frequency',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MembershipSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipSubscription
        fields = [
            'id',
            'member',
            'plan',
            'start_date',
            'end_date',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
