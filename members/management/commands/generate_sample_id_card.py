import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from members.models import Member
from members.services import IDCardGenerator
from django.utils import timezone


class Command(BaseCommand):
    help = 'Generate a sample ID card for testing purposes'

    def handle(self, *args, **options):
        # Create a sample member if one doesn't exist
        member, created = Member.objects.get_or_create(
            full_name="John Doe",
            defaults={
                'phone': '+1234567890',
                'address': '123 Gym Street, Workout City',
                'status': 'active',
                'notes': 'Sample member for testing ID card generation',
            },
        )

        self.stdout.write(self.style.SUCCESS(f'Using member: {member.full_name} (ID: {member.id})'))

        try:
            # Generate the ID card PDF
            pdf_content = IDCardGenerator.generate_id_card_pdf(member)

            # Save the PDF to a file
            output_dir = os.path.join('media', 'id_cards')
            os.makedirs(output_dir, exist_ok=True)

            output_path = os.path.join(output_dir, f'id_card_{member.id}.pdf')
            with open(output_path, 'wb') as f:
                f.write(pdf_content)

            self.stdout.write(self.style.SUCCESS(f'Sample ID card generated at: {output_path}'))
            self.stdout.write(
                self.style.SUCCESS(f'You can access it at: /media/id_cards/id_card_{member.id}.pdf')
            )

        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Error generating ID card: {str(e)}'))
