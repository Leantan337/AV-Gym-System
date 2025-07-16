from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, InvoiceTemplateViewSet

router = DefaultRouter()
router.register(r'', InvoiceViewSet, basename='invoice')
router.register(r'templates', InvoiceTemplateViewSet, basename='invoice-template')

urlpatterns = [
    path('', include(router.urls)),
]