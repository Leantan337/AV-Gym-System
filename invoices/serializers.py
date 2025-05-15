from rest_framework import serializers
from members.serializers import MemberSerializer
from .models import Invoice, InvoiceTemplate, InvoiceItem

class InvoiceTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceTemplate
        fields = ['id', 'name', 'description', 'content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class InvoiceItemSerializer(serializers.ModelSerializer):
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'total']
        read_only_fields = ['id', 'total']

class InvoiceListSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)
    template = InvoiceTemplateSerializer(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'number', 'member', 'template', 'subtotal', 'tax',
            'total', 'status', 'notes', 'due_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'number', 'subtotal', 'total', 'created_at', 'updated_at']

class InvoiceDetailSerializer(serializers.ModelSerializer):
    member = MemberSerializer(read_only=True)
    template = InvoiceTemplateSerializer(read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'number', 'member', 'template', 'items', 'subtotal', 'tax',
            'total', 'status', 'notes', 'due_date', 'pdf_path', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'number', 'subtotal', 'total', 'created_at', 'updated_at']

class CreateInvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)

    class Meta:
        model = Invoice
        fields = ['member', 'template', 'items', 'tax', 'notes', 'due_date']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        invoice = Invoice.objects.create(**validated_data)

        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)

        return invoice

class UpdateInvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)

    class Meta:
        model = Invoice
        fields = ['items', 'tax', 'notes', 'due_date', 'status']

    def update(self, instance, validated_data):
        if 'items' in validated_data:
            items_data = validated_data.pop('items')
            instance.items.all().delete()
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)

        return super().update(instance, validated_data)
