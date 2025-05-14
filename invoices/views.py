from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from io import BytesIO
from .models import Invoice
from .serializers import InvoiceSerializer

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Invoice.objects.all()
        
        # Filter by member
        member = self.request.query_params.get('member', None)
        if member:
            queryset = queryset.filter(member=member)
        
        # Filter by status
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date and end_date:
            queryset = queryset.filter(
                created_at__date__range=[start_date, end_date]
            )
        
        # Filter by amount range
        min_amount = self.request.query_params.get('min_amount', None)
        max_amount = self.request.query_params.get('max_amount', None)
        if min_amount:
            queryset = queryset.filter(amount__gte=min_amount)
        if max_amount:
            queryset = queryset.filter(amount__lte=max_amount)
        
        # Sort by
        sort_by = self.request.query_params.get('sort_by', None)
        if sort_by:
            if sort_by == 'date':
                queryset = queryset.order_by('created_at')
            elif sort_by == '-date':
                queryset = queryset.order_by('-created_at')
            elif sort_by == 'amount':
                queryset = queryset.order_by('amount')
            elif sort_by == '-amount':
                queryset = queryset.order_by('-amount')
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def mark_as_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.save()
        serializer = self.get_serializer(invoice)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def generate_pdf(self, request, pk=None):
        invoice = self.get_object()
        
        # Create PDF
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        # Add header
        p.setFont('Helvetica-Bold', 24)
        p.drawString(50, 750, 'Invoice')
        
        # Add invoice details
        p.setFont('Helvetica', 12)
        p.drawString(50, 700, f'Invoice Number: {invoice.id}')
        p.drawString(50, 680, f'Date: {invoice.created_at.strftime("%Y-%m-%d")}')
        p.drawString(50, 660, f'Due Date: {invoice.due_date.strftime("%Y-%m-%d")}')
        
        # Add member details
        p.drawString(50, 620, 'Member Details:')
        p.drawString(70, 600, f'Name: {invoice.member.full_name}')
        p.drawString(70, 580, f'Phone: {invoice.member.phone}')
        
        # Add amount
        p.setFont('Helvetica-Bold', 14)
        p.drawString(50, 520, f'Amount: ${invoice.amount}')
        p.drawString(50, 500, f'Status: {invoice.status.upper()}')
        
        p.showPage()
        p.save()
        
        # Get PDF value from buffer
        pdf = buffer.getvalue()
        buffer.close()
        
        # Create response
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.id}.pdf"'
        response.write(pdf)
        
        return response
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        total_invoices = Invoice.objects.count()
        total_amount = Invoice.objects.aggregate(total=Sum('amount'))['total'] or 0
        unpaid_amount = Invoice.objects.filter(
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Last 30 days statistics
        thirty_days_ago = timezone.now() - timedelta(days=30)
        invoices_30d = Invoice.objects.filter(created_at__gte=thirty_days_ago)
        total_amount_30d = invoices_30d.aggregate(total=Sum('amount'))['total'] or 0
        
        # Status breakdown
        status_counts = Invoice.objects.values('status').annotate(
            count=Count('id')
        )
        
        return Response({
            'total_invoices': total_invoices,
            'total_amount': total_amount,
            'unpaid_amount': unpaid_amount,
            'last_30_days': {
                'total_amount': total_amount_30d,
                'invoice_count': invoices_30d.count()
            },
            'status_breakdown': status_counts
        })
    
    @action(detail=False, methods=['post'])
    def bulk_status_update(self, request):
        invoice_ids = request.data.get('invoice_ids', [])
        new_status = request.data.get('status')
        
        if not invoice_ids or not new_status:
            return Response(
                {'error': 'Both invoice_ids and status are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated = Invoice.objects.filter(id__in=invoice_ids).update(status=new_status)
        
        return Response({
            'message': f'Updated {updated} invoices to status {new_status}'
        })
