from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, timedelta
from decimal import Decimal
import os
import tempfile
from PIL import Image

from members.models import Member
from plans.models import MembershipPlan
from authentication.models import User


class MemberModelTest(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='STAFF'
        )
        
        # Create a test plan
        self.plan = MembershipPlan.objects.create(
            name='Basic Plan',
            price=Decimal('29.99'),
            duration_days=30,
            billing_frequency='monthly'
        )
        
        # Create a test member
        self.member = Member.objects.create(
            membership_number='MEM001',
            full_name='John Doe',
            phone='+1234567890',
            address='123 Main St, City, State',
            status='active',
            notes='Test member'
        )

    def test_member_creation(self):
        """Test member creation with valid data"""
        self.assertEqual(self.member.membership_number, 'MEM001')
        self.assertEqual(self.member.full_name, 'John Doe')
        self.assertEqual(self.member.phone, '+1234567890')
        self.assertEqual(self.member.address, '123 Main St, City, State')
        self.assertEqual(self.member.status, 'active')
        self.assertEqual(self.member.notes, 'Test member')
        self.assertIsNotNone(self.member.created_at)
        self.assertIsNotNone(self.member.updated_at)

    def test_member_str_representation(self):
        """Test string representation of member"""
        self.assertEqual(str(self.member), 'John Doe')

    def test_member_unique_membership_number(self):
        """Test membership number uniqueness constraint"""
        # Try to create another member with the same membership number
        with self.assertRaises(Exception):  # IntegrityError or ValidationError
            Member.objects.create(
                membership_number='MEM001',  # Same membership number
                full_name='Jane Doe',
                phone='+1234567891',
                address='456 Oak St, City, State',
                status='active'
            )

    def test_member_image_upload(self):
        """Test member image upload functionality"""
        # Create a temporary image file
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
            # Create a simple test image
            image = Image.new('RGB', (100, 100), color='red')
            image.save(tmp_file.name, 'JPEG')
            
            # Test image upload
            with open(tmp_file.name, 'rb') as img_file:
                self.member.image.save('test_image.jpg', img_file, save=True)
            
            # Clean up temporary file
            os.unlink(tmp_file.name)
        
        # Verify image was saved
        self.assertIsNotNone(self.member.image)
        self.assertTrue(self.member.image.name.endswith('test_image.jpg'))

    def test_member_search(self):
        """Test member search functionality"""
        # Create additional test members
        Member.objects.create(
            membership_number='MEM002',
            full_name='Jane Smith',
            phone='+1234567891',
            address='456 Oak St, City, State',
            status='active'
        )
        
        Member.objects.create(
            membership_number='MEM003',
            full_name='Bob Johnson',
            phone='+1234567892',
            address='789 Pine St, City, State',
            status='inactive'
        )
        
        # Test search by full name
        results = Member.objects.filter(full_name__icontains='John')
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first(), self.member)
        
        # Test search by membership number
        results = Member.objects.filter(membership_number__icontains='MEM002')
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().full_name, 'Jane Smith')
        
        # Test search by status
        results = Member.objects.filter(status='active')
        self.assertEqual(results.count(), 2)
        
        results = Member.objects.filter(status='inactive')
        self.assertEqual(results.count(), 1)

    def test_member_status_choices(self):
        """Test member status field choices"""
        # Test valid status choices
        valid_statuses = ['active', 'inactive']
        
        for status in valid_statuses:
            member = Member(
                membership_number=f'MEM{status}',
                full_name=f'Test {status}',
                phone='+1234567890',
                address='Test Address',
                status=status
            )
            try:
                member.full_clean()
            except ValidationError:
                self.fail(f"Valid status '{status}' should not raise ValidationError")

    def test_member_clean_method(self):
        """Test member clean method for validation"""
        # Test valid member
        try:
            self.member.clean()
        except ValidationError:
            self.fail("Valid member should not raise ValidationError")
        
        # Test member with invalid data
        invalid_member = Member(
            membership_number='',
            full_name='',
            phone='',
            address='',
            status='invalid_status'
        )
        
        with self.assertRaises(ValidationError):
            invalid_member.clean()

    def test_member_save_method(self):
        """Test member save method"""
        # Test automatic field updates
        original_updated_at = self.member.updated_at
        timezone.sleep(1)  # Ensure time difference
        
        self.member.full_name = 'Updated Name'
        self.member.save()
        
        self.assertGreater(self.member.updated_at, original_updated_at)

    def test_member_ordering(self):
        """Test member model ordering"""
        # Create members with different creation dates
        member1 = Member.objects.create(
            membership_number='MEM004',
            full_name='Alice Brown',
            phone='+1234567893',
            address='Test Address 1',
            status='active'
        )
        
        member2 = Member.objects.create(
            membership_number='MEM005',
            full_name='Charlie Davis',
            phone='+1234567894',
            address='Test Address 2',
            status='active'
        )
        
        # Test ordering by created_at (newest first)
        members = Member.objects.all().order_by('-created_at')
        self.assertEqual(members[0], member2)  # Most recent
        self.assertEqual(members[1], member1)
        self.assertEqual(members[2], self.member)  # Oldest

    def test_member_deletion(self):
        """Test member deletion and related cleanup"""
        # Delete member
        member_id = self.member.id
        self.member.delete()
        
        # Verify member is deleted
        self.assertFalse(Member.objects.filter(id=member_id).exists())

    def test_member_verbose_names(self):
        """Test model verbose names"""
        self.assertEqual(Member._meta.verbose_name, 'Member')
        self.assertEqual(Member._meta.verbose_name_plural, 'Members')

    def test_member_field_verbose_names(self):
        """Test field verbose names"""
        field_names = {
            'membership_number': 'Membership Number',
            'full_name': 'Full Name',
            'phone': 'Phone',
            'address': 'Address',
            'status': 'Status',
            'image': 'Image',
            'notes': 'Notes',
            'created_at': 'Created At',
            'updated_at': 'Updated At'
        }
        
        for field_name, expected_verbose_name in field_names.items():
            field = Member._meta.get_field(field_name)
            self.assertEqual(field.verbose_name, expected_verbose_name)

    def test_member_user_relationship(self):
        """Test member user relationship"""
        # Test member without user
        self.assertIsNone(self.member.user)
        
        # Test member with user
        self.member.user = self.user
        self.member.save()
        
        self.assertEqual(self.member.user, self.user)
        self.assertEqual(self.user.member, self.member)

    def test_member_status_filtering(self):
        """Test member status filtering"""
        # Create members with different statuses
        active_member = Member.objects.create(
            membership_number='MEM006',
            full_name='Active Member',
            phone='+1234567895',
            address='Test Address',
            status='active'
        )
        
        inactive_member = Member.objects.create(
            membership_number='MEM007',
            full_name='Inactive Member',
            phone='+1234567896',
            address='Test Address',
            status='inactive'
        )
        
        # Test filtering by active status
        active_members = Member.objects.filter(status='active')
        self.assertEqual(active_members.count(), 2)  # Original member + active member
        
        inactive_members = Member.objects.filter(status='inactive')
        self.assertEqual(inactive_members.count(), 1)
        self.assertEqual(inactive_members.first().full_name, 'Inactive Member') 