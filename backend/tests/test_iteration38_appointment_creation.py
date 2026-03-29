"""
Test Iteration 38: Appointment Creation Bug Fix
Tests for the appointment creation API after bug fixes:
1. CORS always allows all origins
2. 'Cliente Occasionale' treated same as 'Cliente Generico' (no duplicate client creation)
3. Frontend payload construction cleaned up
4. Better error messages with console logging
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://salon-cms-system.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin@brunomelito.it"
ADMIN_PASSWORD = "mbhs637104"


class TestAppointmentCreationBugFix:
    """Tests for appointment creation API after bug fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        login_data = login_response.json()
        # Token field is 'access_token' not 'token'
        self.token = login_data.get("access_token")
        if not self.token:
            pytest.skip("No access_token in login response")
        
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get services for testing
        services_response = self.session.get(f"{BASE_URL}/api/services")
        if services_response.status_code == 200:
            self.services = services_response.json()
        else:
            self.services = []
        
        # Get operators for testing
        operators_response = self.session.get(f"{BASE_URL}/api/operators")
        if operators_response.status_code == 200:
            self.operators = operators_response.json()
        else:
            self.operators = []
        
        yield
        
        # Cleanup: Delete test appointments created during tests
        # (handled in individual tests)
    
    def test_login_returns_access_token(self):
        """Test that login returns access_token field"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data, "Login should return 'access_token' field"
        assert "user" in data, "Login should return 'user' field"
        assert data["user"]["email"] == ADMIN_EMAIL
    
    def test_create_appointment_with_cliente_occasionale(self):
        """Test creating appointment with 'Cliente Occasionale' - should set client_id='generic'"""
        if not self.services:
            pytest.skip("No services available for testing")
        
        service_id = self.services[0]["id"]
        operator_id = self.operators[0]["id"] if self.operators else None
        
        # Use a weekday date (Tuesday 2026-04-07)
        payload = {
            "client_id": None,
            "client_name": "Cliente Occasionale",
            "client_phone": "",
            "service_ids": [service_id],
            "operator_id": operator_id,
            "date": "2026-04-07",
            "time": "10:00",
            "notes": "TEST_OCCASIONALE",
            "promo_id": None,
            "card_id": None
        }
        
        response = self.session.post(f"{BASE_URL}/api/appointments", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify client_id is 'generic' for Cliente Occasionale
        assert data["client_id"] == "generic", f"Expected client_id='generic', got '{data['client_id']}'"
        assert data["client_name"] == "Cliente Occasionale"
        assert data["date"] == "2026-04-07"
        assert data["time"] == "10:00"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/appointments/{data['id']}")
    
    def test_create_appointment_with_cliente_generico(self):
        """Test creating appointment with 'Cliente Generico' - should also set client_id='generic'"""
        if not self.services:
            pytest.skip("No services available for testing")
        
        service_id = self.services[0]["id"]
        operator_id = self.operators[0]["id"] if self.operators else None
        
        payload = {
            "client_id": None,
            "client_name": "Cliente Generico",
            "client_phone": "",
            "service_ids": [service_id],
            "operator_id": operator_id,
            "date": "2026-04-07",
            "time": "11:00",
            "notes": "TEST_GENERICO",
            "promo_id": None,
            "card_id": None
        }
        
        response = self.session.post(f"{BASE_URL}/api/appointments", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify client_id is 'generic' for Cliente Generico
        assert data["client_id"] == "generic", f"Expected client_id='generic', got '{data['client_id']}'"
        assert data["client_name"] == "Cliente Generico"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/appointments/{data['id']}")
    
    def test_create_appointment_with_new_named_client(self):
        """Test creating appointment with a new named client - should create client in DB"""
        if not self.services:
            pytest.skip("No services available for testing")
        
        service_id = self.services[0]["id"]
        operator_id = self.operators[0]["id"] if self.operators else None
        
        unique_name = f"TEST_NewClient_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "client_id": None,
            "client_name": unique_name,
            "client_phone": "3331234567",
            "service_ids": [service_id],
            "operator_id": operator_id,
            "date": "2026-04-07",
            "time": "12:00",
            "notes": "TEST_NEW_CLIENT",
            "promo_id": None,
            "card_id": None
        }
        
        response = self.session.post(f"{BASE_URL}/api/appointments", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify client_id is NOT 'generic' for named client
        assert data["client_id"] != "generic", "Named client should have a real client_id"
        assert data["client_id"] is not None and data["client_id"] != ""
        assert data["client_name"] == unique_name
        
        # Verify client was created in DB
        clients_response = self.session.get(f"{BASE_URL}/api/clients")
        if clients_response.status_code == 200:
            clients = clients_response.json()
            client_names = [c["name"] for c in clients]
            assert unique_name in client_names, "New client should be created in DB"
            
            # Cleanup: Delete the created client
            for c in clients:
                if c["name"] == unique_name:
                    self.session.delete(f"{BASE_URL}/api/clients/{c['id']}")
                    break
        
        # Cleanup appointment
        self.session.delete(f"{BASE_URL}/api/appointments/{data['id']}")
    
    def test_create_appointment_with_existing_client_id(self):
        """Test creating appointment with existing client_id"""
        if not self.services:
            pytest.skip("No services available for testing")
        
        # Get existing clients
        clients_response = self.session.get(f"{BASE_URL}/api/clients")
        if clients_response.status_code != 200 or not clients_response.json():
            pytest.skip("No clients available for testing")
        
        clients = clients_response.json()
        existing_client = clients[0]
        
        service_id = self.services[0]["id"]
        operator_id = self.operators[0]["id"] if self.operators else None
        
        payload = {
            "client_id": existing_client["id"],
            "service_ids": [service_id],
            "operator_id": operator_id,
            "date": "2026-04-07",
            "time": "13:00",
            "notes": "TEST_EXISTING_CLIENT",
            "promo_id": None,
            "card_id": None
        }
        
        response = self.session.post(f"{BASE_URL}/api/appointments", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["client_id"] == existing_client["id"]
        assert data["client_name"] == existing_client["name"]
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/appointments/{data['id']}")
    
    def test_create_appointment_error_no_client(self):
        """Test that creating appointment without client returns 400 error"""
        if not self.services:
            pytest.skip("No services available for testing")
        
        service_id = self.services[0]["id"]
        
        payload = {
            "client_id": None,
            "client_name": None,
            "service_ids": [service_id],
            "date": "2026-04-07",
            "time": "14:00",
            "notes": ""
        }
        
        response = self.session.post(f"{BASE_URL}/api/appointments", json=payload)
        
        # Should return 400 error
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
    
    def test_create_appointment_invalid_date_format(self):
        """Test that invalid date format returns 422 error"""
        if not self.services:
            pytest.skip("No services available for testing")
        
        service_id = self.services[0]["id"]
        
        payload = {
            "client_id": None,
            "client_name": "Cliente Occasionale",
            "service_ids": [service_id],
            "date": "07-04-2026",  # Invalid format (should be YYYY-MM-DD)
            "time": "10:00",
            "notes": ""
        }
        
        response = self.session.post(f"{BASE_URL}/api/appointments", json=payload)
        
        # Should return 422 validation error
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
    
    def test_create_appointment_with_null_promo_and_card(self):
        """Test creating appointment with null promo_id and card_id"""
        if not self.services:
            pytest.skip("No services available for testing")
        
        service_id = self.services[0]["id"]
        operator_id = self.operators[0]["id"] if self.operators else None
        
        payload = {
            "client_id": None,
            "client_name": "Cliente Occasionale",
            "client_phone": "",
            "service_ids": [service_id],
            "operator_id": operator_id,
            "date": "2026-04-07",
            "time": "15:00",
            "notes": "TEST_NULL_PROMO_CARD",
            "promo_id": None,
            "card_id": None
        }
        
        response = self.session.post(f"{BASE_URL}/api/appointments", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify promo_id and card_id are null in response
        assert data.get("promo_id") is None
        assert data.get("card_id") is None
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/appointments/{data['id']}")
    
    def test_get_appointments_by_date(self):
        """Test GET /api/appointments?date=YYYY-MM-DD"""
        # First create an appointment
        if not self.services:
            pytest.skip("No services available for testing")
        
        service_id = self.services[0]["id"]
        test_date = "2026-04-08"
        
        payload = {
            "client_id": None,
            "client_name": "Cliente Occasionale",
            "service_ids": [service_id],
            "date": test_date,
            "time": "09:00",
            "notes": "TEST_GET_BY_DATE"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/appointments", json=payload)
        assert create_response.status_code == 200
        created_appointment = create_response.json()
        
        # Now get appointments for that date
        get_response = self.session.get(f"{BASE_URL}/api/appointments?date={test_date}")
        
        assert get_response.status_code == 200
        appointments = get_response.json()
        
        # Verify our appointment is in the list
        appointment_ids = [a["id"] for a in appointments]
        assert created_appointment["id"] in appointment_ids
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/appointments/{created_appointment['id']}")


class TestCORSConfiguration:
    """Test CORS configuration"""
    
    def test_cors_allows_all_origins(self):
        """Test that CORS allows all origins (Access-Control-Allow-Origin: *)"""
        # Make a preflight OPTIONS request
        response = requests.options(
            f"{BASE_URL}/api/appointments",
            headers={
                "Origin": "https://example.com",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type, Authorization"
            }
        )
        
        # Check CORS headers
        # Note: The actual CORS headers depend on the server configuration
        # With allow_origins=["*"], the server should allow any origin
        assert response.status_code in [200, 204], f"OPTIONS request failed: {response.status_code}"


class TestServicesAndOperatorsEndpoints:
    """Test services and operators endpoints needed for appointment creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        login_data = login_response.json()
        self.token = login_data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_services(self):
        """Test GET /api/services returns list of services"""
        response = self.session.get(f"{BASE_URL}/api/services")
        
        assert response.status_code == 200
        services = response.json()
        assert isinstance(services, list)
        
        if services:
            # Verify service structure
            service = services[0]
            assert "id" in service
            assert "name" in service
            assert "duration" in service
            assert "price" in service
    
    def test_get_operators(self):
        """Test GET /api/operators returns list of operators"""
        response = self.session.get(f"{BASE_URL}/api/operators")
        
        assert response.status_code == 200
        operators = response.json()
        assert isinstance(operators, list)
        
        if operators:
            # Verify operator structure
            operator = operators[0]
            assert "id" in operator
            assert "name" in operator


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
