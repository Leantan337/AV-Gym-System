from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,
)

from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    # JWT Authentication
    path('token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # User management
    path('', include(router.urls)),
    
    # Profile management
    path('me/', views.UserViewSet.as_view({'get': 'me'}), name='user-me'),
    path('me/change-password/', 
         views.UserViewSet.as_view({'post': 'set_password'}), 
         name='user-change-password'),
]
