from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone
from django.http import FileResponse
from django.conf import settings
import os
import tempfile
import zipfile
from datetime import datetime, timedelta
from weasyprint import HTML
from .models import Invoice, InvoiceTemplate, InvoiceItem
from .serializers import (
    InvoiceTemplateSerializer,
    InvoiceListSerializer,
    InvoiceDetailSerializer,
    CreateInvoiceSerializer,
    UpdateInvoiceSerializer,
)

class InvoiceTemplateViewSet(viewsets.ModelViewSet):
    queryset = InvoiceTemplate.objects.all()
    serializer_class = InvoiceTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['number', 'member__full_name', 'member__email']

    def get_serializer_class(self):
        if self.action == 'create':
            return CreateInvoiceSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateInvoiceSerializer
        elif self.action == 'retrieve':
            return InvoiceDetailSerializer
        return InvoiceListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Status filter
        status = self.request.query_params.get('status')
        if status and status != 'all':
            queryset = queryset.filter(status=status)

        # Date range filter
        date_range = self.request.query_params.get('dateRange')
        if date_range:
            today = timezone.now().date()
            if date_range == 'today':
                queryset = queryset.filter(created_at__date=today)
            elif date_range == 'week':
                week_ago = today - timedelta(days=7)
                queryset = queryset.filter(created_at__date__gte=week_ago)
            elif date_range == 'month':
                month_ago = today - timedelta(days=30)
                queryset = queryset.filter(created_at__date__gte=month_ago)
            elif date_range == 'custom':
                start_date = self.request.query_params.get('startDate')
                end_date = self.request.query_params.get('endDate')
                if start_date:
                    queryset = queryset.filter(created_at__date__gte=start_date)
                if end_date:
                    queryset = queryset.filter(created_at__date__lte=end_date)

        return queryset.select_related('member', 'template')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        
        # Calculate statistics
        stats = queryset.aggregate(
            total_amount=Sum('total'),
            paid_amount=Sum('total', filter={'status': 'paid'}),
            pending_amount=Sum('total', filter={'status': 'pending'}),
        )

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({
                'invoices': serializer.data,
                'totalAmount': float(stats['total_amount'] or 0),
                'paidAmount': float(stats['paid_amount'] or 0),
                'pendingAmount': float(stats['pending_amount'] or 0),
            })

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'invoices': serializer.data,
            'totalAmount': float(stats['total_amount'] or 0),
            'paidAmount': float(stats['paid_amount'] or 0),
            'pendingAmount': float(stats['pending_amount'] or 0),
        })

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        
        # Generate PDF if it doesn't exist
        if not invoice.pdf_path or not os.path.exists(invoice.pdf_path):
            # Render invoice template with context
            template = invoice.template
            context = {
                'invoice': {
                    'number': invoice.number,
                    'date': invoice.created_at.strftime('%Y-%m-%d'),
                    'dueDate': invoice.due_date.strftime('%Y-%m-%d'),
                },
                'member': {
                    'fullName': invoice.member.full_name,
                    'email': invoice.member.email,
                    'phone': invoice.member.phone,
                    'address': invoice.member.address,
                },
                'items': [{
                    'description': item.description,
                    'quantity': item.quantity,
                    'unitPrice': float(item.unit_price),
                    'total': float(item.total),
                } for item in invoice.items.all()],
                'subtotal': float(invoice.subtotal),
                'tax': float(invoice.tax),
                'total': float(invoice.total),
            }

            # Replace variables in template
            html_content = template.content
            for key, value in context['invoice'].items():
                html_content = html_content.replace('{{invoice.' + key + '}}', str(value))
            for key, value in context['member'].items():
                html_content = html_content.replace('{{member.' + key + '}}', str(value))

            # Create temporary file
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                # Generate PDF using WeasyPrint
                HTML(string=html_content).write_pdf(tmp.name)
                invoice.pdf_path = tmp.name
                invoice.save()

        # Return PDF file
        return FileResponse(
            open(invoice.pdf_path, 'rb'),
            content_type='application/pdf',
            filename=f'invoice_{invoice.number}.pdf'
        )

    @action(detail=False, methods=['post'])
    def bulk_pdf(self, request):
        invoice_ids = request.data.get('invoiceIds', [])
        invoices = self.get_queryset().filter(id__in=invoice_ids)

        # Create temporary zip file
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp:
            with zipfile.ZipFile(tmp.name, 'w') as archive:
                for invoice in invoices:
                    # Generate PDF for each invoice
                    response = self.pdf(request, pk=invoice.id)
                    archive.write(
                        invoice.pdf_path,
                        f'invoice_{invoice.number}.pdf'
                    )

            return FileResponse(
                open(tmp.name, 'rb'),
                content_type='application/zip',
                filename='invoices.zip'
            )

    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        date_range = request.query_params.get('dateRange')

        if date_range:
            today = timezone.now().date()
            if date_range == 'today':
                queryset = queryset.filter(created_at__date=today)
            elif date_range == 'week':
                week_ago = today - timedelta(days=7)
                queryset = queryset.filter(created_at__date__gte=week_ago)
            elif date_range == 'month':
                month_ago = today - timedelta(days=30)
                queryset = queryset.filter(created_at__date__gte=month_ago)

        stats = queryset.aggregate(
            total_count=Count('id'),
            total_amount=Sum('total'),
            paid_amount=Sum('total', filter={'status': 'paid'}),
            pending_amount=Sum('total', filter={'status': 'pending'}),
        )

        return Response({
            'totalCount': stats['total_count'] or 0,
            'totalAmount': float(stats['total_amount'] or 0),
            'paidAmount': float(stats['paid_amount'] or 0),
            'pendingAmount': float(stats['pending_amount'] or 0),
            'averageAmount': float(stats['total_amount'] or 0) / stats['total_count'] if stats['total_count'] else 0,
            'paymentRate': float(stats['paid_amount'] or 0) / float(stats['total_amount'] or 1) * 100 if stats['total_amount'] else 0,
        })
