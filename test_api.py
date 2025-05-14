import requests
import json

# Base URL
BASE_URL = 'http://127.0.0.1:8000/api'

# Get JWT token
response = requests.post(f'{BASE_URL}/token/', {
    'username': 'gymadmin',
    'password': '@12345678'  # The correct password
})

if response.status_code == 200:
    token = response.json()['access']
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test creating a member
    member_data = {
        'full_name': 'John Doe',
        'phone': '1234567890',
        'address': '123 Main St',
        'status': 'active'
    }
    
    response = requests.post(f'{BASE_URL}/members/', headers=headers, json=member_data)
    print('Create Member Response:', response.status_code)
    if response.status_code == 201:
        member_id = response.json()['id']
        print('Created Member:', response.json())
        
        # Test creating a membership plan
        plan_data = {
            'name': 'Monthly Basic',
            'price': '50.00',
            'duration_days': 30,
            'billing_frequency': 'monthly'
        }
        
        response = requests.post(f'{BASE_URL}/plans/', headers=headers, json=plan_data)
        print('\nCreate Plan Response:', response.status_code)
        if response.status_code == 201:
            plan_id = response.json()['id']
            print('Created Plan:', response.json())
            
            # Test creating a subscription
            subscription_data = {
                'member': member_id,
                'plan': plan_id,
                'start_date': '2025-05-14',
                'end_date': '2025-06-14',
                'status': 'active'
            }
            
            response = requests.post(f'{BASE_URL}/subscriptions/', headers=headers, json=subscription_data)
            print('\nCreate Subscription Response:', response.status_code)
            if response.status_code == 201:
                print('Created Subscription:', response.json())
                
                # Test creating a check-in
                checkin_data = {
                    'member': member_id
                }
                
                response = requests.post(f'{BASE_URL}/checkins/', headers=headers, json=checkin_data)
                print('\nCreate Check-in Response:', response.status_code)
                if response.status_code == 201:
                    print('Created Check-in:', response.json())
                    
                    # Test GET requests
                    print('\nTesting GET requests:')
                    
                    # Get all members
                    response = requests.get(f'{BASE_URL}/members/', headers=headers)
                    print('\nGet Members Response:', response.status_code)
                    print('Members:', response.json())
                    
                    # Get all plans
                    response = requests.get(f'{BASE_URL}/plans/', headers=headers)
                    print('\nGet Plans Response:', response.status_code)
                    print('Plans:', response.json())
                    
                    # Get all subscriptions
                    response = requests.get(f'{BASE_URL}/subscriptions/', headers=headers)
                    print('\nGet Subscriptions Response:', response.status_code)
                    print('Subscriptions:', response.json())
                    
                    # Get all check-ins
                    response = requests.get(f'{BASE_URL}/checkins/', headers=headers)
                    print('\nGet Check-ins Response:', response.status_code)
                    print('Check-ins:', response.json())
else:
    print('Authentication failed:', response.status_code, response.text)
