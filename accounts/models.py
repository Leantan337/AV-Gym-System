from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', _('Administrator')
    MANAGER = 'MANAGER', _('Manager')
    STAFF = 'STAFF', _('Staff')
    TRAINER = 'TRAINER', _('Trainer')
    FRONT_DESK = 'FRONT_DESK', _('Front Desk')


class User(AbstractUser):
    """Custom user model with role-based access control."""
    
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.STAFF,
        verbose_name=_('Role')
    )
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('Phone Number'))
    is_active = models.BooleanField(default=True, verbose_name=_('Active'))
    date_joined = models.DateTimeField(auto_now_add=True, verbose_name=_('Date Joined'))
    last_updated = models.DateTimeField(auto_now=True, verbose_name=_('Last Updated'))

    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN

    @property
    def is_manager(self):
        return self.role in [UserRole.ADMIN, UserRole.MANAGER]

    @property
    def is_trainer(self):
        return self.role in [UserRole.ADMIN, UserRole.MANAGER, UserRole.TRAINER]

    @property
    def is_front_desk(self):
        return self.role in [UserRole.ADMIN, UserRole.MANAGER, UserRole.FRONT_DESK]

    def has_perm(self, perm, obj=None):
        """Check if user has specific permission."""
        if self.is_admin:
            return True
        return super().has_perm(perm, obj)

    def has_module_perms(self, app_label):
        """Check if user has permissions to view the app."""
        if self.is_admin:
            return True
        return super().has_module_perms(app_label)
