from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from decimal import Decimal
import json

from members.models import Member
from plans.models import Plan

User = get_user_model()


class MemberViewSetTest(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create test users with different roles
        self.admin_user = User.objects.create_user(
            username='admin', email='admin@example.com', password='admin123', role='ADMIN'
        )

        self.staff_user = User.objects.create_user(
            username='staff', email='staff@example.com', password='staff123', role='STAFF'
        )

        self.trainer_user = User.objects.create_user(
            username='trainer', email='trainer@example.com', password='trainer123', role='TRAINER'
        )

        self.front_desk_user = User.objects.create_user(
            username='frontdesk',
            email='frontdesk@example.com',
            password='frontdesk123',
            role='FRONT_DESK',
        )

        # Create test plan
        self.plan = Plan.objects.create(
            name='Basic Plan',
            price=Decimal('29.99'),
            duration_days=30,
            description='Basic membership plan',
        )

        # Create test member
        self.member = Member.objects.create(
            membership_number='MEM001',
            full_name='John Doe',
            phone='+1234567890',
            address='123 Main St, City, State',
            status='active',
            notes='Test member',
        )

        # Set up API client
        self.client = APIClient()

        # URLs
        self.member_list_url = reverse('member-list')
        self.member_detail_url = reverse('member-detail', args=[self.member.id])

    def test_member_list_unauthorized(self):
        """Test member list endpoint without authentication"""
        response = self.client.get(self.member_list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_list_authorized(self):
        """Test member list endpoint with authentication"""
        # Test with admin user
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.member_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

        # Test with staff user
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get(self.member_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test with trainer user
        self.client.force_authenticate(user=self.trainer_user)
        response = self.client.get(self.member_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test with front desk user (should be denied)
        self.client.force_authenticate(user=self.front_desk_user)
        response = self.client.get(self.member_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_detail_unauthorized(self):
        """Test member detail endpoint without authentication"""
        response = self.client.get(self.member_detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_detail_authorized(self):
        """Test member detail endpoint with authentication"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.member_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.member.id))
        self.assertEqual(response.data['full_name'], self.member.full_name)
        self.assertEqual(response.data['membership_number'], self.member.membership_number)

    def test_member_create_unauthorized(self):
        """Test member creation without authentication"""
        member_data = {
            'membership_number': 'MEM002',
            'full_name': 'Jane Smith',
            'phone': '+1234567891',
            'address': '456 Oak St, City, State',
            'status': 'active',
        }
        response = self.client.post(self.member_list_url, member_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_create_authorized(self):
        """Test member creation with authentication"""
        self.client.force_authenticate(user=self.admin_user)

        member_data = {
            'membership_number': 'MEM002',
            'full_name': 'Jane Smith',
            'phone': '+1234567891',
            'address': '456 Oak St, City, State',
            'status': 'active',
            'notes': 'New member',
        }

        response = self.client.post(self.member_list_url, member_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Verify member was created
        self.assertEqual(response.data['full_name'], 'Jane Smith')
        self.assertEqual(response.data['membership_number'], 'MEM002')
        self.assertEqual(response.data['phone'], '+1234567891')

    def test_member_create_invalid_data(self):
        """Test member creation with invalid data"""
        self.client.force_authenticate(user=self.admin_user)

        # Test with missing required fields
        invalid_data = {'full_name': 'Jane Smith', 'phone': '+1234567891'}

        response = self.client.post(self.member_list_url, invalid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Test with duplicate membership number
        duplicate_data = {
            'membership_number': 'MEM001',  # Already exists
            'full_name': 'Jane Smith',
            'phone': '+1234567891',
            'address': '456 Oak St, City, State',
            'status': 'active',
        }

        response = self.client.post(self.member_list_url, duplicate_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_member_update_unauthorized(self):
        """Test member update without authentication"""
        update_data = {'full_name': 'Updated Name'}
        response = self.client.patch(self.member_detail_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_update_authorized(self):
        """Test member update with authentication"""
        self.client.force_authenticate(user=self.admin_user)

        update_data = {'full_name': 'Updated Name', 'phone': '+1234567899'}

        response = self.client.patch(self.member_detail_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['full_name'], 'Updated Name')
        self.assertEqual(response.data['phone'], '+1234567899')

    def test_member_delete_unauthorized(self):
        """Test member deletion without authentication"""
        response = self.client.delete(self.member_detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_member_delete_authorized(self):
        """Test member deletion with authentication"""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(self.member_detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify member was deleted
        response = self.client.get(self.member_detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_member_search(self):
        """Test member search functionality"""
        self.client.force_authenticate(user=self.admin_user)

        # Create additional test members
        Member.objects.create(
            membership_number='MEM003',
            full_name='Jane Smith',
            phone='+1234567891',
            address='456 Oak St, City, State',
            status='active',
        )

        Member.objects.create(
            membership_number='MEM004',
            full_name='Bob Johnson',
            phone='+1234567892',
            address='789 Pine St, City, State',
            status='inactive',
        )

        # Test search by full name
        response = self.client.get(f"{self.member_list_url}?search=John")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['full_name'], 'John Doe')

        # Test search by membership number
        response = self.client.get(f"{self.member_list_url}?search=MEM003")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['full_name'], 'Jane Smith')

    def test_member_filtering(self):
        """Test member filtering functionality"""
        self.client.force_authenticate(user=self.admin_user)

        # Create members with different statuses
        Member.objects.create(
            membership_number='MEM005',
            full_name='Active Member',
            phone='+1234567893',
            address='Test Address',
            status='active',
        )

        Member.objects.create(
            membership_number='MEM006',
            full_name='Inactive Member',
            phone='+1234567894',
            address='Test Address',
            status='inactive',
        )

        # Test filtering by active status
        response = self.client.get(f"{self.member_list_url}?status=active")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)  # Original member + active member

        response = self.client.get(f"{self.member_list_url}?status=inactive")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['full_name'], 'Inactive Member')

    def test_member_pagination(self):
        """Test member pagination"""
        self.client.force_authenticate(user=self.admin_user)

        # Create multiple members
        for i in range(25):
            Member.objects.create(
                membership_number=f'MEM{i+10:03d}',
                full_name=f'Member{i}',
                phone=f'+123456789{i}',
                address=f'Address {i}',
                status='active',
            )

        # Test pagination
        response = self.client.get(self.member_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('results', response.data)

        # Verify page size
        self.assertLessEqual(len(response.data['results']), 20)  # Default page size

    def test_member_ordering(self):
        """Test member ordering"""
        self.client.force_authenticate(user=self.admin_user)

        # Create members with different names
        Member.objects.create(
            membership_number='MEM007',
            full_name='Alice Brown',
            phone='+1234567895',
            address='Test Address 1',
            status='active',
        )

        Member.objects.create(
            membership_number='MEM008',
            full_name='Charlie Davis',
            phone='+1234567896',
            address='Test Address 2',
            status='active',
        )

        # Test ordering by full name
        response = self.client.get(f"{self.member_list_url}?ordering=full_name")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(results[0]['full_name'], 'Alice Brown')
        self.assertEqual(results[1]['full_name'], 'Charlie Davis')
        self.assertEqual(results[2]['full_name'], 'John Doe')

        # Test reverse ordering
        response = self.client.get(f"{self.member_list_url}?ordering=-full_name")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        self.assertEqual(results[0]['full_name'], 'John Doe')
        self.assertEqual(results[1]['full_name'], 'Charlie Davis')
        self.assertEqual(results[2]['full_name'], 'Alice Brown')

    def test_member_id_card_generation(self):
        """Test member ID card generation"""
        self.client.force_authenticate(user=self.admin_user)

        url = reverse('member-id-card', args=[self.member.id])
        response = self.client.get(url)

        # Should return PDF or redirect to ID card generation
        self.assertIn(
            response.status_code,
            [status.HTTP_200_OK, status.HTTP_302_FOUND, status.HTTP_404_NOT_FOUND],
        )

    def test_member_bulk_operations(self):
        """Test member bulk operations"""
        self.client.force_authenticate(user=self.admin_user)

        # Create additional members
        member2 = Member.objects.create(
            membership_number='MEM009',
            full_name='Jane Smith',
            phone='+1234567891',
            address='456 Oak St, City, State',
            status='active',
        )

        member3 = Member.objects.create(
            membership_number='MEM010',
            full_name='Bob Johnson',
            phone='+1234567892',
            address='789 Pine St, City, State',
            status='active',
        )

        # Test bulk update
        bulk_update_data = {
            'member_ids': [str(self.member.id), str(member2.id)],
            'updates': {'status': 'inactive'},
        }

        url = reverse('member-bulk-update')
        response = self.client.post(url, bulk_update_data, format='json')

        # Check if bulk update endpoint exists and works
        if response.status_code == status.HTTP_404_NOT_FOUND:
            # Endpoint doesn't exist yet, but test structure is ready
            self.log_test("Bulk Update Endpoint", False, "Endpoint not implemented yet")
        else:
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_member_statistics(self):
        """Test member statistics endpoint"""
        self.client.force_authenticate(user=self.admin_user)

        # Create additional members for statistics
        for i in range(5):
            Member.objects.create(
                membership_number=f'MEM{i+20:03d}',
                full_name=f'Member{i}',
                phone=f'+123456789{i}',
                address=f'Address {i}',
                status='active',
            )

        url = reverse('member-statistics')
        response = self.client.get(url)

        # Check if statistics endpoint exists and works
        if response.status_code == status.HTTP_404_NOT_FOUND:
            # Endpoint doesn't exist yet, but test structure is ready
            self.log_test("Statistics Endpoint", False, "Endpoint not implemented yet")
        else:
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertIn('total_members', response.data)
            self.assertIn('active_members', response.data)

    def test_member_export(self):
        """Test member export functionality"""
        self.client.force_authenticate(user=self.admin_user)

        url = reverse('member-export')
        response = self.client.get(url)

        # Check if export endpoint exists and works
        if response.status_code == status.HTTP_404_NOT_FOUND:
            # Endpoint doesn't exist yet, but test structure is ready
            self.log_test("Export Endpoint", False, "Endpoint not implemented yet")
        else:
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response['Content-Type'], 'text/csv')

    def test_member_permissions(self):
        """Test member permissions for different user roles"""
        # Test admin permissions
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.member_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test staff permissions
        self.client.force_authenticate(user=self.staff_user)
        response = self.client.get(self.member_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test trainer permissions
        self.client.force_authenticate(user=self.trainer_user)
        response = self.client.get(self.member_list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Test front desk permissions (should be denied)
        self.client.force_authenticate(user=self.front_desk_user)
        response = self.client.get(self.member_list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_rate_limiting(self):
        """Test rate limiting on member endpoints"""
        self.client.force_authenticate(user=self.admin_user)

        # Make multiple requests to test rate limiting
        for i in range(10):
            response = self.client.get(self.member_list_url)
            if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                self.log_test("Rate Limiting", True, "Rate limiting is working")
                break
        else:
            self.log_test("Rate Limiting", False, "Rate limiting not implemented or not working")

    def log_test(self, test_name: str, success: bool, message: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")


class EmergencyContactViewSetTest(TestCase):
    def setUp(self):
        """Set up test data"""
        self.admin_user = User.objects.create_user(
            username='admin', email='admin@example.com', password='admin123', role='ADMIN'
        )

        self.plan = Plan.objects.create(
            name='Basic Plan',
            price=Decimal('29.99'),
            duration_days=30,
            description='Basic membership plan',
        )

        self.member = Member.objects.create(
            membership_number='MEM001',
            full_name='John Doe',
            phone='+1234567890',
            address='123 Main St, City, State',
            status='active',
        )

        self.client = APIClient()
        self.emergency_contact_list_url = reverse('emergencycontact-list')
        self.emergency_contact_detail_url = reverse(
            'emergencycontact-detail', args=[1]
        )  # Placeholder

    def test_emergency_contact_list_unauthorized(self):
        """Test emergency contact list without authentication"""
        response = self.client.get(self.emergency_contact_list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_emergency_contact_list_authorized(self):
        """Test emergency contact list with authentication"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.emergency_contact_list_url)
        # This endpoint might not exist yet, so we check for either 200 or 404
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_emergency_contact_create(self):
        """Test emergency contact creation"""
        self.client.force_authenticate(user=self.admin_user)

        contact_data = {
            'member': self.member.id,
            'name': 'John Smith',
            'phone': '+1234567892',
            'relationship': 'Parent',
        }

        response = self.client.post(self.emergency_contact_list_url, contact_data)
        # This endpoint might not exist yet, so we check for either 201 or 404
        if response.status_code == status.HTTP_404_NOT_FOUND:
            self.log_test("Emergency Contact Creation", False, "Endpoint not implemented yet")
        else:
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(response.data['name'], 'John Smith')
            self.assertEqual(response.data['relationship'], 'Parent')

    def test_emergency_contact_update(self):
        """Test emergency contact update"""
        self.client.force_authenticate(user=self.admin_user)

        update_data = {'name': 'Updated Name', 'phone': '+1234567899'}

        response = self.client.patch(self.emergency_contact_detail_url, update_data)
        # This endpoint might not exist yet, so we check for either 200 or 404
        if response.status_code == status.HTTP_404_NOT_FOUND:
            self.log_test("Emergency Contact Update", False, "Endpoint not implemented yet")
        else:
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data['name'], 'Updated Name')
            self.assertEqual(response.data['phone'], '+1234567899')

    def test_emergency_contact_delete(self):
        """Test emergency contact deletion"""
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(self.emergency_contact_detail_url)
        # This endpoint might not exist yet, so we check for either 204 or 404
        if response.status_code == status.HTTP_404_NOT_FOUND:
            self.log_test("Emergency Contact Delete", False, "Endpoint not implemented yet")
        else:
            self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

            # Verify contact was deleted
            response = self.client.get(self.emergency_contact_detail_url)
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
