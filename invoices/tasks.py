import logging
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from .models import Invoice, InvoiceTemplate, InvoiceItem
from plans.models import MembershipSubscription
from members.models import Member

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generate_daily_invoices(self):
    """
    Generate invoices for all members with due subscriptions
    This task runs daily to create invoices for billing cycles
    """
    try:
        today = timezone.now().date()
        generated_count = 0

        # Get all active subscriptions that are due for billing
        due_subscriptions = MembershipSubscription.objects.filter(
            status='active',
            end_date__lte=today + timedelta(days=7),  # Due within 7 days
        ).select_related('member', 'plan')

        logger.info(f"Found {due_subscriptions.count()} subscriptions due for billing")

        for subscription in due_subscriptions:
            try:
                with transaction.atomic():
                    # Check if invoice already exists for this billing cycle
                    existing_invoice = Invoice.objects.filter(
                        member=subscription.member,
                        created_at__date=today,
                        notes__icontains=f"Subscription: {subscription.id}",
                    ).first()

                    if existing_invoice:
                        logger.info(
                            f"Invoice already exists for member {subscription.member.full_name}"
                        )
                        continue

                    # Get default invoice template
                    try:
                        template = InvoiceTemplate.objects.first()
                        if not template:
                            template = InvoiceTemplate.objects.create(
                                name="Default Template",
                                content="<h1>Invoice</h1><p>Amount: ${amount}</p>",
                            )
                    except Exception as e:
                        logger.error(f"Error getting invoice template: {e}")
                        continue

                    # Create invoice
                    invoice = Invoice.objects.create(
                        member=subscription.member,
                        template=template,
                        subtotal=subscription.plan.price,
                        tax=0,  # No tax for now
                        total=subscription.plan.price,
                        status='pending',
                        due_date=today + timedelta(days=30),
                        notes=f"Auto-generated for subscription: {subscription.id}",
                    )

                    # Create invoice item
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        description=f"{subscription.plan.name} - {subscription.plan.duration_days} days",
                        quantity=1,
                        unit_price=subscription.plan.price,
                        total=subscription.plan.price,
                    )

                    generated_count += 1
                    logger.info(
                        f"Generated invoice {invoice.number} for {subscription.member.full_name}"
                    )

            except Exception as e:
                logger.error(
                    f"Error generating invoice for member {subscription.member.full_name}: {e}"
                )
                continue

        logger.info(f"Successfully generated {generated_count} invoices")
        return {
            'status': 'success',
            'generated_count': generated_count,
            'total_processed': due_subscriptions.count(),
        }

    except Exception as e:
        logger.error(f"Error in generate_daily_invoices task: {e}")
        # Retry the task
        raise self.retry(countdown=60, exc=e)


@shared_task(bind=True, max_retries=3)
def generate_invoice_for_member(self, member_id, plan_id, amount):
    """
    Generate a specific invoice for a member
    """
    try:
        member = Member.objects.get(id=member_id)
        subscription = MembershipSubscription.objects.get(
            member=member, plan_id=plan_id, status='active'
        )

        # Get default template
        template = InvoiceTemplate.objects.first()
        if not template:
            template = InvoiceTemplate.objects.create(
                name="Default Template", content="<h1>Invoice</h1><p>Amount: ${amount}</p>"
            )

        with transaction.atomic():
            invoice = Invoice.objects.create(
                member=member,
                template=template,
                subtotal=amount,
                tax=0,
                total=amount,
                status='pending',
                due_date=timezone.now().date() + timedelta(days=30),
                notes=f"Manual generation for subscription: {subscription.id}",
            )

            InvoiceItem.objects.create(
                invoice=invoice,
                description=f"{subscription.plan.name}",
                quantity=1,
                unit_price=amount,
                total=amount,
            )

        logger.info(f"Generated manual invoice {invoice.number} for {member.full_name}")
        return {
            'status': 'success',
            'invoice_id': str(invoice.id),
            'invoice_number': invoice.number,
        }

    except Exception as e:
        logger.error(f"Error generating manual invoice: {e}")
        raise self.retry(countdown=30, exc=e)


@shared_task(bind=True)
def process_overdue_invoices(self):
    """
    Process overdue invoices and send reminders
    """
    try:
        today = timezone.now().date()
        overdue_invoices = Invoice.objects.filter(
            status='pending', due_date__lt=today
        ).select_related('member')

        processed_count = 0

        for invoice in overdue_invoices:
            try:
                # Update status to overdue (you might want to add an 'overdue' status)
                invoice.notes += f"\nMarked as overdue on {today}"
                invoice.save()

                # Here you could send email notifications
                # send_overdue_notification.delay(invoice.id)

                processed_count += 1

            except Exception as e:
                logger.error(f"Error processing overdue invoice {invoice.number}: {e}")
                continue

        logger.info(f"Processed {processed_count} overdue invoices")
        return {'status': 'success', 'processed_count': processed_count}

    except Exception as e:
        logger.error(f"Error in process_overdue_invoices task: {e}")
        raise self.retry(countdown=300, exc=e)


@shared_task(bind=True)
def cleanup_old_invoices(self, days_old=365):
    """
    Archive or delete old invoices
    """
    try:
        cutoff_date = timezone.now().date() - timedelta(days=days_old)
        old_invoices = Invoice.objects.filter(
            created_at__date__lt=cutoff_date, status__in=['paid', 'cancelled']
        )

        count = old_invoices.count()
        old_invoices.delete()

        logger.info(f"Cleaned up {count} old invoices")
        return {'status': 'success', 'deleted_count': count}

    except Exception as e:
        logger.error(f"Error in cleanup_old_invoices task: {e}")
        raise self.retry(countdown=600, exc=e)
