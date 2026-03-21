"""
Test suite for MBHS SALON features - Iteration 6
Tests: Planning page, new client options, payment methods, recurring appointments,
       prepaid cards, client cards/loyalty endpoints, Modellanti services
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://salon-booking-fix-6.preview.emergentagent.com')

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "melitobruno@gmail.com",
        "password": "password123"
    })
    if response.status_code != 200:
        pytest.skip("Authentication failed - skipping authenticated tests")
    return response.json().get("access_token")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def test_client_id(auth_headers):
    """Get first client ID for tests"""
    response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]["id"]
    return None

@pytest.fixture(scope="module")
def test_service_id(auth_headers):
    """Get first service ID for tests"""
    response = requests.get(f"{BASE_URL}/api/services", headers=auth_headers)
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]["id"]
    return None


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "melitobruno@gmail.com"
    
    def test_login_invalid_credentials(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


class TestOperators:
    """Operator tests - including MBHS operator"""
    
    def test_get_operators(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/operators", headers=auth_headers)
        assert response.status_code == 200
        operators = response.json()
        assert isinstance(operators, list)
    
    def test_mbhs_operator_exists(self, auth_headers):
        """Test that MBHS operator is present"""
        response = requests.get(f"{BASE_URL}/api/operators", headers=auth_headers)
        assert response.status_code == 200
        operators = response.json()
        mbhs_operators = [op for op in operators if "MBHS" in op["name"]]
        assert len(mbhs_operators) > 0, "MBHS operator should exist"
        assert mbhs_operators[0]["active"] == True


class TestServices:
    """Service tests - including Modellanti category"""
    
    def test_get_services(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/services", headers=auth_headers)
        assert response.status_code == 200
        services = response.json()
        assert isinstance(services, list)
        assert len(services) > 0
    
    def test_modellanti_services_exist(self, auth_headers):
        """Test that Modellanti category has 5 services"""
        response = requests.get(f"{BASE_URL}/api/services", headers=auth_headers)
        assert response.status_code == 200
        services = response.json()
        modellanti_services = [s for s in services if s.get("category") == "modellanti"]
        assert len(modellanti_services) == 5, f"Expected 5 Modellanti services, got {len(modellanti_services)}"
        
        # Verify service names
        service_names = [s["name"] for s in modellanti_services]
        expected_keywords = ["Permanente", "Stiratura", "Ondulazione"]
        for kw in expected_keywords:
            assert any(kw in name for name in service_names), f"Service containing '{kw}' should exist"


class TestAppointments:
    """Appointment tests - including new client creation"""
    
    def test_create_appointment_with_client_id(self, auth_headers, test_client_id, test_service_id):
        """Test creating appointment with existing client_id"""
        if not test_client_id or not test_service_id:
            pytest.skip("No test client or service available")
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.post(f"{BASE_URL}/api/appointments", headers=auth_headers, json={
            "client_id": test_client_id,
            "service_ids": [test_service_id],
            "date": today,
            "time": "17:00",
            "notes": "Test appointment with client_id"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["client_id"] == test_client_id
        assert data["status"] == "scheduled"
    
    def test_create_appointment_with_client_name_new_client(self, auth_headers, test_service_id):
        """Test creating appointment with client_name (creates new client)"""
        if not test_service_id:
            pytest.skip("No test service available")
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.post(f"{BASE_URL}/api/appointments", headers=auth_headers, json={
            "client_name": f"TEST_NewClient_{datetime.now().timestamp()}",
            "client_phone": "333-000-0000",
            "service_ids": [test_service_id],
            "date": today,
            "time": "17:30",
            "notes": "Test new client via appointment"
        })
        assert response.status_code == 200
        data = response.json()
        assert "client_id" in data
        assert data["client_id"] != "generic"  # New client was created
        assert data["status"] == "scheduled"
    
    def test_create_appointment_with_generic_client(self, auth_headers, test_service_id):
        """Test creating appointment with Cliente Generico"""
        if not test_service_id:
            pytest.skip("No test service available")
        
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.post(f"{BASE_URL}/api/appointments", headers=auth_headers, json={
            "client_name": "Cliente Generico",
            "service_ids": [test_service_id],
            "date": today,
            "time": "18:00"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["client_id"] == "generic"
        assert data["client_name"] == "Cliente Generico"


class TestClientCardsAndLoyalty:
    """Client cards and loyalty endpoints tests"""
    
    def test_get_client_cards(self, auth_headers, test_client_id):
        """Test GET /api/clients/{client_id}/cards"""
        if not test_client_id:
            pytest.skip("No test client available")
        
        response = requests.get(f"{BASE_URL}/api/clients/{test_client_id}/cards", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)  # Returns array (empty if no cards)
    
    def test_get_client_loyalty(self, auth_headers, test_client_id):
        """Test GET /api/clients/{client_id}/loyalty"""
        if not test_client_id:
            pytest.skip("No test client available")
        
        response = requests.get(f"{BASE_URL}/api/clients/{test_client_id}/loyalty", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "points" in data
        assert "total_earned" in data


class TestRecurringAppointments:
    """Recurring appointments tests"""
    
    def test_create_recurring_weekly(self, auth_headers, test_client_id, test_service_id):
        """Test creating recurring appointments with weeks"""
        if not test_client_id or not test_service_id:
            pytest.skip("No test data available")
        
        # First create a base appointment
        today = datetime.now().strftime("%Y-%m-%d")
        create_resp = requests.post(f"{BASE_URL}/api/appointments", headers=auth_headers, json={
            "client_id": test_client_id,
            "service_ids": [test_service_id],
            "date": today,
            "time": "10:00"
        })
        if create_resp.status_code != 200:
            pytest.skip("Could not create base appointment")
        
        apt_id = create_resp.json()["id"]
        
        # Create recurring with weeks
        response = requests.post(f"{BASE_URL}/api/appointments/recurring", headers=auth_headers, json={
            "appointment_id": apt_id,
            "repeat_weeks": 2,
            "repeat_months": 0,
            "repeat_count": 3
        })
        assert response.status_code == 200
        data = response.json()
        assert data["created"] == 3
    
    def test_create_recurring_monthly(self, auth_headers, test_client_id, test_service_id):
        """Test creating recurring appointments with months"""
        if not test_client_id or not test_service_id:
            pytest.skip("No test data available")
        
        # First create a base appointment
        today = datetime.now().strftime("%Y-%m-%d")
        create_resp = requests.post(f"{BASE_URL}/api/appointments", headers=auth_headers, json={
            "client_id": test_client_id,
            "service_ids": [test_service_id],
            "date": today,
            "time": "11:00"
        })
        if create_resp.status_code != 200:
            pytest.skip("Could not create base appointment")
        
        apt_id = create_resp.json()["id"]
        
        # Create recurring with months
        response = requests.post(f"{BASE_URL}/api/appointments/recurring", headers=auth_headers, json={
            "appointment_id": apt_id,
            "repeat_weeks": 0,
            "repeat_months": 1,
            "repeat_count": 2
        })
        assert response.status_code == 200
        data = response.json()
        assert data["created"] == 2


class TestCheckout:
    """Checkout/payment tests"""
    
    def test_checkout_with_cash(self, auth_headers, test_client_id, test_service_id):
        """Test checkout with cash payment"""
        if not test_client_id or not test_service_id:
            pytest.skip("No test data available")
        
        # Create appointment
        today = datetime.now().strftime("%Y-%m-%d")
        create_resp = requests.post(f"{BASE_URL}/api/appointments", headers=auth_headers, json={
            "client_id": test_client_id,
            "service_ids": [test_service_id],
            "date": today,
            "time": "12:00"
        })
        if create_resp.status_code != 200:
            pytest.skip("Could not create appointment")
        
        apt_data = create_resp.json()
        apt_id = apt_data["id"]
        total_price = apt_data["total_price"]
        
        # Checkout
        response = requests.post(f"{BASE_URL}/api/appointments/{apt_id}/checkout", headers=auth_headers, json={
            "payment_method": "cash",
            "discount_type": "none",
            "discount_value": 0,
            "total_paid": total_price
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "payment_id" in data
    
    def test_checkout_with_prepaid_no_card(self, auth_headers, test_client_id, test_service_id):
        """Test checkout with prepaid but no card_id (should still work)"""
        if not test_client_id or not test_service_id:
            pytest.skip("No test data available")
        
        # Create appointment
        today = datetime.now().strftime("%Y-%m-%d")
        create_resp = requests.post(f"{BASE_URL}/api/appointments", headers=auth_headers, json={
            "client_id": test_client_id,
            "service_ids": [test_service_id],
            "date": today,
            "time": "13:00"
        })
        if create_resp.status_code != 200:
            pytest.skip("Could not create appointment")
        
        apt_data = create_resp.json()
        apt_id = apt_data["id"]
        total_price = apt_data["total_price"]
        
        # Checkout with prepaid but no card
        response = requests.post(f"{BASE_URL}/api/appointments/{apt_id}/checkout", headers=auth_headers, json={
            "payment_method": "prepaid",
            "discount_type": "none",
            "discount_value": 0,
            "total_paid": total_price,
            "card_id": None
        })
        assert response.status_code == 200


class TestPrepaidCards:
    """Prepaid cards tests"""
    
    def test_get_cards(self, auth_headers):
        """Test GET /api/cards"""
        response = requests.get(f"{BASE_URL}/api/cards", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_prepaid_card(self, auth_headers, test_client_id):
        """Test creating a prepaid card"""
        if not test_client_id:
            pytest.skip("No test client available")
        
        response = requests.post(f"{BASE_URL}/api/cards", headers=auth_headers, json={
            "client_id": test_client_id,
            "card_type": "prepaid",
            "name": "TEST_Card_10_Services",
            "total_value": 100.00,
            "total_services": 10,
            "notes": "Test card"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["client_id"] == test_client_id
        assert data["total_value"] == 100.00
        assert data["remaining_value"] == 100.00
        assert data["active"] == True


class TestPaymentsReport:
    """Payments/Report tests"""
    
    def test_get_payments(self, auth_headers):
        """Test GET /api/payments"""
        response = requests.get(f"{BASE_URL}/api/payments", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
