"""
URL configuration for gymapp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import serve
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from members.views import MemberViewSet
from plans.views import MembershipPlanViewSet, MembershipSubscriptionViewSet
from checkins.views import CheckInViewSet
from invoices.views import InvoiceViewSet
from .views import dashboard_statistics
from .api import admin_dashboard_stats, bulk_member_action, bulk_invoice_action, member_stats
from .admin import gym_admin

# Import members URLs
from members import urls as members_urls

router = DefaultRouter()
router.register(r'plans', MembershipPlanViewSet)
router.register(r'subscriptions', MembershipSubscriptionViewSet)
router.register(r'checkins', CheckInViewSet)
router.register(r'invoices', InvoiceViewSet)

urlpatterns = [
    path('admin/', gym_admin.urls),
    path('api/', include(router.urls)),
    path('api/members/', include(members_urls)),
    path('api-auth/', include('rest_framework.urls')),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/dashboard/', dashboard_statistics, name='dashboard-stats'),
    # Admin API endpoints
    path('api/admin/stats/', admin_dashboard_stats, name='admin-dashboard-stats'),
    path('api/admin/bulk-member-action/', bulk_member_action, name='bulk-member-action'),
    path('api/admin/bulk-invoice-action/', bulk_invoice_action, name='bulk-invoice-action'),
    path('api/admin/member-stats/', member_stats, name='member-stats'),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += [
        path('media/<path:path>', serve, {'document_root': settings.MEDIA_ROOT}),
    ]
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
