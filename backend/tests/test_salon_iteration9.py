"""
Backend API Tests for Salon Management App - Iteration 9
Tests for dark theme, customizable navigation, and core APIs

Test Areas:
- Authentication endpoints
- Public website API 
- Nav config endpoints (authenticated)
- Appointments API
- Services/Operators/Clients APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://onyx-gold-ui.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@brunomelito.it"
ADMIN_PASSWORD = "Admin123!"

class TestPublicEndpoints:
    """Test public endpoints that don't require authentication"""
    
    def test_public_website_config(self):
        """GET /api/public/website - Should return salon website config"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Verify essential config fields
        assert "config" in data
        config = data["config"]
        assert "salon_name" in config
        assert config["salon_name"] == "BRUNO MELITO HAIR"
        print(f"✓ Public website API returns salon config: {config['salon_name']}")
    
    def test_public_services(self):
        """GET /api/public/services - Should return services list"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have at least one service"
        # Verify service structure
        service = data[0]
        assert "id" in service
        assert "name" in service
        assert "category" in service
        assert "price" in service
        print(f"✓ Public services API returns {len(data)} services")
        
    def test_public_operators(self):
        """GET /api/public/operators - Should return operators list"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public operators API returns {len(data)} operators")
        
    def test_public_promotions(self):
        """GET /api/public/promotions/all - Should return promotions"""
        response = requests.get(f"{BASE_URL}/api/public/promotions/all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public promotions API returns {len(data)} promotions")


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """POST /api/auth/login - Valid credentials should return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Login successful for {ADMIN_EMAIL}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - Invalid credentials should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
        
    def test_protected_endpoint_without_auth(self):
        """Protected endpoints should return 401/403 without token"""
        response = requests.get(f"{BASE_URL}/api/appointments")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        print("✓ Protected endpoint correctly requires authentication")


class TestAuthenticatedAPIs:
    """Test authenticated API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")
    
    def test_nav_config_get(self):
        """GET /api/nav-config - Should return nav configuration"""
        response = requests.get(f"{BASE_URL}/api/nav-config", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Nav config should have sidebar and dashboard arrays
        assert "sidebar" in data
        assert "dashboard" in data
        print(f"✓ Nav config API works: sidebar={data.get('sidebar')}, dashboard={data.get('dashboard')}")
    
    def test_nav_config_save(self):
        """PUT /api/nav-config - Should save nav configuration"""
        new_config = {
            "sidebar": ["/planning", "/dashboard", "/appointments", "/incassi", "/settings"],
            "dashboard": ["/week", "/clients", "/services"]
        }
        response = requests.put(f"{BASE_URL}/api/nav-config", json=new_config, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        
        # Verify saved config
        verify_response = requests.get(f"{BASE_URL}/api/nav-config", headers=self.headers)
        verify_data = verify_response.json()
        assert verify_data.get("sidebar") == new_config["sidebar"]
        print("✓ Nav config save and persistence verified")
    
    def test_appointments_get(self):
        """GET /api/appointments - Should return appointments list"""
        response = requests.get(f"{BASE_URL}/api/appointments?date=2026-03-19", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Appointments API returns {len(data)} appointments")
    
    def test_clients_list(self):
        """GET /api/clients - Should return clients list"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Clients API returns {len(data)} clients")
        
    def test_services_list(self):
        """GET /api/services - Should return services list"""
        response = requests.get(f"{BASE_URL}/api/services", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Services API returns {len(data)} services")
        
    def test_operators_list(self):
        """GET /api/operators - Should return operators list"""
        response = requests.get(f"{BASE_URL}/api/operators", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Operators API returns {len(data)} operators")
        
    def test_dashboard_stats(self):
        """GET /api/stats/dashboard - Should return dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "today_appointments_count" in data
        assert "total_clients" in data
        print(f"✓ Dashboard stats API works: {data.get('today_appointments_count')} appointments today")


class TestGalleryAPI:
    """Test gallery endpoints for checking photo limits"""
    
    def test_gallery_files_no_limit(self):
        """GET /api/public/website - Check gallery files are not limited"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        # Check if gallery_work and gallery_salon exist
        gallery_work = data.get("gallery_work", [])
        gallery_salon = data.get("gallery_salon", [])
        print(f"✓ Gallery API returns work photos: {len(gallery_work)}, salon photos: {len(gallery_salon)}")
        # Note: The limit removal is in frontend GallerySection.jsx, not backend


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
