from django.contrib.auth.models import AbstractUser, Group, Permission
from django.db import models
from django.utils.translation import gettext_lazy as _


class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', _('Administrator')
    MANAGER = 'MANAGER', _('Manager')
    STAFF = 'STAFF', _('Staff')
    TRAINER = 'TRAINER', _('Trainer')
    FRONT_DESK = 'FRONT_DESK', _('Front Desk')
