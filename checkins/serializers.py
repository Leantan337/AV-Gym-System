from rest_framework import serializers
from .models import CheckIn


class CheckInSerializer(serializers.ModelSerializer):
    member = serializers.SerializerMethodField()
    checkInTime = serializers.DateTimeField(source='check_in_time', read_only=True)
    checkOutTime = serializers.DateTimeField(source='check_out_time', read_only=True)

    class Meta:
        model = CheckIn
        fields = [
            'id',
            'member',
            'checkInTime',
            'checkOutTime',
            'location',
            'notes',
        ]

    def get_member(self, obj):
        return {
            'id': str(obj.member.id),
            'fullName': obj.member.full_name,
            'membership_type': getattr(obj.member, 'membership_type', ''),
        }
