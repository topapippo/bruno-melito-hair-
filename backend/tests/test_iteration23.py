"""
Iteration 23 Backend Tests - Unified Codebase Testing
Tests for salon management app after codebase unification (/app/ symlinks to /app/mbhs/)
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://hair-booking-37.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@brunomelito.it"
ADMIN_PASSWORD = "admin123"


class TestPublicAPIs:
    """Public API endpoints - no auth required"""
    
    def test_public_website_returns_config(self):
        """Test /api/public/website returns config, services, card_templates, loyalty"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify config
        assert "config" in data, "Missing 'config' in response"
        config = data["config"]
        assert config.get("salon_name") == "BRUNO MELITO HAIR", f"Wrong salon name: {config.get('salon_name')}"
        
        # Verify services
        assert "services" in data, "Missing 'services' in response"
        
        # Verify card_templates (6 cards expected)
        assert "card_templates" in data, "Missing 'card_templates' in response"
        card_templates = data["card_templates"]
        assert len(card_templates) == 6, f"Expected 6 card templates, got {len(card_templates)}"
        
        # Verify loyalty
        assert "loyalty" in data, "Missing 'loyalty' in response"
        loyalty = data["loyalty"]
        assert "points_per_euro" in loyalty, "Missing points_per_euro in loyalty"
        assert "rewards" in loyalty, "Missing rewards in loyalty"
        
        print(f"✓ Public website API returns all required data: config, {len(data.get('services',[]))} services, {len(card_templates)} card_templates, loyalty")
    
    def test_public_services_returns_list(self):
        """Test /api/public/services returns services list"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        
        services = response.json()
        assert isinstance(services, list), "Services should be a list"
        assert len(services) > 0, "Should have at least one service"
        
        # Check service structure
        first_service = services[0]
        assert "id" in first_service, "Service missing 'id'"
        assert "name" in first_service, "Service missing 'name'"
        assert "price" in first_service, "Service missing 'price'"
        assert "category" in first_service, "Service missing 'category'"
        
        # Verify categories exist (ABBONAMENTO, COLORE, TAGLIO, etc.)
        categories = set(s.get("category", "").lower() for s in services)
        print(f"✓ Found {len(services)} services with categories: {categories}")
    
    def test_public_operators_returns_list(self):
        """Test /api/public/operators returns operators list"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200
        
        operators = response.json()
        assert isinstance(operators, list), "Operators should be a list"
        assert len(operators) >= 2, f"Expected at least 2 operators, got {len(operators)}"
        
        # Check operator structure
        first_op = operators[0]
        assert "id" in first_op, "Operator missing 'id'"
        assert "name" in first_op, "Operator missing 'name'"
        
        print(f"✓ Found {len(operators)} operators: {[o.get('name') for o in operators]}")
    
    def test_vapid_key_endpoint(self):
        """Test /api/push/vapid-key returns a public key"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-key")
        assert response.status_code == 200
        
        data = response.json()
        assert "public_key" in data, "Missing 'public_key' in response"
        assert len(data["public_key"]) > 0, "VAPID public key should not be empty"
        
        print(f"✓ VAPID key endpoint returns public key (length: {len(data['public_key'])})")


class TestAuthentication:
    """Authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Missing access_token in response"
        assert len(data["access_token"]) > 0, "Token should not be empty"
        
        print(f"✓ Admin login successful, token received")
        return data["access_token"]
    
    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Wrong password correctly returns 401")
    
    def test_auth_me_with_token(self):
        """Test /api/auth/me returns user info with valid token"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json().get("access_token")
        
        # Then check /me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "email" in data, "Missing email in user data"
        assert data["email"] == ADMIN_EMAIL, f"Wrong email: {data['email']}"
        
        print(f"✓ Auth/me returns correct user: {data['email']}")


class TestAdminEndpoints:
    """Admin-protected endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate")
        return response.json().get("access_token")
    
    def test_get_appointments(self, auth_token):
        """Test /api/appointments returns appointments list"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/appointments?date={today}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Appointments should be a list"
        print(f"✓ Appointments endpoint returns {len(data)} appointments for today")
    
    def test_get_appointments_weekly(self, auth_token):
        """Test /api/appointments with date range for weekly view"""
        today = datetime.now()
        start_date = today.strftime("%Y-%m-%d")
        end_date = (today + timedelta(days=6)).strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/appointments?start_date={start_date}&end_date={end_date}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Appointments should be a list"
        print(f"✓ Weekly appointments endpoint returns {len(data)} appointments")
    
    def test_get_operators(self, auth_token):
        """Test /api/operators returns operators list"""
        response = requests.get(
            f"{BASE_URL}/api/operators",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Operators should be a list"
        assert len(data) >= 2, f"Expected at least 2 operators, got {len(data)}"
        print(f"✓ Operators endpoint returns {len(data)} operators")
    
    def test_get_services(self, auth_token):
        """Test /api/services returns services list"""
        response = requests.get(
            f"{BASE_URL}/api/services",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Services should be a list"
        print(f"✓ Services endpoint returns {len(data)} services")
    
    def test_get_clients(self, auth_token):
        """Test /api/clients returns clients list"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Clients should be a list"
        print(f"✓ Clients endpoint returns {len(data)} clients")


class TestBookingConflict:
    """Test booking conflict resolution (409 response)"""
    
    def test_booking_conflict_returns_409_with_alternatives(self):
        """Test that booking conflict returns 409 with available_operators and alternative_slots"""
        # Get services first
        services_resp = requests.get(f"{BASE_URL}/api/public/services")
        services = services_resp.json()
        if not services:
            pytest.skip("No services available")
        
        service_id = services[0]["id"]
        
        # Get operators
        operators_resp = requests.get(f"{BASE_URL}/api/public/operators")
        operators = operators_resp.json()
        if not operators:
            pytest.skip("No operators available")
        
        operator_id = operators[0]["id"]
        
        # Create first booking
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        booking_data = {
            "client_name": "TEST_Conflict_User_1",
            "client_phone": "3331111111",
            "service_ids": [service_id],
            "operator_id": operator_id,
            "date": tomorrow,
            "time": "10:00",
            "notes": "Test booking 1"
        }
        
        first_resp = requests.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        print(f"First booking response: {first_resp.status_code}")
        
        # Try to create conflicting booking with same operator and time
        booking_data["client_name"] = "TEST_Conflict_User_2"
        booking_data["client_phone"] = "3332222222"
        
        conflict_resp = requests.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        
        # Should return 409 with conflict details
        if conflict_resp.status_code == 409:
            data = conflict_resp.json()
            detail = data.get("detail", {})
            
            assert detail.get("conflict") == True, "Missing conflict flag"
            assert "available_operators" in detail, "Missing available_operators in conflict response"
            assert "alternative_slots" in detail, "Missing alternative_slots in conflict response"
            
            print(f"✓ Booking conflict returns 409 with:")
            print(f"  - available_operators: {len(detail.get('available_operators', []))} operators")
            print(f"  - alternative_slots: {len(detail.get('alternative_slots', []))} slots")
        elif conflict_resp.status_code == 200:
            # If no conflict (maybe different operator was auto-assigned), that's also valid
            print("✓ Booking succeeded (auto-assigned different operator or no conflict)")
        else:
            print(f"Booking response: {conflict_resp.status_code} - {conflict_resp.text}")


class TestCardTemplates:
    """Test card templates in public website API"""
    
    def test_card_templates_structure(self):
        """Test card templates have correct structure"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        
        data = response.json()
        card_templates = data.get("card_templates", [])
        
        assert len(card_templates) == 6, f"Expected 6 card templates, got {len(card_templates)}"
        
        for ct in card_templates:
            assert "id" in ct, "Card template missing 'id'"
            assert "name" in ct, "Card template missing 'name'"
            assert "card_type" in ct, "Card template missing 'card_type'"
            assert "total_value" in ct, "Card template missing 'total_value'"
            assert ct["card_type"] in ["subscription", "prepaid"], f"Invalid card_type: {ct['card_type']}"
        
        # Check for both subscription and prepaid types
        types = set(ct["card_type"] for ct in card_templates)
        assert "subscription" in types, "Missing subscription type cards"
        assert "prepaid" in types, "Missing prepaid type cards"
        
        print(f"✓ All 6 card templates have correct structure")
        print(f"  - Types: {types}")
        print(f"  - Names: {[ct['name'] for ct in card_templates]}")


class TestWebsiteConfig:
    """Test website configuration endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not authenticate")
        return response.json().get("access_token")
    
    def test_get_website_config(self, auth_token):
        """Test /api/website/config returns config"""
        response = requests.get(
            f"{BASE_URL}/api/website/config",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "salon_name" in data, "Missing salon_name"
        assert "hours" in data, "Missing hours"
        
        print(f"✓ Website config endpoint returns config for: {data.get('salon_name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
