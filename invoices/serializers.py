from rest_framework import serializers
from .models import Invoice

class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ['id', 'member', 'plan', 'amount', 'status', 'invoice_date', 'due_date', 'pdf_path', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
