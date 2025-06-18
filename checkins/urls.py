from django.urls import path
from .views import CheckInViewSet, RecentCheckInsView
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'checkins', CheckInViewSet)

urlpatterns = [
    path('recent/', RecentCheckInsView.as_view(), name='recent-checkins'),
] + router.urls 