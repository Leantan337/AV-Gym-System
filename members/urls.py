from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MemberViewSet
from .views_test import test_id_card

router = DefaultRouter()
router.register(r'', MemberViewSet, basename='member')

urlpatterns = [
    path('', include(router.urls)),
    # Test route for ID card preview
    path('test/id-card/', test_id_card, name='test-id-card'),
    path('test/id-card/<uuid:member_id>/', test_id_card, name='test-id-card-member'),
]
