from rest_framework import serializers
from .models import CheckIn

class CheckInSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckIn
        fields = ['id', 'member', 'check_in_time', 'check_out_time', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
