from rest_framework import serializers
from .models import ReportJob, ReportType, ExportFormat


class ReportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportJob
        fields = [
            'id',
            'report_type',
            'export_format',
            'parameters',
            'created_by',
            'created_at',
            'status',
            'completed_at',
            'file_path',
        ]
        read_only_fields = ['id', 'created_at', 'status', 'completed_at', 'file_path']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Add report type and export format display names
        data['report_type_display'] = instance.get_report_type_display()
        data['export_format_display'] = instance.get_export_format_display()
        return data


class CreateReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportJob
        fields = ['report_type', 'export_format', 'parameters']

    def validate_report_type(self, value):
        """Validate that report_type is a valid choice"""
        if value not in [choice[0] for choice in ReportType.choices]:
            raise serializers.ValidationError(
                f"Invalid report type. Choose from: {', '.join([choice[0] for choice in ReportType.choices])}"
            )
        return value

    def validate_export_format(self, value):
        """Validate that export_format is a valid choice"""
        if value not in [choice[0] for choice in ExportFormat.choices]:
            raise serializers.ValidationError(
                f"Invalid export format. Choose from: {', '.join([choice[0] for choice in ExportFormat.choices])}"
            )
        return value
