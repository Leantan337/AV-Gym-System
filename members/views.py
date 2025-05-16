from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from django.http import HttpResponse
from datetime import timedelta
import os
from .models import Member
from .serializers import MemberSerializer
from .services import IDCardGenerator
import tempfile

class MemberViewSet(viewsets.ModelViewSet):
    queryset = Member.objects.all()
    serializer_class = MemberSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = Member.objects.all()
        
        # Search by name or phone
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) |
                Q(phone__icontains=search)
            )
        
        # Filter by status
        status = self.request.query_params.get('status', None)
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by subscription status
        has_active_subscription = self.request.query_params.get('has_active_subscription', None)
        if has_active_subscription is not None:
            if has_active_subscription.lower() == 'true':
                queryset = queryset.filter(subscriptions__status='active').distinct()
            elif has_active_subscription.lower() == 'false':
                queryset = queryset.exclude(subscriptions__status='active')
        
        # Sort by
        sort_by = self.request.query_params.get('sort_by', None)
        if sort_by:
            if sort_by == 'name':
                queryset = queryset.order_by('full_name')
            elif sort_by == '-name':
                queryset = queryset.order_by('-full_name')
            elif sort_by == 'created':
                queryset = queryset.order_by('created_at')
            elif sort_by == '-created':
                queryset = queryset.order_by('-created_at')
        
        return queryset
        
    def get_serializer_context(self):
        """Add request to serializer context"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        total_members = Member.objects.count()
        active_members = Member.objects.filter(status='active').count()
        members_with_active_subscription = Member.objects.filter(
            subscriptions__status='active'
        ).distinct().count()
        
        # New members in last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        new_members_30d = Member.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()
        
        return Response({
            'total_members': total_members,
            'active_members': active_members,
            'members_with_active_subscription': members_with_active_subscription,
            'new_members_30d': new_members_30d
        })
    
    @action(detail=False, methods=['post'])
    def bulk_status_update(self, request):
        member_ids = request.data.get('member_ids', [])
        new_status = request.data.get('status')
        
        if not member_ids or not new_status:
            return Response(
                {'error': 'Both member_ids and status are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated = Member.objects.filter(id__in=member_ids).update(status=new_status)
        
        return Response({
            'message': f'Updated {updated} members to status {new_status}'
        })
    
    @action(detail=True, methods=['get'])
    def id_card(self, request, pk=None):
        """Generate and return a PDF ID card for the member"""
        member = self.get_object()
        
        try:
            # Generate the PDF content
            pdf_content = IDCardGenerator.generate_id_card_pdf(member)
            
            # Create a response with the PDF
            response = HttpResponse(pdf_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="id_card_{member.id}.pdf"'
            return response
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate ID card: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
