import logging
import os
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import ReportJob
from .services import ReportService

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def generate_report(self, job_id):
    """
    Generate a report asynchronously
    """
    try:
        job = ReportJob.objects.get(id=job_id)
        
        # Update job status to processing
        job.status = 'processing'
        job.started_at = timezone.now()
        job.save()
        
        logger.info(f"Starting report generation for job {job_id}: {job.report_type}")
        
        # Generate the report based on type
        if job.report_type == 'members':
            file_path = ReportService.generate_members_report(job, job.format_type)
        elif job.report_type == 'checkins':
            file_path = ReportService.generate_checkins_report(job, job.format_type)
        elif job.report_type == 'invoices':
            file_path = ReportService.generate_invoices_report(job, job.format_type)
        elif job.report_type == 'subscriptions':
            file_path = ReportService.generate_subscriptions_report(job, job.format_type)
        else:
            raise ValueError(f"Unknown report type: {job.report_type}")
        
        # Update job with success
        job.status = 'completed'
        job.completed_at = timezone.now()
        job.file_path = file_path
        job.save()
        
        logger.info(f"Successfully generated report for job {job_id}: {file_path}")
        
        return {
            'status': 'success',
            'job_id': str(job_id),
            'file_path': file_path
        }
        
    except ReportJob.DoesNotExist:
        logger.error(f"Report job {job_id} not found")
        return {
            'status': 'error',
            'message': 'Report job not found'
        }
    except Exception as e:
        logger.error(f"Error generating report for job {job_id}: {e}")
        
        # Update job with error
        try:
            job = ReportJob.objects.get(id=job_id)
            job.status = 'failed'
            job.error_message = str(e)
            job.completed_at = timezone.now()
            job.save()
        except:
            pass
        
        raise self.retry(countdown=300, exc=e)

@shared_task(bind=True)
def cleanup_old_reports(self, days_old=7):
    """
    Clean up old report files and jobs
    """
    try:
        cutoff_date = timezone.now().date() - timedelta(days=days_old)
        
        # Get old completed jobs
        old_jobs = ReportJob.objects.filter(
            status='completed',
            completed_at__date__lt=cutoff_date
        )
        
        deleted_files = 0
        deleted_jobs = 0
        
        for job in old_jobs:
            try:
                # Delete the file if it exists
                if job.file_path and os.path.exists(job.file_path):
                    os.remove(job.file_path)
                    deleted_files += 1
                
                # Delete the job record
                job.delete()
                deleted_jobs += 1
                
            except Exception as e:
                logger.error(f"Error cleaning up report job {job.id}: {e}")
                continue
        
        logger.info(f"Cleaned up {deleted_files} report files and {deleted_jobs} job records")
        return {
            'status': 'success',
            'deleted_files': deleted_files,
            'deleted_jobs': deleted_jobs
        }
        
    except Exception as e:
        logger.error(f"Error in cleanup_old_reports task: {e}")
        raise self.retry(countdown=600, exc=e)

@shared_task(bind=True)
def generate_daily_summary_report(self):
    """
    Generate a daily summary report automatically
    """
    try:
        from members.models import Member
        from checkins.models import CheckIn
        from invoices.models import Invoice
        from plans.models import MembershipSubscription
        
        today = timezone.now().date()
        
        # Collect daily statistics
        stats = {
            'date': today.isoformat(),
            'total_members': Member.objects.count(),
            'active_members': Member.objects.filter(status='active').count(),
            'new_members_today': Member.objects.filter(created_at__date=today).count(),
            'checkins_today': CheckIn.objects.filter(check_in_time__date=today).count(),
            'invoices_generated_today': Invoice.objects.filter(created_at__date=today).count(),
            'active_subscriptions': MembershipSubscription.objects.filter(status='active').count(),
            'expiring_soon': MembershipSubscription.objects.filter(
                status='active',
                end_date__lte=today + timedelta(days=7)
            ).count(),
        }
        
        # Create a summary report
        from .services import ReportService
        import tempfile
        
        # Create a temporary file for the summary
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            import json
            json.dump(stats, f, indent=2)
            temp_path = f.name
        
        logger.info(f"Generated daily summary report: {temp_path}")
        logger.info(f"Daily stats: {stats}")
        
        return {
            'status': 'success',
            'file_path': temp_path,
            'stats': stats
        }
        
    except Exception as e:
        logger.error(f"Error generating daily summary report: {e}")
        raise self.retry(countdown=300, exc=e) 