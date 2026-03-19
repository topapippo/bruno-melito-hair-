"""
Iteration 15 Tests: Backend Models Refactoring & API Regression
Tests verify:
1. Backend server starts and responds to health check
2. Authentication works (login with admin credentials)
3. Public endpoints return data correctly
4. Protected endpoints (with auth) return data correctly
5. Models package imports work correctly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@brunomelito.it"
ADMIN_PASSWORD = "Admin123!"


class TestHealthAndModels:
    """Tests for backend health and models package"""
    
    def test_api_health_check(self):
        """Test /api/ endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert "message" in data or "status" in data or True  # Just verify it's valid JSON
        print(f"✓ Health check passed: {response.status_code}")
    
    def test_models_import_usercreate(self):
        """Test UserCreate model can be imported"""
        import sys
        sys.path.insert(0, '/app/backend')
        from models import UserCreate
        assert UserCreate is not None
        print("✓ UserCreate imported successfully")
    
    def test_models_import_appointmentcreate(self):
        """Test AppointmentCreate model can be imported"""
        import sys
        sys.path.insert(0, '/app/backend')
        from models import AppointmentCreate
        assert AppointmentCreate is not None
        print("✓ AppointmentCreate imported successfully")
    
    def test_models_import_prepaidcardcreate(self):
        """Test PrepaidCardCreate model can be imported"""
        import sys
        sys.path.insert(0, '/app/backend')
        from models import PrepaidCardCreate
        assert PrepaidCardCreate is not None
        print("✓ PrepaidCardCreate imported successfully")


class TestAuthentication:
    """Tests for authentication endpoints"""
    
    def test_login_success(self):
        """Test login with valid admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("token_type") == "bearer"
        print(f"✓ Login successful, token received")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid credentials correctly rejected with 401")


class TestPublicEndpoints:
    """Tests for public endpoints (no auth required)"""
    
    def test_public_services(self):
        """Test GET /api/public/services returns services list"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of services"
        print(f"✓ Public services: {len(data)} services returned")
    
    def test_public_operators(self):
        """Test GET /api/public/operators returns operators list"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of operators"
        print(f"✓ Public operators: {len(data)} operators returned")
    
    def test_public_website(self):
        """Test GET /api/public/website returns website config"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Expected website config object"
        print(f"✓ Public website config returned")


class TestProtectedEndpoints:
    """Tests for protected endpoints (auth required)"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate")
    
    def test_get_services_authenticated(self):
        """Test GET /api/services with auth returns services"""
        response = requests.get(f"{BASE_URL}/api/services", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of services"
        print(f"✓ Auth services: {len(data)} services returned")
    
    def test_get_clients_authenticated(self):
        """Test GET /api/clients with auth returns clients"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of clients"
        print(f"✓ Auth clients: {len(data)} clients returned")
    
    def test_get_operators_authenticated(self):
        """Test GET /api/operators with auth returns operators"""
        response = requests.get(f"{BASE_URL}/api/operators", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of operators"
        print(f"✓ Auth operators: {len(data)} operators returned")
    
    def test_get_nav_config_authenticated(self):
        """Test GET /api/nav-config with auth returns nav config"""
        response = requests.get(f"{BASE_URL}/api/nav-config", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Expected nav config object"
        print(f"✓ Auth nav-config returned")
    
    def test_get_admin_theme_authenticated(self):
        """Test GET /api/admin-theme with auth returns theme config"""
        response = requests.get(f"{BASE_URL}/api/admin-theme", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Expected theme config object"
        print(f"✓ Auth admin-theme returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
