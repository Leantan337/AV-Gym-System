from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='auth_user_set',
        blank=True,
        help_text='The groups this user belongs to.'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='auth_user_set',
        blank=True,
        help_text='Specific permissions for this user.'
    )
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('staff', 'Staff'),
        ('trainer', 'Trainer'),
        ('member', 'Member'),
    ]
    
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default='member'
    )
    
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
# Create your models here.
