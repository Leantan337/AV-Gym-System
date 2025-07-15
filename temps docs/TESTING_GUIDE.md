# AV Gym System - Comprehensive Testing Guide

## 🧪 Overview

The AV Gym System includes a comprehensive testing infrastructure that covers backend, frontend, API, and integration testing. This guide provides detailed information about our testing strategy, tools, and best practices.

## 🎯 Testing Strategy

### 1. Test Pyramid
Our testing follows the test pyramid approach:
- **Unit Tests** (70%): Fast, isolated tests for individual components
- **Integration Tests** (20%): Tests for component interactions
- **End-to-End Tests** (10%): Full system workflow tests

### 2. Test Categories
- **Backend Tests**: Django models, views, serializers, and business logic
- **Frontend Tests**: React components, hooks, and utilities
- **API Tests**: REST API endpoints and authentication
- **Integration Tests**: Cross-component functionality
- **Security Tests**: Authentication, authorization, and data validation

## 🛠️ Testing Tools

### Backend Testing
- **Django Test Framework**: Built-in Django testing utilities
- **pytest**: Advanced testing framework with better reporting
- **coverage.py**: Code coverage analysis
- **factory-boy**: Test data generation
- **pytest-django**: Django integration for pytest

### Frontend Testing
- **Jest**: JavaScript testing framework
- **React Testing Library**: Component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers
- **MSW (Mock Service Worker)**: API mocking

### API Testing
- **requests**: HTTP client for API testing
- **pytest-requests**: Requests integration for pytest
- **Custom API Test Suite**: Comprehensive endpoint testing

### Code Quality
- **flake8**: Python linting
- **ESLint**: JavaScript linting
- **bandit**: Security linting for Python
- **prettier**: Code formatting

## 📁 Test Structure

```
AV-Gym-System/
├── members/
│   └── tests/
│       ├── test_models.py          # Model unit tests
│       ├── test_views.py           # View/API tests
│       ├── test_serializers.py     # Serializer tests
│       └── test_services.py        # Service layer tests
├── authentication/
│   └── tests/
│       ├── test_models.py          # User model tests
│       ├── test_views.py           # Auth view tests
│       └── test_permissions.py     # Permission tests
├── checkins/
│   └── tests/
│       ├── test_models.py          # Check-in model tests
│       ├── test_views.py           # Check-in API tests
│       └── test_websocket.py       # WebSocket tests
├── invoices/
│   └── tests/
│       ├── test_models.py          # Invoice model tests
│       ├── test_views.py           # Invoice API tests
│       └── test_services.py        # Billing service tests
├── notifications/
│   └── tests/
│       ├── test_models.py          # Notification model tests
│       ├── test_views.py           # Notification API tests
│       └── test_services.py        # Notification service tests
├── reports/
│   └── tests/
│       ├── test_models.py          # Report model tests
│       ├── test_views.py           # Report API tests
│       └── test_services.py        # Report generation tests
├── admin-frontend/
│   ├── src/
│   │   └── components/
│   │       └── common/
│   │           └── __tests__/
│   │               └── ErrorBoundary.test.tsx  # Component tests
│   └── setupTests.ts               # Test configuration
├── test_api_comprehensive.py       # Comprehensive API tests
├── run_tests.py                    # Test runner script
├── pytest.ini                     # pytest configuration
└── requirements-test.txt           # Test dependencies
```

## 🚀 Running Tests

### Quick Start
```bash
# Run all tests
python run_tests.py

# Run backend tests only
python manage.py test

# Run frontend tests only
cd admin-frontend && npm test

# Run API tests only
python test_api_comprehensive.py
```

### Backend Testing

#### Django Tests
```bash
# Run all Django tests
python manage.py test

# Run specific app tests
python manage.py test members
python manage.py test authentication

# Run specific test file
python manage.py test members.tests.test_models

# Run specific test method
python manage.py test members.tests.test_models.MemberModelTest.test_member_creation

# Run with coverage
python -m coverage run --source=. manage.py test
python -m coverage report
python -m coverage html
```

#### Pytest Tests
```bash
# Install pytest dependencies
pip install pytest pytest-django pytest-cov factory-boy

# Run all pytest tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test categories
pytest -m "unit"
pytest -m "integration"
pytest -m "api"

# Run specific app tests
pytest members/tests/
pytest authentication/tests/

# Run with verbose output
pytest -v

# Run and stop on first failure
pytest -x
```

### Frontend Testing

#### Jest Tests
```bash
cd admin-frontend

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- ErrorBoundary.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="ErrorBoundary"

# Run tests in CI mode
npm test -- --watchAll=false --coverage
```

#### Component Testing
```typescript
// Example component test
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
});
```

### API Testing

#### Comprehensive API Tests
```bash
# Run comprehensive API tests
python test_api_comprehensive.py

# Run with specific configuration
python test_api_comprehensive.py --base-url=http://localhost:8000
```

#### Individual API Tests
```python
# Example API test
import requests

def test_member_creation():
    url = "http://localhost:8000/api/members/"
    data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "date_of_birth": "1990-01-01",
        "membership_plan": 1
    }
    
    response = requests.post(url, json=data)
    assert response.status_code == 201
    assert response.json()["first_name"] == "John"
```

## 📊 Test Coverage

### Coverage Targets
- **Overall Coverage**: 80% minimum
- **Critical Paths**: 90% minimum
- **New Features**: 90% minimum
- **Bug Fixes**: 100% for affected code

### Coverage Reports
```bash
# Generate coverage report
python -m coverage run --source=. manage.py test
python -m coverage report --show-missing
python -m coverage html

# View HTML report
open htmlcov/index.html
```

### Coverage Configuration
```ini
# .coveragerc
[run]
source = .
omit = 
    */migrations/*
    */tests/*
    */venv/*
    manage.py
    */__init__.py

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    class .*\bProtocol\):
    @(abc\.)?abstractmethod
```

## 🧪 Test Data Management

### Factory Boy
```python
# Example factory
import factory
from members.models import Member
from plans.models import Plan

class PlanFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Plan
    
    name = factory.Sequence(lambda n: f'Plan {n}')
    price = factory.Faker('pydecimal', left_digits=2, right_digits=2)
    duration_days = 30
    description = factory.Faker('text')

class MemberFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Member
    
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    email = factory.LazyAttribute(lambda obj: f'{obj.first_name.lower()}.{obj.last_name.lower()}@example.com')
    phone = factory.Faker('phone_number')
    date_of_birth = factory.Faker('date_of_birth')
    membership_plan = factory.SubFactory(PlanFactory)
```

### Test Fixtures
```python
# Example fixture usage
from django.test import TestCase
from members.tests.factories import MemberFactory

class MemberTestCase(TestCase):
    def setUp(self):
        self.member = MemberFactory()
        self.members = MemberFactory.create_batch(10)
    
    def test_member_creation(self):
        self.assertIsNotNone(self.member.id)
        self.assertIsNotNone(self.member.email)
```

## 🔒 Security Testing

### Authentication Tests
```python
# Example authentication test
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

class AuthenticationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = UserFactory()
    
    def test_unauthorized_access(self):
        response = self.client.get('/api/members/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_authorized_access(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/members/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
```

### Permission Tests
```python
# Example permission test
def test_role_based_access(self):
    # Test admin access
    self.client.force_authenticate(user=self.admin_user)
    response = self.client.get('/api/members/')
    self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    # Test front desk access (should be denied)
    self.client.force_authenticate(user=self.front_desk_user)
    response = self.client.get('/api/members/')
    self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
```

## 🚨 Error Handling Tests

### Error Boundary Tests
```typescript
// Example error boundary test
it('renders error UI when there is an error', () => {
  render(
    <ErrorBoundary>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument();
});
```

### API Error Tests
```python
# Example API error test
def test_invalid_data_handling(self):
    invalid_data = {
        'first_name': '',
        'email': 'invalid-email',
        'phone': 'invalid-phone'
    }
    
    response = self.client.post('/api/members/', invalid_data)
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    self.assertIn('email', response.data)
    self.assertIn('phone', response.data)
```

## 📈 Performance Testing

### Load Testing
```python
# Example load test
import time
import threading
import requests

def load_test():
    start_time = time.time()
    response = requests.get('http://localhost:8000/api/members/')
    end_time = time.time()
    
    assert response.status_code == 200
    assert (end_time - start_time) < 2.0  # Response time under 2 seconds

# Run multiple concurrent requests
threads = []
for i in range(10):
    thread = threading.Thread(target=load_test)
    threads.append(thread)
    thread.start()

for thread in threads:
    thread.join()
```

## 🔄 Continuous Integration

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install -r requirements-test.txt
    
    - name: Run backend tests
      run: |
        python manage.py test --verbosity=2
    
    - name: Run API tests
      run: |
        python test_api_comprehensive.py
    
    - name: Generate coverage report
      run: |
        python -m coverage run --source=. manage.py test
        python -m coverage report
```

## 📋 Test Checklist

### Before Committing
- [ ] All tests pass locally
- [ ] Coverage is above 80%
- [ ] New code has tests
- [ ] Bug fixes have regression tests
- [ ] Tests are properly documented
- [ ] No test data is committed

### Before Deployment
- [ ] All tests pass in CI
- [ ] Integration tests pass
- [ ] Performance tests pass
- [ ] Security tests pass
- [ ] Coverage report is generated
- [ ] Test results are documented

## 🐛 Debugging Tests

### Common Issues
1. **Database Issues**: Use `@pytest.mark.django_db` or `TransactionTestCase`
2. **Authentication Issues**: Use `force_authenticate` or create test users
3. **File Upload Issues**: Use `SimpleUploadedFile` for file tests
4. **WebSocket Issues**: Use `ChannelsTestCase` for WebSocket tests

### Debug Commands
```bash
# Run tests with debug output
pytest -v -s

# Run specific failing test
pytest -xvs test_file.py::test_method

# Run tests with print statements
pytest -s

# Debug with pdb
pytest --pdb
```

## 📚 Best Practices

### Test Organization
- Group related tests in classes
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent and isolated
- Use factories for test data

### Test Data
- Use factories instead of fixtures for complex data
- Clean up test data in `tearDown`
- Use unique identifiers to avoid conflicts
- Mock external dependencies

### Performance
- Keep tests fast (under 1 second each)
- Use database transactions for isolation
- Mock expensive operations
- Use `@pytest.mark.slow` for slow tests

### Maintainability
- Write tests that are easy to understand
- Use helper methods for common setup
- Document complex test scenarios
- Keep tests up to date with code changes

## 📊 Test Metrics

### Key Metrics
- **Test Coverage**: Percentage of code covered by tests
- **Test Execution Time**: Time to run all tests
- **Test Reliability**: Percentage of tests that pass consistently
- **Bug Detection Rate**: Number of bugs caught by tests

### Reporting
```bash
# Generate test report
python run_tests.py

# View detailed results
cat test_results.json

# Generate coverage report
python -m coverage html
```

## 🎯 Next Steps

### Immediate Improvements
1. **Increase Coverage**: Target 90% overall coverage
2. **Add Integration Tests**: Test cross-component workflows
3. **Performance Tests**: Add load and stress testing
4. **E2E Tests**: Add Cypress or Playwright tests

### Long-term Goals
1. **Test Automation**: Automated test execution in CI/CD
2. **Test Monitoring**: Track test metrics over time
3. **Test Documentation**: Comprehensive test documentation
4. **Test Training**: Team training on testing best practices

## 📞 Support

For questions about testing:
1. Check this documentation
2. Review existing test examples
3. Consult the testing team
4. Create an issue for complex problems

---

**Remember**: Good tests are an investment in code quality and maintainability. Write tests that you'll be happy to maintain and that will help catch bugs before they reach production. 