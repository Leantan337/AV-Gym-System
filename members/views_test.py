from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from .models import Member
from .services import IDCardGenerator

def test_id_card(request, member_id=None):
    """
    Test view to generate and download the ID card as PDF
    
    Args:
        request: The HTTP request
        member_id: Optional member ID. If not provided, a test member will be created.
    """
    # Get an existing member or create a test one
    if member_id:
        member = get_object_or_404(Member, id=member_id)
    else:
        member, created = Member.objects.get_or_create(
            id='00000000-0000-0000-0000-000000000001',
            defaults={
                'full_name': 'John Doe',
                'phone': '+1234567890',
                'address': '123 Gym Street, Workout City',
                'status': 'active',
            }
        )
    
    try:
        # Generate the PDF
        pdf_content = IDCardGenerator.generate_id_card_pdf(member)
        
        # Create the response
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="id_card_{member.id}.pdf"'
        return response
        
    except Exception as e:
        return HttpResponse(f"Error generating ID card: {str(e)}", status=500)
