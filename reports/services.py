import os
import json
import uuid
import logging
from datetime import datetime, timedelta

# PDF generation imports
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch

# Excel and CSV generation imports
import pandas as pd
import xlsxwriter

from django.db.models import Count, Sum

from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

from members.models import Member
from checkins.models import CheckIn
from plans.models import MembershipPlan, MembershipSubscription
from .models import ReportJob, ReportType, ExportFormat


# Define a reports directory under media
REPORT_DIR = os.path.join(settings.MEDIA_ROOT, 'reports')

# Ensure the directory exists
if not os.path.exists(REPORT_DIR):
    os.makedirs(REPORT_DIR)


class ReportService:
    """Service for generating various reports"""
    
    @staticmethod
    def _generate_pdf(data, filename, title, report_dir):
        """Generate a PDF report from data"""
        # Create file path
        file_path = os.path.join(report_dir, f"{filename}.pdf")
        
        # Create the PDF document
        doc = SimpleDocTemplate(
            file_path,
            pagesize=landscape(letter),
            topMargin=0.5*inch,
            bottomMargin=0.5*inch,
            leftMargin=0.5*inch,
            rightMargin=0.5*inch
        )
        
        # Define styles
        styles = getSampleStyleSheet()
        title_style = styles['Heading1']
        title_style.alignment = 1  # Center
        
        # Create document elements
        elements = []
        
        # Add title
        elements.append(Paragraph(title, title_style))
        elements.append(Spacer(1, 0.25*inch))
        
        # Convert data to table format
        if data:
            # Extract headers from first dictionary
            headers = list(data[0].keys())
            
            # Extract values and prepare table data
            table_data = [headers]  # First row is headers
            for item in data:
                table_data.append([item.get(header, '') for header in headers])
            
            # Create table
            table = Table(table_data)
            
            # Add style to table
            style = TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ])
            
            # Add zebra striping
            for i in range(1, len(table_data)):
                if i % 2 == 0:
                    style.add('BACKGROUND', (0, i), (-1, i), colors.whitesmoke)
            
            table.setStyle(style)
            elements.append(table)
        else:
            # If no data, show a message
            elements.append(Paragraph("No data available for this report.", styles['Normal']))
        
        # Build PDF
        doc.build(elements)
        return file_path
    
    @staticmethod
    def _generate_excel(data, filename, title, report_dir):
        """Generate an Excel report from data"""
        # Create file path
        file_path = os.path.join(report_dir, f"{filename}.xlsx")
        
        # Create a Pandas DataFrame from the data
        df = pd.DataFrame(data)
        
        # Create an Excel writer
        with pd.ExcelWriter(file_path, engine='xlsxwriter') as writer:
            # Convert the DataFrame to an Excel object
            df.to_excel(writer, sheet_name=title, index=False)
            
            # Get the xlsxwriter workbook and worksheet objects
            workbook = writer.book
            worksheet = writer.sheets[title]
            
            # Add a header format
            header_format = workbook.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'fg_color': '#D7E4BC',
                'border': 1
            })
            
            # Apply the header format
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
            
            # Auto-fit columns
            for i, column in enumerate(df.columns):
                column_width = max(df[column].astype(str).map(len).max(), len(column)) + 2
                worksheet.set_column(i, i, column_width)
        
        return file_path
    
    @staticmethod
    def _generate_csv(data, filename, report_dir):
        """Generate a CSV report from data"""
        # Create file path
        file_path = os.path.join(report_dir, f"{filename}.csv")
        
        # Create a Pandas DataFrame from the data
        df = pd.DataFrame(data)
        
        # Write to CSV
        df.to_csv(file_path, index=False)
        
        return file_path

    @staticmethod
    def get_report_generator(report_type):
        """Return the appropriate report generator function"""
        generators = {
            ReportType.MEMBERS: ReportService.generate_members_report,
            ReportType.CHECKINS: ReportService.generate_checkins_report,
            ReportType.REVENUE: ReportService.generate_revenue_report,
            ReportType.SUBSCRIPTIONS: ReportService.generate_subscriptions_report,
            ReportType.EXPIRING_MEMBERSHIPS: ReportService.generate_expiring_memberships_report,
        }
        return generators.get(report_type, ReportService.generate_custom_report)
        
    @staticmethod
    def ensure_report_dir():
        """Ensure the reports directory exists"""
        if not os.path.exists(REPORT_DIR):
            os.makedirs(REPORT_DIR)
        return REPORT_DIR

    @staticmethod
    def process_report_job(job):
        """Process a report job"""
        job.status = 'PROCESSING'
        job.save()
        
        try:
            # Get the appropriate report generator
            report_generator = ReportService.get_report_generator(job.report_type)
            if not report_generator:
                raise Exception(f"No report generator found for type: {job.report_type}")
                
            # Generate the report
            file_path = report_generator(job, job.export_format)
            
            # Update job with success
            job.status = 'COMPLETED'
            job.completed_at = timezone.now()
            job.file_path = file_path
            job.save()
            
            return file_path
            
        except Exception as e:
            # Log the error
            logging.error(f"Report generation failed: {str(e)}")
            
            # Update job with error
            job.status = 'FAILED'
            job.error_message = str(e)[:255]  # Truncate if too long
            job.save()
            
            # Re-raise the exception
            raise
    
    @staticmethod
    def generate_members_report(job, format_type='pdf'):
        """Generate a report of all members"""
        # Parse parameters if provided
        parameters = job.parameters or {}
        status_filter = parameters.get('status')
        date_from = parameters.get('date_from')
        date_to = parameters.get('date_to')
        
        # Build query filters
        query_filters = {}
        if status_filter:
            query_filters['status'] = status_filter
        
        # Apply date filter if provided
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                query_filters['join_date__gte'] = date_from
            except (ValueError, TypeError):
                pass
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                query_filters['join_date__lte'] = date_to
            except (ValueError, TypeError):
                pass
        
        # Query members
        members = Member.objects.filter(**query_filters).order_by('last_name', 'first_name')
        
        # Convert to list of dictionaries
        data = [{
            'ID': member.id,
            'First Name': member.first_name,
            'Last Name': member.last_name,
            'Email': member.email,
            'Phone': member.phone,
            'Status': member.get_status_display(),
            'Join Date': member.join_date.strftime('%Y-%m-%d'),
            'Membership': member.membership.name if hasattr(member, 'membership') and member.membership else 'None',
            'Membership Expiry': member.membership_end_date.strftime('%Y-%m-%d') if member.membership_end_date else 'N/A',
        } for member in members]
        
        # Generate filename
        filename = f"members_report_{uuid.uuid4().hex[:8]}"
        title = "Members Report"
        
        # Generate the report in the specified format
        if format_type == ExportFormat.PDF:
            return ReportService._generate_pdf(data, filename, title, REPORT_DIR)
        elif format_type == ExportFormat.EXCEL:
            return ReportService._generate_excel(data, filename, title, REPORT_DIR)
        else:  # CSV
            return ReportService._generate_csv(data, filename, REPORT_DIR)
    
    @staticmethod
    def generate_checkins_report(job, format_type='pdf'):
        """Generate a report of check-ins"""
        # Parse parameters if provided
        parameters = job.parameters or {}
        member_id = parameters.get('member_id')
        date_from = parameters.get('date_from')
        date_to = parameters.get('date_to')
        
        # Build query filters
        query_filters = {}
        if member_id:
            query_filters['member_id'] = member_id
        
        # Apply date filter if provided
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                query_filters['timestamp__date__gte'] = date_from
            except (ValueError, TypeError):
                pass
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                query_filters['timestamp__date__lte'] = date_to
            except (ValueError, TypeError):
                pass
        
        # Query check-ins
        checkins = CheckIn.objects.filter(**query_filters).select_related('member').order_by('-timestamp')
        
        # Convert to list of dictionaries
        data = [{
            'ID': checkin.id,
            'Member ID': checkin.member.id,
            'Member Name': f"{checkin.member.first_name} {checkin.member.last_name}",
            'Check In Time': timezone.localtime(checkin.timestamp).strftime('%Y-%m-%d %H:%M'),
            'Check Out Time': timezone.localtime(checkin.check_out_time).strftime('%Y-%m-%d %H:%M') if checkin.check_out_time else 'Not checked out',
            'Duration (minutes)': int((checkin.check_out_time - checkin.timestamp).total_seconds() / 60) if checkin.check_out_time else 'N/A',
        } for checkin in checkins]
        
        # Generate filename
        filename = f"checkins_report_{uuid.uuid4().hex[:8]}"
        title = "Check-Ins Report"
        
        # Generate the report in the specified format
        if format_type == ExportFormat.PDF:
            return ReportService._generate_pdf(data, filename, title, REPORT_DIR)
        elif format_type == ExportFormat.EXCEL:
            return ReportService._generate_excel(data, filename, title, REPORT_DIR)
        else:  # CSV
            return ReportService._generate_csv(data, filename, REPORT_DIR)
    
    @staticmethod
    def generate_revenue_report(job, format_type='pdf'):
        """Generate a revenue report"""
        # Parse parameters if provided
        parameters = job.parameters or {}
        date_from = parameters.get('date_from')
        date_to = parameters.get('date_to')
        payment_type = parameters.get('payment_type')
        
        # Build query filters
        query_filters = {}
        
        # Apply date filter if provided
        if date_from:
            try:
                date_from = datetime.strptime(date_from, '%Y-%m-%d').date()
                query_filters['payment_date__gte'] = date_from
            except (ValueError, TypeError):
                pass
        
        if date_to:
            try:
                date_to = datetime.strptime(date_to, '%Y-%m-%d').date()
                query_filters['payment_date__lte'] = date_to
            except (ValueError, TypeError):
                pass
        
        if payment_type:
            query_filters['payment_type'] = payment_type
        
        # Query payments
        payments = Payment.objects.filter(**query_filters).select_related('member').order_by('-payment_date')
        
        # Convert to list of dictionaries
        data = [{
            'ID': payment.id,
            'Member': f"{payment.member.first_name} {payment.member.last_name}",
            'Payment Date': payment.payment_date.strftime('%Y-%m-%d'),
            'Amount': f"${payment.amount:.2f}",
            'Payment Type': payment.get_payment_type_display(),
            'Description': payment.description or 'N/A',
            'Status': payment.get_status_display(),
        } for payment in payments]
        
        # Calculate totals for the summary
        total_amount = sum(payment.amount for payment in payments)
        payment_types_count = payments.values('payment_type').annotate(count=Count('id'))
        payment_types_summary = {pt['payment_type']: pt['count'] for pt in payment_types_count}
        
        # Add summary row
        data.append({
            'ID': '',
            'Member': 'TOTAL',
            'Payment Date': '',
            'Amount': f"${total_amount:.2f}",
            'Payment Type': '',
            'Description': f"Total Payments: {len(payments)}",
            'Status': '',
        })
        
        # Generate filename
        filename = f"revenue_report_{uuid.uuid4().hex[:8]}"
        title = "Revenue Report"
        
        # Generate the report in the specified format
        if format_type == ExportFormat.PDF:
            return ReportService._generate_pdf(data, filename, title, REPORT_DIR)
        elif format_type == ExportFormat.EXCEL:
            return ReportService._generate_excel(data, filename, title, REPORT_DIR)
        else:  # CSV
            return ReportService._generate_csv(data, filename, REPORT_DIR)
    
    @staticmethod
    def generate_subscriptions_report(job, format_type='pdf'):
        """Generate a report of active subscriptions"""
        # Parse parameters if provided
        parameters = job.parameters or {}
        status_filter = parameters.get('status')
        
        # Build query filters
        query_filters = {}
        if status_filter:
            query_filters['status'] = status_filter
        
        # Query subscriptions
        subscriptions = Subscription.objects.filter(**query_filters).select_related('member', 'plan').order_by('next_billing_date')
        
        # Convert to list of dictionaries
        data = [{
            'ID': subscription.id,
            'Member': f"{subscription.member.first_name} {subscription.member.last_name}",
            'Plan': subscription.plan.name,
            'Start Date': subscription.start_date.strftime('%Y-%m-%d'),
            'Next Billing': subscription.next_billing_date.strftime('%Y-%m-%d') if subscription.next_billing_date else 'N/A',
            'Amount': f"${subscription.amount:.2f}",
            'Status': subscription.get_status_display(),
            'Payment Method': subscription.get_payment_method_display(),
        } for subscription in subscriptions]
        
        # Generate filename
        filename = f"subscriptions_report_{uuid.uuid4().hex[:8]}"
        title = "Subscriptions Report"
        
        # Generate the report in the specified format
        if format_type == ExportFormat.PDF:
            return ReportService._generate_pdf(data, filename, title, REPORT_DIR)
        elif format_type == ExportFormat.EXCEL:
            return ReportService._generate_excel(data, filename, title, REPORT_DIR)
        else:  # CSV
            return ReportService._generate_csv(data, filename, REPORT_DIR)
    
    @staticmethod
    def generate_expiring_memberships_report(job, format_type='pdf'):
        """Generate a report of memberships expiring soon"""
        # Parse parameters if provided
        parameters = job.parameters or {}
        days = parameters.get('days', 30)  # Default to 30 days if not specified
        
        # Calculate expiry date range
        today = timezone.now().date()
        expiry_date = today + timedelta(days=int(days))
        
        # Query memberships expiring in the next X days
        members = Member.objects.filter(
            membership_end_date__gte=today,
            membership_end_date__lte=expiry_date
        ).select_related('membership').order_by('membership_end_date')
        
        # Convert to list of dictionaries
        data = [{
            'ID': member.id,
            'Name': f"{member.first_name} {member.last_name}",
            'Email': member.email,
            'Phone': member.phone,
            'Membership': member.membership.name if hasattr(member, 'membership') and member.membership else 'None',
            'Expiry Date': member.membership_end_date.strftime('%Y-%m-%d'),
            'Days Until Expiry': (member.membership_end_date - today).days,
        } for member in members]
        
        # Generate filename
        filename = f"expiring_memberships_report_{uuid.uuid4().hex[:8]}"
        title = "Expiring Memberships Report"
        
        # Generate the report in the specified format
        if format_type == ExportFormat.PDF:
            return ReportService._generate_pdf(data, filename, title, REPORT_DIR)
        elif format_type == ExportFormat.EXCEL:
            return ReportService._generate_excel(data, filename, title, REPORT_DIR)
        else:  # CSV
            return ReportService._generate_csv(data, filename, REPORT_DIR)
    
        # Get parameters from job
        params = job.parameters or {}
        
        # Filter members based on parameters
        members_query = Member.objects.all()
        
        if params.get('status'):
            members_query = members_query.filter(status=params.get('status'))
            
        if params.get('join_date_start'):
            members_query = members_query.filter(join_date__gte=params.get('join_date_start'))
            
        if params.get('join_date_end'):
            members_query = members_query.filter(join_date__lte=params.get('join_date_end'))
        
        # Get all members with their subscription information
        members = members_query.select_related('active_subscription__plan').all()
        
        # Create data for the report
        data = []
        for member in members:
            subscription = getattr(member, 'active_subscription', None)
            plan_name = getattr(subscription, 'plan', {}).name if subscription else 'No Plan'
            data.append({
                'Member ID': member.member_id,
                'Name': f"{member.first_name} {member.last_name}",
                'Email': member.email,
                'Phone': member.phone,
                'Address': member.address,
                'Join Date': member.join_date.strftime('%Y-%m-%d') if member.join_date else 'N/A',
                'Status': member.status,
                'Plan': plan_name,
                'Subscription End': subscription.end_date.strftime('%Y-%m-%d') if subscription and subscription.end_date else 'N/A'
            })
        
        # Generate the appropriate report format
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        filename = f"members_report_{timestamp}"
        
        if format_type == 'pdf':
            return ReportService._generate_pdf(data, filename, 'Members Report', report_dir)
        elif format_type == 'excel':
            return ReportService._generate_excel(data, filename, 'Members Report', report_dir)
        else:  # CSV
            return ReportService._generate_csv(data, filename, report_dir)
