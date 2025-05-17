from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from .models import UserRole
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    CustomTokenObtainPairSerializer
)
from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone

User = get_user_model()


class IsAdminUser(permissions.BasePermission):
    """Allows access only to admin users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and 
                  (request.user.is_superuser or request.user.role == UserRole.ADMIN))


class IsManagerOrAdmin(permissions.BasePermission):
    """Allows access to managers and admins."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or request.user.role in [UserRole.ADMIN, UserRole.MANAGER]


class IsSelfOrAdmin(permissions.BasePermission):
    """Allow users to edit their own profile, admins to edit any."""
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        return obj == request.user or request.user.is_superuser or request.user.role == UserRole.ADMIN


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.action in ['create', 'list']:
            permission_classes = [IsAuthenticated, IsAdminUser]
        elif self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, IsSelfOrAdmin | IsAdminUser]
        elif self.action == 'me':
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsAdminUser]
            
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        Filter users based on role hierarchy.
        """
        user = self.request.user
        queryset = super().get_queryset()
        
        if not user.is_authenticated:
            return User.objects.none()
            
        if user.is_superuser or user.role == UserRole.ADMIN:
            return queryset
            
        if user.role == UserRole.MANAGER:
            return queryset.filter(role__in=[
                UserRole.STAFF, 
                UserRole.TRAINER, 
                UserRole.FRONT_DESK
            ])
            
        # Regular users can only see themselves
        return queryset.filter(id=user.id)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Return the current user's profile.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """
        Set a new password for a user.
        """
        user = self.get_object()
        if not request.user.is_superuser and request.user.role != UserRole.ADMIN and user != request.user:
            return Response(
                {"detail": "You do not have permission to perform this action."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"status": "password set"})
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom token obtain view that includes user details in the response.
    """
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            user = User.objects.get(username=request.data.get('username'))
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
        return response
