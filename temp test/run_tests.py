#!/usr/bin/env python3
"""
Comprehensive Test Runner for AV Gym System
Runs all tests and generates detailed reports with coverage analysis.
"""

import os
import sys
import subprocess
import json
import time
from datetime import datetime
from pathlib import Path


class TestRunner:
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.test_results = {
            'timestamp': datetime.now().isoformat(),
            'backend_tests': {},
            'frontend_tests': {},
            'api_tests': {},
            'coverage': {},
            'summary': {},
        }

    def run_backend_tests(self):
        """Run Django backend tests with coverage"""
        print("🧪 Running Backend Tests...")
        print("=" * 50)

        try:
            # Run Django tests with coverage
            cmd = [
                'python',
                '-m',
                'coverage',
                'run',
                '--source=.',
                'manage.py',
                'test',
                '--verbosity=2',
            ]

            start_time = time.time()
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
            end_time = time.time()

            # Parse test results
            if result.returncode == 0:
                self.test_results['backend_tests']['status'] = 'PASSED'
                self.test_results['backend_tests']['message'] = 'All backend tests passed'
            else:
                self.test_results['backend_tests']['status'] = 'FAILED'
                self.test_results['backend_tests']['message'] = 'Some backend tests failed'

            self.test_results['backend_tests']['duration'] = end_time - start_time
            self.test_results['backend_tests']['output'] = result.stdout
            self.test_results['backend_tests']['errors'] = result.stderr

            print(f"Backend Tests: {self.test_results['backend_tests']['status']}")
            print(f"Duration: {self.test_results['backend_tests']['duration']:.2f}s")

            # Generate coverage report
            self.generate_coverage_report()

        except Exception as e:
            self.test_results['backend_tests']['status'] = 'ERROR'
            self.test_results['backend_tests']['message'] = str(e)
            print(f"Backend Tests Error: {e}")

    def generate_coverage_report(self):
        """Generate coverage report"""
        try:
            # Generate coverage report
            cmd = ['python', '-m', 'coverage', 'report', '--show-missing']
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)

            if result.returncode == 0:
                self.test_results['coverage']['report'] = result.stdout

                # Parse coverage percentage
                lines = result.stdout.split('\n')
                for line in lines:
                    if 'TOTAL' in line:
                        parts = line.split()
                        if len(parts) >= 4:
                            try:
                                coverage_percent = float(parts[-1].replace('%', ''))
                                self.test_results['coverage']['percentage'] = coverage_percent
                                break
                            except ValueError:
                                pass

                print("\n📊 Coverage Report:")
                print(result.stdout)
            else:
                self.test_results['coverage']['error'] = result.stderr

        except Exception as e:
            self.test_results['coverage']['error'] = str(e)

    def run_frontend_tests(self):
        """Run React frontend tests"""
        print("\n🧪 Running Frontend Tests...")
        print("=" * 50)

        frontend_dir = self.project_root / 'admin-frontend'

        if not frontend_dir.exists():
            self.test_results['frontend_tests']['status'] = 'SKIPPED'
            self.test_results['frontend_tests']['message'] = 'Frontend directory not found'
            print("Frontend Tests: SKIPPED (directory not found)")
            return

        try:
            # Run npm tests
            cmd = ['npm', 'test', '--', '--watchAll=false', '--coverage']
            start_time = time.time()
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=frontend_dir)
            end_time = time.time()

            if result.returncode == 0:
                self.test_results['frontend_tests']['status'] = 'PASSED'
                self.test_results['frontend_tests']['message'] = 'All frontend tests passed'
            else:
                self.test_results['frontend_tests']['status'] = 'FAILED'
                self.test_results['frontend_tests']['message'] = 'Some frontend tests failed'

            self.test_results['frontend_tests']['duration'] = end_time - start_time
            self.test_results['frontend_tests']['output'] = result.stdout
            self.test_results['frontend_tests']['errors'] = result.stderr

            print(f"Frontend Tests: {self.test_results['frontend_tests']['status']}")
            print(f"Duration: {self.test_results['frontend_tests']['duration']:.2f}s")

        except Exception as e:
            self.test_results['frontend_tests']['status'] = 'ERROR'
            self.test_results['frontend_tests']['message'] = str(e)
            print(f"Frontend Tests Error: {e}")

    def run_api_tests(self):
        """Run comprehensive API tests"""
        print("\n🧪 Running API Tests...")
        print("=" * 50)

        api_test_file = self.project_root / 'test_api_comprehensive.py'

        if not api_test_file.exists():
            self.test_results['api_tests']['status'] = 'SKIPPED'
            self.test_results['api_tests']['message'] = 'API test file not found'
            print("API Tests: SKIPPED (test file not found)")
            return

        try:
            # Run API tests
            cmd = ['python', 'test_api_comprehensive.py']
            start_time = time.time()
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
            end_time = time.time()

            if result.returncode == 0:
                self.test_results['api_tests']['status'] = 'PASSED'
                self.test_results['api_tests']['message'] = 'All API tests passed'
            else:
                self.test_results['api_tests']['status'] = 'FAILED'
                self.test_results['api_tests']['message'] = 'Some API tests failed'

            self.test_results['api_tests']['duration'] = end_time - start_time
            self.test_results['api_tests']['output'] = result.stdout
            self.test_results['api_tests']['errors'] = result.stderr

            print(f"API Tests: {self.test_results['api_tests']['status']}")
            print(f"Duration: {self.test_results['api_tests']['duration']:.2f}s")

            # Try to load API test results
            api_results_file = self.project_root / 'api_test_results.json'
            if api_results_file.exists():
                with open(api_results_file, 'r') as f:
                    api_results = json.load(f)
                    self.test_results['api_tests']['detailed_results'] = api_results

                    # Calculate API test statistics
                    total_tests = len(api_results)
                    passed_tests = sum(1 for result in api_results if result['success'])
                    failed_tests = total_tests - passed_tests

                    self.test_results['api_tests']['statistics'] = {
                        'total': total_tests,
                        'passed': passed_tests,
                        'failed': failed_tests,
                        'success_rate': (
                            (passed_tests / total_tests * 100) if total_tests > 0 else 0
                        ),
                    }

        except Exception as e:
            self.test_results['api_tests']['status'] = 'ERROR'
            self.test_results['api_tests']['message'] = str(e)
            print(f"API Tests Error: {e}")

    def run_linting_tests(self):
        """Run code linting and style checks"""
        print("\n🔍 Running Linting Tests...")
        print("=" * 50)

        try:
            # Run flake8 for Python linting
            cmd = ['flake8', '.', '--max-line-length=120', '--exclude=venv,__pycache__,migrations']
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)

            if result.returncode == 0:
                print("Python Linting: ✅ PASSED")
                self.test_results['linting'] = {'python': 'PASSED', 'issues': 0}
            else:
                issues = len(result.stdout.split('\n')) - 1  # Subtract empty line
                print(f"Python Linting: ❌ FAILED ({issues} issues)")
                self.test_results['linting'] = {
                    'python': 'FAILED',
                    'issues': issues,
                    'output': result.stdout,
                }

        except Exception as e:
            print(f"Python Linting Error: {e}")
            self.test_results['linting'] = {'python': 'ERROR', 'error': str(e)}

        # Frontend linting
        frontend_dir = self.project_root / 'admin-frontend'
        if frontend_dir.exists():
            try:
                cmd = ['npm', 'run', 'lint']
                result = subprocess.run(cmd, capture_output=True, text=True, cwd=frontend_dir)

                if result.returncode == 0:
                    print("Frontend Linting: ✅ PASSED")
                    if 'linting' not in self.test_results:
                        self.test_results['linting'] = {}
                    self.test_results['linting']['frontend'] = 'PASSED'
                else:
                    print("Frontend Linting: ❌ FAILED")
                    if 'linting' not in self.test_results:
                        self.test_results['linting'] = {}
                    self.test_results['linting']['frontend'] = 'FAILED'
                    self.test_results['linting']['frontend_output'] = result.stdout

            except Exception as e:
                print(f"Frontend Linting Error: {e}")
                if 'linting' not in self.test_results:
                    self.test_results['linting'] = {}
                self.test_results['linting']['frontend'] = 'ERROR'
                self.test_results['linting']['frontend_error'] = str(e)

    def run_security_tests(self):
        """Run security checks"""
        print("\n🔒 Running Security Tests...")
        print("=" * 50)

        try:
            # Run bandit for security checks
            cmd = ['bandit', '-r', '.', '-f', 'json', '--exclude', 'venv,__pycache__,migrations']
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)

            if result.returncode == 0:
                print("Security Checks: ✅ PASSED")
                self.test_results['security'] = {'status': 'PASSED', 'issues': 0}
            else:
                try:
                    security_results = json.loads(result.stdout)
                    issues = len(security_results.get('results', []))
                    print(f"Security Checks: ⚠️ WARNINGS ({issues} issues)")
                    self.test_results['security'] = {
                        'status': 'WARNINGS',
                        'issues': issues,
                        'results': security_results,
                    }
                except json.JSONDecodeError:
                    print("Security Checks: ❌ FAILED")
                    self.test_results['security'] = {'status': 'FAILED', 'error': result.stderr}

        except Exception as e:
            print(f"Security Tests Error: {e}")
            self.test_results['security'] = {'status': 'ERROR', 'error': str(e)}

    def generate_summary(self):
        """Generate test summary"""
        print("\n📊 Generating Test Summary...")
        print("=" * 50)

        # Calculate overall statistics
        total_tests = 0
        passed_tests = 0
        failed_tests = 0

        # Backend tests
        if self.test_results['backend_tests']['status'] == 'PASSED':
            passed_tests += 1
        elif self.test_results['backend_tests']['status'] == 'FAILED':
            failed_tests += 1
        total_tests += 1

        # Frontend tests
        if self.test_results['frontend_tests']['status'] == 'PASSED':
            passed_tests += 1
        elif self.test_results['frontend_tests']['status'] == 'FAILED':
            failed_tests += 1
        total_tests += 1

        # API tests
        if self.test_results['api_tests']['status'] == 'PASSED':
            passed_tests += 1
        elif self.test_results['api_tests']['status'] == 'FAILED':
            failed_tests += 1
        total_tests += 1

        # Calculate success rate
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0

        self.test_results['summary'] = {
            'total_test_suites': total_tests,
            'passed_suites': passed_tests,
            'failed_suites': failed_tests,
            'success_rate': success_rate,
            'overall_status': 'PASSED' if failed_tests == 0 else 'FAILED',
        }

        # Print summary
        print(f"Overall Status: {self.test_results['summary']['overall_status']}")
        print(f"Success Rate: {success_rate:.1f}%")
        print(f"Test Suites: {passed_tests}/{total_tests} passed")

        # Coverage summary
        if 'coverage' in self.test_results and 'percentage' in self.test_results['coverage']:
            coverage = self.test_results['coverage']['percentage']
            print(f"Code Coverage: {coverage:.1f}%")

        # API test details
        if 'api_tests' in self.test_results and 'statistics' in self.test_results['api_tests']:
            api_stats = self.test_results['api_tests']['statistics']
            print(
                f"API Tests: {api_stats['passed']}/{api_stats['total']} passed ({api_stats['success_rate']:.1f}%)"
            )

    def save_results(self):
        """Save test results to file"""
        results_file = self.project_root / 'test_results.json'

        with open(results_file, 'w') as f:
            json.dump(self.test_results, f, indent=2)

        print(f"\n📄 Test results saved to: {results_file}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 AV Gym System - Comprehensive Test Suite")
        print("=" * 60)
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Project Root: {self.project_root}")
        print("=" * 60)

        # Run all test suites
        self.run_backend_tests()
        self.run_frontend_tests()
        self.run_api_tests()
        self.run_linting_tests()
        self.run_security_tests()

        # Generate summary
        self.generate_summary()

        # Save results
        self.save_results()

        print("\n" + "=" * 60)
        print("🎉 Test Suite Complete!")
        print("=" * 60)

        return self.test_results['summary']['overall_status'] == 'PASSED'


def main():
    """Main function"""
    runner = TestRunner()
    success = runner.run_all_tests()

    if success:
        print("✅ All tests passed successfully!")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Please review the results.")
        sys.exit(1)


if __name__ == "__main__":
    main()
