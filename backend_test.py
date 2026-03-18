import requests
import sys
from datetime import datetime

class MBHSAPITester:
    def __init__(self, base_url="https://yarn-lock-fix.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = {
            "passed": [],
            "failed": []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.test_results["passed"].append(name)
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                self.test_results["failed"].append(f"{name} - Expected {expected_status}, got {response.status_code}")
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    try:
                        error_data = response.json()
                        print(f"   Error: {error_data}")
                    except:
                        print(f"   Response: {response.text[:500]}")
                return False, {}

        except Exception as e:
            self.test_results["failed"].append(f"{name} - Exception: {str(e)}")
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint /api/"""
        return self.run_test("API Root Status", "GET", "", 200)

    def test_register(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        register_data = {
            "email": f"test_mbhs_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}",
            "salon_name": "Test MBHS Salon"
        }
        
        success, response = self.run_test(
            "User Registration", 
            "POST", 
            "auth/register", 
            200, 
            register_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Registration successful, token acquired: {self.token[:20]}...")
            return True
        return False

    def test_login(self):
        """Test user login - try with a common test account"""
        login_data = {
            "email": "admin@test.com", 
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "User Login", 
            "POST", 
            "auth/login", 
            200, 
            login_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Login successful, token acquired: {self.token[:20]}...")
            return True
        return False

    def test_public_website(self):
        """Test public website data endpoint"""
        return self.run_test("Public Website Data", "GET", "public/website", 200)

    def test_public_services(self):
        """Test public services endpoint"""
        return self.run_test("Public Services", "GET", "public/services", 200)

    def test_public_operators(self):
        """Test public operators endpoint"""
        return self.run_test("Public Operators", "GET", "public/operators", 200)

    def test_public_booking_post(self):
        """Test public booking endpoint (POST)"""
        booking_data = {
            "client_name": "Test Client",
            "client_phone": "123456789",
            "service_ids": [],  # Empty for now
            "date": "2025-01-20",
            "time": "10:00",
            "notes": "Test booking"
        }
        
        # This might fail if no services available, but should return proper error
        success, response = self.run_test(
            "Public Booking (POST)", 
            "POST", 
            "public/booking", 
            400,  # Expecting 400 due to empty service_ids or validation
            booking_data
        )
        
        # Also try with 200 in case it works
        if not success:
            success, response = self.run_test(
                "Public Booking (POST) - Alternative", 
                "POST", 
                "public/booking", 
                200, 
                booking_data
            )
        
        return success

def main():
    """Run all MBHS tests"""
    print("🚀 Starting MBHS Salon API Tests...")
    print("=" * 60)
    
    tester = MBHSAPITester()
    
    # Test sequence for MBHS requirements
    tests = [
        ("API Root /api/", tester.test_api_root),
        ("User Registration", tester.test_register), 
        ("User Login (fallback)", tester.test_login),
        ("Public Website Data", tester.test_public_website),
        ("Public Services", tester.test_public_services),
        ("Public Operators", tester.test_public_operators),
        ("Public Booking", tester.test_public_booking_post),
    ]
    
    # Run all tests
    for test_name, test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            tester.tests_run += 1
            tester.test_results["failed"].append(f"{test_name} - Exception: {str(e)}")

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    print(f"\n✅ Passed Tests ({len(tester.test_results['passed'])}):")
    for test in tester.test_results["passed"]:
        print(f"   • {test}")
    
    if tester.test_results["failed"]:
        print(f"\n❌ Failed Tests ({len(tester.test_results['failed'])}):")
        for test in tester.test_results["failed"]:
            print(f"   • {test}")
    
    if tester.tests_passed == tester.tests_run:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())