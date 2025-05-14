from rest_framework import viewsets, permissions
from .models import MembershipPlan, MembershipSubscription
from .serializers import MembershipPlanSerializer, MembershipSubscriptionSerializer

class MembershipPlanViewSet(viewsets.ModelViewSet):
    queryset = MembershipPlan.objects.all()
    serializer_class = MembershipPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

class MembershipSubscriptionViewSet(viewsets.ModelViewSet):
    queryset = MembershipSubscription.objects.all()
    serializer_class = MembershipSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = MembershipSubscription.objects.all()
        member_id = self.request.query_params.get('member', None)
        status = self.request.query_params.get('status', None)
        
        if member_id:
            queryset = queryset.filter(member_id=member_id)
        if status:
            queryset = queryset.filter(status=status)
            
        return queryset
