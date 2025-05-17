from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotificationTemplateViewSet,
    NotificationSettingViewSet,
    NotificationLogViewSet,
    ExpiryNotificationQueueViewSet,
    DashboardNotificationsViewSet
)

router = DefaultRouter()
router.register(r'templates', NotificationTemplateViewSet)
router.register(r'settings', NotificationSettingViewSet)
router.register(r'logs', NotificationLogViewSet)
router.register(r'queue', ExpiryNotificationQueueViewSet)
router.register(r'dashboard', DashboardNotificationsViewSet, basename='dashboard-notifications')

urlpatterns = [
    path('', include(router.urls)),
]
