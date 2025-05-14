from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import CheckIn
from .serializers import CheckInSerializer

class CheckInViewSet(viewsets.ModelViewSet):
    queryset = CheckIn.objects.all()
    serializer_class = CheckInSerializer
    permission_classes = [permissions.IsAuthenticated]
    
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
