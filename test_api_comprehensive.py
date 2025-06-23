#!/usr/bin/env python3
"""
Comprehensive API Testing Suite for AV Gym System
Tests all major endpoints with authentication, error handling, and edge cases.
"""

import os
import sys
import json
import time
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"


class APITestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.auth_tokens = {}
        self.test_data = {}

    def log_test(self, test_name: str, success: bool, message: str = "", data: Any = None):
        """Log test results with timestamp"""
        result = {
            "test_name": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "data": data,
        }
        self.test_results.append(result)

        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")

    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests

        print("\n" + "=" * 60)
        print("🧪 COMPREHENSIVE API TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print("=" * 60)

        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test_name']}: {result['message']}")

        # Save results to file
        with open("api_test_results.json", "w") as f:
            json.dump(self.test_results, f, indent=2)
        print(f"\n📄 Detailed results saved to: api_test_results.json")

    def test_health_check(self):
        """Test basic health check endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/health/")
            if response.status_code == 200:
                self.log_test("Health Check", True, "Server is healthy")
            else:
                self.log_test("Health Check", False, f"Unexpected status: {response.status_code}")
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")

    def test_authentication_flow(self):
        """Test complete authentication flow"""
        print("\n🔐 Testing Authentication Flow...")

        # Test user registration
        register_data = {
            "username": f"testuser_{int(time.time())}",
            "email": f"testuser_{int(time.time())}@example.com",
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "role": "STAFF",
        }

        try:
            response = self.session.post(f"{API_BASE}/auth/register/", json=register_data)
            if response.status_code in [201, 400]:  # 400 if user already exists
                self.log_test("User Registration", True, "Registration endpoint working")
                self.test_data["username"] = register_data["username"]
                self.test_data["password"] = register_data["password"]
            else:
                self.log_test(
                    "User Registration", False, f"Unexpected status: {response.status_code}"
                )
        except Exception as e:
            self.log_test("User Registration", False, f"Error: {str(e)}")

        # Test login
        login_data = {
            "username": self.test_data.get("username", "admin"),
            "password": self.test_data.get("password", "admin123"),
        }

        try:
            response = self.session.post(f"{API_BASE}/auth/login/", json=login_data)
            if response.status_code == 200:
                data = response.json()
                if "access" in data and "refresh" in data:
                    self.auth_tokens["access"] = data["access"]
                    self.auth_tokens["refresh"] = data["refresh"]
                    self.log_test("User Login", True, "Login successful")
                else:
                    self.log_test("User Login", False, "Missing tokens in response")
            else:
                self.log_test("User Login", False, f"Login failed: {response.status_code}")
        except Exception as e:
            self.log_test("User Login", False, f"Error: {str(e)}")

        # Test token refresh
        if self.auth_tokens.get("refresh"):
            try:
                response = self.session.post(
                    f"{API_BASE}/auth/refresh/", json={"refresh": self.auth_tokens["refresh"]}
                )
                if response.status_code == 200:
                    data = response.json()
                    if "access" in data:
                        self.auth_tokens["access"] = data["access"]
                        self.log_test("Token Refresh", True, "Token refreshed successfully")
                    else:
                        self.log_test("Token Refresh", False, "Missing access token")
                else:
                    self.log_test("Token Refresh", False, f"Refresh failed: {response.status_code}")
            except Exception as e:
                self.log_test("Token Refresh", False, f"Error: {str(e)}")

    def test_password_reset_flow(self):
        """Test password reset functionality"""
        print("\n🔑 Testing Password Reset Flow...")

        # Test password reset request
        reset_data = {"email": "admin@example.com"}

        try:
            response = self.session.post(f"{API_BASE}/auth/password-reset/", json=reset_data)
            if response.status_code in [200, 400]:  # 400 if email doesn't exist
                self.log_test("Password Reset Request", True, "Reset request processed")
            else:
                self.log_test(
                    "Password Reset Request", False, f"Unexpected status: {response.status_code}"
                )
        except Exception as e:
            self.log_test("Password Reset Request", False, f"Error: {str(e)}")

    def test_member_management(self):
        """Test member management endpoints"""
        print("\n👥 Testing Member Management...")

        if not self.auth_tokens.get("access"):
            self.log_test("Member Management", False, "No authentication token")
            return

        headers = {"Authorization": f"Bearer {self.auth_tokens['access']}"}

        # Test member creation
        member_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": f"john.doe.{int(time.time())}@example.com",
            "phone": "+1234567890",
            "date_of_birth": "1990-01-01",
            "membership_plan": 1,
            "emergency_contact": {
                "name": "Jane Doe",
                "phone": "+1234567891",
                "relationship": "Spouse",
            },
        }

        try:
            response = self.session.post(f"{API_BASE}/members/", json=member_data, headers=headers)
            if response.status_code == 201:
                data = response.json()
                self.test_data["member_id"] = data["id"]
                self.log_test("Member Creation", True, f"Member created with ID: {data['id']}")
            else:
                self.log_test("Member Creation", False, f"Creation failed: {response.status_code}")
        except Exception as e:
            self.log_test("Member Creation", False, f"Error: {str(e)}")

        # Test member retrieval
        if self.test_data.get("member_id"):
            try:
                response = self.session.get(
                    f"{API_BASE}/members/{self.test_data['member_id']}/", headers=headers
                )
                if response.status_code == 200:
                    self.log_test("Member Retrieval", True, "Member retrieved successfully")
                else:
                    self.log_test(
                        "Member Retrieval", False, f"Retrieval failed: {response.status_code}"
                    )
            except Exception as e:
                self.log_test("Member Retrieval", False, f"Error: {str(e)}")

        # Test member list
        try:
            response = self.session.get(f"{API_BASE}/members/", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Member List", True, f"Retrieved {len(data.get('results', []))} members"
                )
            else:
                self.log_test("Member List", False, f"List failed: {response.status_code}")
        except Exception as e:
            self.log_test("Member List", False, f"Error: {str(e)}")

    def test_checkin_management(self):
        """Test check-in management endpoints"""
        print("\n✅ Testing Check-in Management...")

        if not self.auth_tokens.get("access"):
            self.log_test("Check-in Management", False, "No authentication token")
            return

        headers = {"Authorization": f"Bearer {self.auth_tokens['access']}"}

        # Test check-in creation
        if self.test_data.get("member_id"):
            checkin_data = {
                "member": self.test_data["member_id"],
                "location": "Main Gym",
                "notes": "Test check-in",
            }

            try:
                response = self.session.post(
                    f"{API_BASE}/checkins/", json=checkin_data, headers=headers
                )
                if response.status_code == 201:
                    data = response.json()
                    self.test_data["checkin_id"] = data["id"]
                    self.log_test(
                        "Check-in Creation", True, f"Check-in created with ID: {data['id']}"
                    )
                else:
                    self.log_test(
                        "Check-in Creation", False, f"Creation failed: {response.status_code}"
                    )
            except Exception as e:
                self.log_test("Check-in Creation", False, f"Error: {str(e)}")

        # Test check-in list
        try:
            response = self.session.get(f"{API_BASE}/checkins/", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Check-in List", True, f"Retrieved {len(data.get('results', []))} check-ins"
                )
            else:
                self.log_test("Check-in List", False, f"List failed: {response.status_code}")
        except Exception as e:
            self.log_test("Check-in List", False, f"Error: {str(e)}")

    def test_invoice_management(self):
        """Test invoice management endpoints"""
        print("\n💰 Testing Invoice Management...")

        if not self.auth_tokens.get("access"):
            self.log_test("Invoice Management", False, "No authentication token")
            return

        headers = {"Authorization": f"Bearer {self.auth_tokens['access']}"}

        # Test invoice creation
        invoice_data = {
            "member": self.test_data.get("member_id", 1),
            "amount": 99.99,
            "description": "Monthly membership fee",
            "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
            "status": "PENDING",
        }

        try:
            response = self.session.post(
                f"{API_BASE}/invoices/", json=invoice_data, headers=headers
            )
            if response.status_code == 201:
                data = response.json()
                self.test_data["invoice_id"] = data["id"]
                self.log_test("Invoice Creation", True, f"Invoice created with ID: {data['id']}")
            else:
                self.log_test("Invoice Creation", False, f"Creation failed: {response.status_code}")
        except Exception as e:
            self.log_test("Invoice Creation", False, f"Error: {str(e)}")

        # Test invoice list
        try:
            response = self.session.get(f"{API_BASE}/invoices/", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Invoice List", True, f"Retrieved {len(data.get('results', []))} invoices"
                )
            else:
                self.log_test("Invoice List", False, f"List failed: {response.status_code}")
        except Exception as e:
            self.log_test("Invoice List", False, f"Error: {str(e)}")

    def test_notification_management(self):
        """Test notification management endpoints"""
        print("\n🔔 Testing Notification Management...")

        if not self.auth_tokens.get("access"):
            self.log_test("Notification Management", False, "No authentication token")
            return

        headers = {"Authorization": f"Bearer {self.auth_tokens['access']}"}

        # Test notification creation
        notification_data = {
            "title": "Test Notification",
            "message": "This is a test notification",
            "notification_type": "INFO",
            "recipients": [self.test_data.get("member_id", 1)],
        }

        try:
            response = self.session.post(
                f"{API_BASE}/notifications/", json=notification_data, headers=headers
            )
            if response.status_code == 201:
                data = response.json()
                self.test_data["notification_id"] = data["id"]
                self.log_test(
                    "Notification Creation", True, f"Notification created with ID: {data['id']}"
                )
            else:
                self.log_test(
                    "Notification Creation", False, f"Creation failed: {response.status_code}"
                )
        except Exception as e:
            self.log_test("Notification Creation", False, f"Error: {str(e)}")

        # Test notification list
        try:
            response = self.session.get(f"{API_BASE}/notifications/", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Notification List",
                    True,
                    f"Retrieved {len(data.get('results', []))} notifications",
                )
            else:
                self.log_test("Notification List", False, f"List failed: {response.status_code}")
        except Exception as e:
            self.log_test("Notification List", False, f"Error: {str(e)}")

    def test_report_management(self):
        """Test report management endpoints"""
        print("\n📊 Testing Report Management...")

        if not self.auth_tokens.get("access"):
            self.log_test("Report Management", False, "No authentication token")
            return

        headers = {"Authorization": f"Bearer {self.auth_tokens['access']}"}

        # Test report generation
        report_data = {
            "report_type": "MEMBER_SUMMARY",
            "parameters": {
                "start_date": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
                "end_date": datetime.now().strftime("%Y-%m-%d"),
            },
        }

        try:
            response = self.session.post(
                f"{API_BASE}/reports/generate/", json=report_data, headers=headers
            )
            if response.status_code in [200, 201, 202]:  # Various success statuses
                self.log_test("Report Generation", True, "Report generation initiated")
            else:
                self.log_test(
                    "Report Generation", False, f"Generation failed: {response.status_code}"
                )
        except Exception as e:
            self.log_test("Report Generation", False, f"Error: {str(e)}")

        # Test report list
        try:
            response = self.session.get(f"{API_BASE}/reports/", headers=headers)
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Report List", True, f"Retrieved {len(data.get('results', []))} reports"
                )
            else:
                self.log_test("Report List", False, f"List failed: {response.status_code}")
        except Exception as e:
            self.log_test("Report List", False, f"Error: {str(e)}")

    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n⚠️ Testing Error Handling...")

        # Test invalid authentication
        try:
            response = self.session.get(
                f"{API_BASE}/members/", headers={"Authorization": "Bearer invalid_token"}
            )
            if response.status_code == 401:
                self.log_test("Invalid Authentication", True, "Properly rejected invalid token")
            else:
                self.log_test(
                    "Invalid Authentication", False, f"Expected 401, got {response.status_code}"
                )
        except Exception as e:
            self.log_test("Invalid Authentication", False, f"Error: {str(e)}")

        # Test missing authentication
        try:
            response = self.session.get(f"{API_BASE}/members/")
            if response.status_code == 401:
                self.log_test("Missing Authentication", True, "Properly rejected missing token")
            else:
                self.log_test(
                    "Missing Authentication", False, f"Expected 401, got {response.status_code}"
                )
        except Exception as e:
            self.log_test("Missing Authentication", False, f"Error: {str(e)}")

        # Test invalid endpoint
        try:
            response = self.session.get(f"{API_BASE}/invalid-endpoint/")
            if response.status_code == 404:
                self.log_test("Invalid Endpoint", True, "Properly returned 404")
            else:
                self.log_test(
                    "Invalid Endpoint", False, f"Expected 404, got {response.status_code}"
                )
        except Exception as e:
            self.log_test("Invalid Endpoint", False, f"Error: {str(e)}")

        # Test invalid data
        if self.auth_tokens.get("access"):
            headers = {"Authorization": f"Bearer {self.auth_tokens['access']}"}
            invalid_data = {"invalid_field": "invalid_value"}

            try:
                response = self.session.post(
                    f"{API_BASE}/members/", json=invalid_data, headers=headers
                )
                if response.status_code == 400:
                    self.log_test("Invalid Data", True, "Properly rejected invalid data")
                else:
                    self.log_test(
                        "Invalid Data", False, f"Expected 400, got {response.status_code}"
                    )
            except Exception as e:
                self.log_test("Invalid Data", False, f"Error: {str(e)}")

    def test_performance(self):
        """Test API performance"""
        print("\n⚡ Testing Performance...")

        if not self.auth_tokens.get("access"):
            self.log_test("Performance Tests", False, "No authentication token")
            return

        headers = {"Authorization": f"Bearer {self.auth_tokens['access']}"}

        # Test response time for member list
        start_time = time.time()
        try:
            response = self.session.get(f"{API_BASE}/members/", headers=headers)
            end_time = time.time()
            response_time = end_time - start_time

            if response.status_code == 200 and response_time < 2.0:
                self.log_test("Response Time", True, f"Response time: {response_time:.2f}s")
            elif response.status_code == 200:
                self.log_test("Response Time", False, f"Slow response: {response_time:.2f}s")
            else:
                self.log_test("Response Time", False, f"Request failed: {response.status_code}")
        except Exception as e:
            self.log_test("Response Time", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Comprehensive API Test Suite...")
        print(f"Target URL: {BASE_URL}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Run test suites
        self.test_health_check()
        self.test_authentication_flow()
        self.test_password_reset_flow()
        self.test_member_management()
        self.test_checkin_management()
        self.test_invoice_management()
        self.test_notification_management()
        self.test_report_management()
        self.test_error_handling()
        self.test_performance()

        # Print summary
        self.print_summary()


def main():
    """Main function to run the test suite"""
    print("🧪 AV Gym System - Comprehensive API Test Suite")
    print("=" * 60)

    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health/", timeout=5)
        if response.status_code != 200:
            print(
                "❌ Server is not responding properly. Please ensure the Django server is running."
            )
            print("   Run: python manage.py runserver")
            return
    except requests.exceptions.RequestException:
        print("❌ Cannot connect to server. Please ensure the Django server is running.")
        print("   Run: python manage.py runserver")
        return

    # Run tests
    test_suite = APITestSuite()
    test_suite.run_all_tests()


if __name__ == "__main__":
    main()
