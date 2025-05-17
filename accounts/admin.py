from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, UserRole


class CustomUserAdmin(UserAdmin):
    """Custom User admin with role-based access control."""
    
    model = User
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active')
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Personal Info'), {'fields': ('first_name', 'last_name', 'email', 'phone')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions', 'role'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'is_staff', 'is_active')}
        ),
    )
    search_fields = ('username', 'first_name', 'last_name', 'email')
    ordering = ('-date_joined',)
    filter_horizontal = ('groups', 'user_permissions',)
    readonly_fields = ('last_login', 'date_joined')

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if not request.user.is_superuser and request.user.role != UserRole.ADMIN:
            # Non-admin users can only see themselves and their subordinates
            if request.user.role == UserRole.MANAGER:
                return qs.filter(role__in=[UserRole.STAFF, UserRole.TRAINER, UserRole.FRONT_DESK])
            return qs.filter(id=request.user.id)
        return qs

    def has_change_permission(self, request, obj=None):
        if not obj:
            return True  # Allow access to user list view
        if request.user.is_superuser or request.user.role == UserRole.ADMIN:
            return True
        if obj == request.user:
            return True  # Users can edit their own profile
        # Managers can edit their subordinates
        if request.user.role == UserRole.MANAGER and obj.role in [UserRole.STAFF, UserRole.TRAINER, UserRole.FRONT_DESK]:
            return True
        return False


# Register the custom User model with the custom admin class
admin.site.register(User, CustomUserAdmin)
