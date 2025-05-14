import requests
import json

# Base URL
BASE_URL = 'http://127.0.0.1:8000/api'

# Get JWT token
response = requests.post(f'{BASE_URL}/token/', {
    'username': 'gymadmin',
    'password': '@12345678'
})

if response.status_code == 200:
    token = response.json()['access']
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Test dashboard statistics
    print('\nTesting Dashboard Statistics:')
    response = requests.get(f'{BASE_URL}/dashboard/', headers=headers)
    print('Dashboard Response:', response.status_code)
    if response.status_code == 200:
        print('Dashboard Data:', json.dumps(response.json(), indent=2))
    else:
        print('Error:', response.text)
    
    # Test member search and filtering
    print('\nTesting Member Search:')
    response = requests.get(
        f'{BASE_URL}/members/',
        headers=headers,
        params={'search': 'john', 'has_active_subscription': 'true'}
    )
    print('Member Search Response:', response.status_code)
    if response.status_code == 200:
        print('Found Members:', json.dumps(response.json(), indent=2))
    
    # Test member statistics
    print('\nTesting Member Statistics:')
    response = requests.get(f'{BASE_URL}/members/statistics/', headers=headers)
    print('Member Statistics Response:', response.status_code)
    if response.status_code == 200:
        print('Member Statistics:', json.dumps(response.json(), indent=2))
    
    # Test invoice PDF generation
    print('\nTesting Invoice PDF Generation:')
    # Get first invoice ID
    response = requests.get(f'{BASE_URL}/invoices/', headers=headers)
    if response.status_code == 200 and response.json():
        invoice_id = response.json()[0]['id']
        response = requests.get(
            f'{BASE_URL}/invoices/{invoice_id}/generate_pdf/',
            headers=headers
        )
        print('PDF Generation Response:', response.status_code)
        if response.status_code == 200:
            # Save PDF
            with open('test_invoice.pdf', 'wb') as f:
                f.write(response.content)
            print('PDF saved as test_invoice.pdf')
    
    # Test invoice statistics
    print('\nTesting Invoice Statistics:')
    response = requests.get(f'{BASE_URL}/invoices/statistics/', headers=headers)
    print('Invoice Statistics Response:', response.status_code)
    if response.status_code == 200:
        print('Invoice Statistics:', json.dumps(response.json(), indent=2))
    
    # Test bulk status update
    print('\nTesting Bulk Status Update:')
    # Get some member IDs
    response = requests.get(f'{BASE_URL}/members/', headers=headers)
    if response.status_code == 200 and response.json():
        member_ids = [m['id'] for m in response.json()[:2]]
        response = requests.post(
            f'{BASE_URL}/members/bulk_status_update/',
            headers=headers,
            json={
                'member_ids': member_ids,
                'status': 'inactive'
            }
        )
        print('Bulk Update Response:', response.status_code)
        if response.status_code == 200:
            print('Bulk Update Result:', response.json())
else:
    print('Authentication failed:', response.status_code, response.text)
