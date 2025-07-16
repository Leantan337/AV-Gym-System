from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    # Remove the problematic ManyToManyField declarations
    # AbstractUser already provides groups and user_permissions
    
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('staff', 'Staff'),
        ('trainer', 'Trainer'),
        ('member', 'Member'),
    ]

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    phone = models.CharField(max_length=15, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    emergency_contact = models.CharField(max_length=100, blank=True, null=True)
    emergency_phone = models.CharField(max_length=15, blank=True, null=True)
    
    class Meta:
        db_table = 'auth_user'

    def is_admin_role(self):
        return self.role == 'admin'

    def is_staff_role(self):
        return self.role == 'staff'

    def is_trainer_role(self):
        return self.role == 'trainer'

    def is_member_role(self):
        return self.role == 'member'
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"