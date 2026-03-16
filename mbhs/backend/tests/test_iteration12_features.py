"""
Iteration 12 Backend Tests
Features tested:
1. Public appointment management (GET /api/public/my-appointments, PUT /api/public/appointments/{id}, DELETE /api/public/appointments/{id})
2. Color expiry reminders (GET /api/reminders/color-expiry)
3. Loyalty points adjustment (PUT /api/loyalty/{client_id}/adjust-points)
4. Expenses quick presets (existing endpoint, verify data flow)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://melito-public-site.preview.emergentagent.com')

@pytest.fixture(scope="module")
def auth_token():
    """Get auth token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "melitobruno@gmail.com",
        "password": "password123"
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestPublicAppointmentManagement:
    """Feature 3: Public appointment management endpoints"""
    
    def test_public_my_appointments_with_invalid_phone(self):
        """Test looking up appointments with non-existent phone"""
        response = requests.get(f"{BASE_URL}/api/public/my-appointments?phone=0000000000")
        assert response.status_code == 200
        data = response.json()
        # Should return empty list for unknown phone
        assert isinstance(data, list)
    
    def test_public_update_appointment_no_phone(self):
        """Test updating appointment without phone fails"""
        response = requests.put(f"{BASE_URL}/api/public/appointments/fake-id", json={
            "date": "2026-02-01",
            "time": "10:00"
        })
        # Should fail because no phone provided
        assert response.status_code == 400
        assert "telefono" in response.json().get("detail", "").lower() or "phone" in response.json().get("detail", "").lower()
    
    def test_public_update_appointment_invalid_id(self):
        """Test updating non-existent appointment"""
        response = requests.put(f"{BASE_URL}/api/public/appointments/nonexistent-id", json={
            "phone": "1234567890",
            "date": "2026-02-01",
            "time": "10:00"
        })
        # Should return 404 for invalid appointment
        assert response.status_code == 404
    
    def test_public_cancel_appointment_invalid_id(self):
        """Test canceling non-existent appointment"""
        response = requests.delete(f"{BASE_URL}/api/public/appointments/nonexistent-id?phone=1234567890")
        assert response.status_code == 404


class TestColorExpiryReminders:
    """Feature 6: Color expiry reminders (30+ days)"""
    
    def test_color_expiry_endpoint_exists(self, auth_headers):
        """Test color expiry endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/reminders/color-expiry", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_color_expiry_response_structure(self, auth_headers):
        """Test color expiry response has correct structure"""
        response = requests.get(f"{BASE_URL}/api/reminders/color-expiry", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            item = data[0]
            # Verify expected fields
            assert "client_id" in item
            assert "client_name" in item
            assert "last_color_date" in item
            assert "days_ago" in item
            assert "phone" in item
            assert "already_sent" in item


class TestLoyaltyPointsAdjustment:
    """Feature 7 & 8: Loyalty points display and adjustment"""
    
    def test_adjust_points_endpoint_exists(self, auth_headers):
        """Test adjust points endpoint accepts PUT"""
        # First get a client
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        clients = response.json()
        
        if len(clients) > 0:
            client_id = clients[0]["id"]
            
            # Try to adjust points (add 0 points for testing)
            response = requests.put(
                f"{BASE_URL}/api/loyalty/{client_id}/adjust-points",
                headers=auth_headers,
                json={"points": 0, "reason": "Test"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "new_points" in data
            assert "success" in data
    
    def test_adjust_points_add_points(self, auth_headers):
        """Test adding points to client"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        clients = response.json()
        
        if len(clients) > 0:
            client_id = clients[0]["id"]
            
            # Get current loyalty
            loyalty_res = requests.get(f"{BASE_URL}/api/clients/{client_id}/loyalty", headers=auth_headers)
            assert loyalty_res.status_code == 200
            initial_points = loyalty_res.json().get("points", 0)
            
            # Add points
            response = requests.put(
                f"{BASE_URL}/api/loyalty/{client_id}/adjust-points",
                headers=auth_headers,
                json={"points": 5, "reason": "Test add points"}
            )
            assert response.status_code == 200
            new_points = response.json()["new_points"]
            assert new_points == initial_points + 5
            
            # Remove points to restore
            requests.put(
                f"{BASE_URL}/api/loyalty/{client_id}/adjust-points",
                headers=auth_headers,
                json={"points": -5, "reason": "Test cleanup"}
            )
    
    def test_adjust_points_cannot_go_negative(self, auth_headers):
        """Test points cannot go below zero"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        clients = response.json()
        
        if len(clients) > 0:
            client_id = clients[0]["id"]
            
            # Try to remove 99999 points
            response = requests.put(
                f"{BASE_URL}/api/loyalty/{client_id}/adjust-points",
                headers=auth_headers,
                json={"points": -99999, "reason": "Test negative"}
            )
            assert response.status_code == 200
            # Should be capped at 0
            assert response.json()["new_points"] >= 0


class TestRemindersPage:
    """Feature 5: Reminders page - Cancel button for sent reminders"""
    
    def test_tomorrow_reminders_endpoint(self, auth_headers):
        """Test tomorrow reminders endpoint"""
        response = requests.get(f"{BASE_URL}/api/reminders/tomorrow", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_inactive_clients_endpoint(self, auth_headers):
        """Test inactive clients endpoint"""
        response = requests.get(f"{BASE_URL}/api/reminders/inactive-clients", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestExpensesPresets:
    """Feature 4: Expenses page preset buttons (15gg, 30gg, 60gg, Annuale)"""
    
    def test_expenses_endpoint(self, auth_headers):
        """Test expenses endpoint works"""
        response = requests.get(f"{BASE_URL}/api/expenses", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_expense_with_preset_dates(self, auth_headers):
        """Test creating expense with preset-style due dates"""
        today = datetime.now()
        
        # Test 15 day preset
        due_15 = (today + timedelta(days=15)).strftime("%Y-%m-%d")
        response = requests.post(f"{BASE_URL}/api/expenses", headers=auth_headers, json={
            "description": "TEST_Preset15",
            "amount": 100.0,
            "category": "altro",
            "due_date": due_15
        })
        assert response.status_code in [200, 201]
        expense_id = response.json().get("id")
        
        # Clean up
        if expense_id:
            requests.delete(f"{BASE_URL}/api/expenses/{expense_id}", headers=auth_headers)
    
    def test_create_expense_with_annual_preset(self, auth_headers):
        """Test creating expense with annual preset (365 days)"""
        today = datetime.now()
        due_annual = (today + timedelta(days=365)).strftime("%Y-%m-%d")
        
        response = requests.post(f"{BASE_URL}/api/expenses", headers=auth_headers, json={
            "description": "TEST_PresetAnnual",
            "amount": 500.0,
            "category": "affitto",
            "due_date": due_annual
        })
        assert response.status_code in [200, 201]
        expense_id = response.json().get("id")
        
        # Clean up
        if expense_id:
            requests.delete(f"{BASE_URL}/api/expenses/{expense_id}", headers=auth_headers)


class TestRegressionAuth:
    """Regression: Auth endpoints still work"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


class TestRegressionPlanning:
    """Regression: Planning-related endpoints"""
    
    def test_appointments_endpoint(self, auth_headers):
        """Test appointments endpoint"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/appointments?date={today}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_operators_endpoint(self, auth_headers):
        """Test operators endpoint"""
        response = requests.get(f"{BASE_URL}/api/operators", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_services_endpoint(self, auth_headers):
        """Test services endpoint"""
        response = requests.get(f"{BASE_URL}/api/services", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
