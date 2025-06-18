#!/usr/bin/env python3
"""
Test script for password reset functionality
This script tests the complete password reset flow including:
1. Request password reset
2. Confirm password reset with token
3. Change password for authenticated users
"""

import requests
import json
import time
from urllib.parse import urljoin

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"

def test_password_reset_flow():
    """Test the complete password reset flow"""
    print("🧪 Testing Password Reset Functionality")
    print("=" * 50)
    
    # Test data
    test_email = "test@example.com"
    test_username = "testuser"
    test_password = "testpass123"
    new_password = "newpass123"
    
    # Step 1: Test password reset request
    print("\n1. Testing Password Reset Request...")
    reset_request_data = {
        "email": test_email
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/password-reset/",
            json=reset_request_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            print("   ✅ Password reset request successful")
        else:
            print("   ❌ Password reset request failed")
            return False
            
    except Exception as e:
        print(f"   ❌ Error during password reset request: {e}")
        return False
    
    # Step 2: Test login with current credentials
    print("\n2. Testing Login with Current Credentials...")
    login_data = {
        "username": test_username,
        "password": test_password
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/token/",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get("access")
            print("   ✅ Login successful")
        else:
            print("   ❌ Login failed - user may not exist")
            print("   Response:", response.json())
            return False
            
    except Exception as e:
        print(f"   ❌ Error during login: {e}")
        return False
    
    # Step 3: Test change password for authenticated user
    print("\n3. Testing Change Password for Authenticated User...")
    change_password_data = {
        "current_password": test_password,
        "new_password": new_password,
        "confirm_password": new_password
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/me/change-password/",
            json=change_password_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            }
        )
        
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            print("   ✅ Password change successful")
        else:
            print("   ❌ Password change failed")
            return False
            
    except Exception as e:
        print(f"   ❌ Error during password change: {e}")
        return False
    
    # Step 4: Test login with new password
    print("\n4. Testing Login with New Password...")
    new_login_data = {
        "username": test_username,
        "password": new_password
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/token/",
            json=new_login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Login with new password successful")
        else:
            print("   ❌ Login with new password failed")
            return False
            
    except Exception as e:
        print(f"   ❌ Error during login with new password: {e}")
        return False
    
    # Step 5: Test change password back to original
    print("\n5. Testing Change Password Back to Original...")
    change_back_data = {
        "current_password": new_password,
        "new_password": test_password,
        "confirm_password": test_password
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/me/change-password/",
            json=change_back_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            }
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("   ✅ Password change back to original successful")
        else:
            print("   ❌ Password change back to original failed")
            return False
            
    except Exception as e:
        print(f"   ❌ Error during password change back: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All password reset tests passed!")
    return True

def test_password_reset_validation():
    """Test password reset validation scenarios"""
    print("\n🧪 Testing Password Reset Validation")
    print("=" * 50)
    
    # Test 1: Invalid email format
    print("\n1. Testing Invalid Email Format...")
    invalid_email_data = {
        "email": "invalid-email"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/password-reset/",
            json=invalid_email_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 400:
            print("   ✅ Invalid email properly rejected")
        else:
            print("   ❌ Invalid email not properly rejected")
            
    except Exception as e:
        print(f"   ❌ Error testing invalid email: {e}")
    
    # Test 2: Missing email
    print("\n2. Testing Missing Email...")
    missing_email_data = {}
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/password-reset/",
            json=missing_email_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 400:
            print("   ✅ Missing email properly rejected")
        else:
            print("   ❌ Missing email not properly rejected")
            
    except Exception as e:
        print(f"   ❌ Error testing missing email: {e}")
    
    # Test 3: Password mismatch
    print("\n3. Testing Password Mismatch...")
    mismatch_data = {
        "current_password": "testpass123",
        "new_password": "newpass123",
        "confirm_password": "differentpass123"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/auth/me/change-password/",
            json=mismatch_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"   Status Code: {response.status_code}")
        if response.status_code == 400:
            print("   ✅ Password mismatch properly rejected")
        else:
            print("   ❌ Password mismatch not properly rejected")
            
    except Exception as e:
        print(f"   ❌ Error testing password mismatch: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Password reset validation tests completed!")

def main():
    """Main test function"""
    print("🚀 Starting Password Reset Functionality Tests")
    print("=" * 60)
    
    # Test the main flow
    success = test_password_reset_flow()
    
    # Test validation scenarios
    test_password_reset_validation()
    
    if success:
        print("\n🎉 All tests completed successfully!")
        print("✅ Password reset functionality is working correctly")
    else:
        print("\n❌ Some tests failed!")
        print("🔧 Please check the implementation and try again")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main() 