from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Avg
from .models import CheckIn
from .serializers import CheckInSerializer

class CheckInViewSet(viewsets.ModelViewSet):
    queryset = CheckIn.objects.all()
    serializer_class = CheckInSerializer
    permission_classes = []  # Temporarily disabled for testing
    
    def get_queryset(self):
        queryset = CheckIn.objects.all()
        member_id = self.request.query_params.get('member', None)
        date = self.request.query_params.get('date', None)
        
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if date:
            queryset = queryset.filter(check_in_time__date=date)
            
        return queryset
    
    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        check_in = self.get_object()
        if check_in.check_out_time:
            return Response(
                {'error': 'Already checked out'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        check_in.check_out_time = timezone.now()
        check_in.save()
        serializer = self.get_serializer(check_in)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = timezone.now().date()
        currently_in = CheckIn.objects.filter(check_out_time__isnull=True).count()
        today_total = CheckIn.objects.filter(check_in_time__date=today).count()
        
        # Calculate average stay duration for checked-out visits
        checked_out = CheckIn.objects.filter(
            check_out_time__isnull=False
        ).exclude(
            check_in_time__date=today
        )
        avg_stay = 0
        if checked_out.exists():
            avg_stay = checked_out.annotate(
                duration=timezone.ExpressionWrapper(
                    timezone.F('check_out_time') - timezone.F('check_in_time'),
                    output_field=timezone.DurationField()
                )
            ).aggregate(avg=Avg('duration'))['avg']
            avg_stay = int(avg_stay.total_seconds() / 60) if avg_stay else 0

        return Response({
            'currentlyIn': currently_in,
            'todayTotal': today_total,
            'averageStayMinutes': avg_stay
        })
