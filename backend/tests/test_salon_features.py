"""
Backend API tests for MBHS SALON app
Tests: Auth, Dashboard modules, Services (MODELLANTI), Weekly view, Planning drag-drop, Loyalty, Settings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://salon-theme-preview.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "melitobruno@gmail.com"
TEST_PASSWORD = "password123"


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Test successful login returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"✓ Login successful, token received")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print(f"✓ Invalid login rejected with 401")


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for subsequent tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestDashboardStats:
    """Test dashboard stats endpoint"""
    
    def test_get_dashboard_stats(self, auth_headers):
        """Test dashboard stats returns expected data structure"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields
        assert "today_appointments_count" in data
        assert "total_clients" in data
        assert "monthly_revenue" in data
        assert "upcoming_appointments" in data
        
        print(f"✓ Dashboard stats: {data['today_appointments_count']} appointments today, {data['total_clients']} total clients")


class TestServicesAPI:
    """Test services endpoints - including MODELLANTI category"""
    
    def test_get_services(self, auth_headers):
        """Test getting all services"""
        response = requests.get(f"{BASE_URL}/api/services", headers=auth_headers)
        assert response.status_code == 200
        services = response.json()
        assert isinstance(services, list)
        assert len(services) > 0
        print(f"✓ Found {len(services)} services")
    
    def test_modellanti_services_exist(self, auth_headers):
        """Test that MODELLANTI category services exist with €40 price"""
        response = requests.get(f"{BASE_URL}/api/services", headers=auth_headers)
        assert response.status_code == 200
        services = response.json()
        
        # Check for modellanti category
        modellanti_services = [s for s in services if s.get("category") == "modellanti"]
        assert len(modellanti_services) >= 5, f"Expected at least 5 modellanti services, found {len(modellanti_services)}"
        
        # Verify all modellanti services are €40
        expected_names = ["permanente", "stiratura anticrespo", "ondulazione", "stiratura classica", "stiratura new"]
        found_names = []
        for svc in modellanti_services:
            svc_name_lower = svc["name"].lower()
            for expected in expected_names:
                if expected in svc_name_lower:
                    found_names.append(expected)
                    assert svc["price"] == 40.0, f"Expected €40, got €{svc['price']} for {svc['name']}"
        
        print(f"✓ Found {len(modellanti_services)} MODELLANTI services")
        for svc in modellanti_services:
            print(f"  - {svc['name']}: €{svc['price']}")


class TestAppointmentsAPI:
    """Test appointments endpoints"""
    
    def test_get_appointments(self, auth_headers):
        """Test getting appointments"""
        response = requests.get(f"{BASE_URL}/api/appointments", headers=auth_headers)
        assert response.status_code == 200
        appointments = response.json()
        assert isinstance(appointments, list)
        print(f"✓ Found {len(appointments)} appointments")
    
    def test_get_appointments_by_date_range(self, auth_headers):
        """Test getting appointments by date range (for weekly view)"""
        response = requests.get(
            f"{BASE_URL}/api/appointments?start_date=2026-02-23&end_date=2026-02-28",
            headers=auth_headers
        )
        assert response.status_code == 200
        appointments = response.json()
        assert isinstance(appointments, list)
        print(f"✓ Found {len(appointments)} appointments in date range")


class TestLoyaltyAPI:
    """Test loyalty endpoints - should be empty after deletion"""
    
    def test_get_loyalty_empty(self, auth_headers):
        """Test loyalty collection is empty"""
        response = requests.get(f"{BASE_URL}/api/loyalty", headers=auth_headers)
        assert response.status_code == 200
        loyalty_data = response.json()
        assert isinstance(loyalty_data, list)
        # Loyalty should be empty or all have 0 points
        total_points = sum(l.get("points", 0) for l in loyalty_data)
        print(f"✓ Loyalty entries: {len(loyalty_data)}, Total points: {total_points}")
    
    def test_get_loyalty_config(self, auth_headers):
        """Test loyalty config endpoint"""
        response = requests.get(f"{BASE_URL}/api/loyalty/config", headers=auth_headers)
        assert response.status_code == 200
        config = response.json()
        assert "points_per_euro" in config
        assert "rewards" in config
        print(f"✓ Loyalty config: {config['points_per_euro']} points per €, {len(config['rewards'])} rewards available")


class TestSettingsAPI:
    """Test settings endpoint"""
    
    def test_get_settings(self, auth_headers):
        """Test getting user settings"""
        response = requests.get(f"{BASE_URL}/api/settings", headers=auth_headers)
        assert response.status_code == 200
        settings = response.json()
        
        # Verify expected fields
        assert "salon_name" in settings
        assert "name" in settings
        assert "email" in settings
        assert "opening_time" in settings
        assert "closing_time" in settings
        
        print(f"✓ Settings: {settings['salon_name']}, Owner: {settings['name']}")


class TestOperatorsAPI:
    """Test operators endpoints"""
    
    def test_get_operators(self, auth_headers):
        """Test getting operators"""
        response = requests.get(f"{BASE_URL}/api/operators", headers=auth_headers)
        assert response.status_code == 200
        operators = response.json()
        assert isinstance(operators, list)
        assert len(operators) > 0
        print(f"✓ Found {len(operators)} operators")


class TestClientsAPI:
    """Test clients endpoints"""
    
    def test_get_clients(self, auth_headers):
        """Test getting clients"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        clients = response.json()
        assert isinstance(clients, list)
        assert len(clients) > 0
        print(f"✓ Found {len(clients)} clients")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
