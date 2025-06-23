from rest_framework import serializers
from .models import CheckIn


class CheckInSerializer(serializers.ModelSerializer):
    member = serializers.SerializerMethodField()

    class Meta:
        model = CheckIn
        fields = [
            'id',
            'member',
            'check_in_time',
            'check_out_time',
            'location',
            'notes',
        ]

    def get_member(self, obj):
        return {
            'id': str(obj.member.id),
            'full_name': obj.member.full_name,
            'membership_type': getattr(obj.member, 'membership_type', ''),
        }
