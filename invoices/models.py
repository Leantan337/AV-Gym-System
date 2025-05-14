from django.db import models
import uuid
from members.models import Member
from plans.models import MembershipPlan

class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    member = models.ForeignKey(Member, on_delete=models.CASCADE, related_name='invoices')
    plan = models.ForeignKey(MembershipPlan, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('paid', 'Paid'),
        ('unpaid', 'Unpaid')
    ], default='unpaid')
    invoice_date = models.DateField()
    due_date = models.DateField()
    pdf_path = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.member.full_name} - {self.invoice_date}'
