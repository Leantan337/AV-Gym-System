import os
from django.shortcuts import render, get_object_or_404
from django.http import FileResponse, Http404
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.decorators import login_required
from django.utils import timezone

from .models import ReportJob, ReportType, ExportFormat
from .serializers import ReportJobSerializer, CreateReportSerializer
from .services import ReportService


class ReportViewSet(viewsets.ModelViewSet):
    """API endpoint for report generation and management"""
    queryset = ReportJob.objects.all().order_by('-created_at')
    serializer_class = ReportJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter reports by created_by if not admin"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # If not admin or staff, only show own reports
        if not (user.is_staff or user.is_superuser):
            queryset = queryset.filter(created_by=user)
        
        # Filter by report type
        report_type = self.request.query_params.get('report_type', None)
        if report_type:
            queryset = queryset.filter(report_type=report_type)
        
        # Filter by status
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset
    
    def perform_create(self, serializer):
        """Set the created_by field to the current user"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Create a new report job and generate the report"""
        serializer = CreateReportSerializer(data=request.data)
        
        if serializer.is_valid():
            # Create report job
            report_job = serializer.save(created_by=request.user)
            
            try:
                # Process report job (generate report)
                file_path = ReportService.process_report_job(report_job)
                
                # Return the report job data
                return Response(
                    ReportJobSerializer(report_job).data,
                    status=status.HTTP_201_CREATED
                )
            except Exception as e:
                # Handle any errors
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download the generated report file"""
        report_job = self.get_object()
        
        if report_job.status != 'COMPLETED' or not report_job.file_path:
            return Response(
                {'error': 'Report is not available for download'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not os.path.exists(report_job.file_path):
            report_job.status = 'FAILED'
            report_job.error_message = 'File not found on server'
            report_job.save()
            return Response(
                {'error': 'File not found on server'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            response = FileResponse(open(report_job.file_path, 'rb'))
            
            # Set the Content-Disposition header to make the browser download the file
            filename = os.path.basename(report_job.file_path)
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@login_required
def report_viewer(request, report_id):
    """View for displaying a report in the browser"""
    report_job = get_object_or_404(ReportJob, id=report_id)
    
    # Check permissions - only owner or staff can view report
    if not (request.user.is_staff or report_job.created_by == request.user):
        raise Http404('Report not found')
    
    # Check if report is available
    if report_job.status != 'COMPLETED' or not report_job.file_path:
        return render(request, 'reports/error.html', {
            'error': 'Report is not available for viewing'
        })
    
    context = {
        'report': report_job,
        'created_at': timezone.localtime(report_job.created_at).strftime('%Y-%m-%d %H:%M'),
        'completed_at': timezone.localtime(report_job.completed_at).strftime('%Y-%m-%d %H:%M') if report_job.completed_at else None,
    }
    
    return render(request, 'reports/viewer.html', context)
