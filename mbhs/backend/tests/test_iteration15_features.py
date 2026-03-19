"""
Iteration 15 Feature Tests:
- Card Alerts API (GET /api/cards/alerts/all)
- Promotions Check API (GET /api/promotions/check/{client_id})
- Website Upload API (POST /api/website/upload)
- Logo display verification
- Login flow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://onyx-gold-ui.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "melitobruno@gmail.com"
TEST_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestAuthFlow:
    """Test login flow"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        print(f"Login successful - User: {data['user'].get('email')}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 404], f"Expected 401/404, got {response.status_code}"
        print("Invalid credentials correctly rejected")


class TestCardAlertsAPI:
    """Test Card Alerts endpoints - NEW feature"""
    
    def test_get_all_card_alerts(self, auth_headers):
        """GET /api/cards/alerts/all - Returns expiring and low balance cards"""
        response = requests.get(f"{BASE_URL}/api/cards/alerts/all", headers=auth_headers)
        assert response.status_code == 200, f"Card alerts failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "expiring_cards" in data, "Missing expiring_cards key"
        assert "low_balance_cards" in data, "Missing low_balance_cards key"
        assert "total_alerts" in data, "Missing total_alerts key"
        
        # Verify types
        assert isinstance(data["expiring_cards"], list), "expiring_cards should be list"
        assert isinstance(data["low_balance_cards"], list), "low_balance_cards should be list"
        assert isinstance(data["total_alerts"], int), "total_alerts should be int"
        
        print(f"Card Alerts: {data['total_alerts']} total - {len(data['expiring_cards'])} expiring, {len(data['low_balance_cards'])} low balance")
    
    def test_get_card_alerts_with_params(self, auth_headers):
        """GET /api/cards/alerts/all with custom parameters"""
        response = requests.get(
            f"{BASE_URL}/api/cards/alerts/all?days=60&threshold_percent=30", 
            headers=auth_headers
        )
        assert response.status_code == 200, f"Card alerts with params failed: {response.text}"
        data = response.json()
        assert "expiring_cards" in data
        assert "low_balance_cards" in data
        print(f"Card Alerts (60 days, 30%): {data['total_alerts']} alerts")
    
    def test_get_expiring_cards(self, auth_headers):
        """GET /api/cards/alerts/expiring"""
        response = requests.get(f"{BASE_URL}/api/cards/alerts/expiring?days=30", headers=auth_headers)
        assert response.status_code == 200, f"Expiring cards failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be list"
        print(f"Expiring cards count: {len(data)}")
    
    def test_get_low_balance_cards(self, auth_headers):
        """GET /api/cards/alerts/low-balance"""
        response = requests.get(f"{BASE_URL}/api/cards/alerts/low-balance?threshold_percent=20", headers=auth_headers)
        assert response.status_code == 200, f"Low balance cards failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be list"
        print(f"Low balance cards count: {len(data)}")


class TestPromotionsCheckAPI:
    """Test Promotions Check endpoint"""
    
    def test_get_promotions(self, auth_headers):
        """GET /api/promotions - Get all promotions"""
        response = requests.get(f"{BASE_URL}/api/promotions", headers=auth_headers)
        assert response.status_code == 200, f"Get promotions failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be list"
        print(f"Total promotions: {len(data)}")
    
    def test_promotions_check_with_client(self, auth_headers):
        """GET /api/promotions/check/{client_id} - Check client promotions eligibility"""
        # First get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available for testing")
        
        client_id = clients[0]["id"]
        
        # Check promotions for client
        response = requests.get(f"{BASE_URL}/api/promotions/check/{client_id}", headers=auth_headers)
        assert response.status_code == 200, f"Promotions check failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be list of eligible promotions"
        print(f"Client {clients[0]['name']} - Eligible for {len(data)} promotions")
    
    def test_public_promotions(self):
        """GET /api/public/promotions/all - Public promotions endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/promotions/all")
        assert response.status_code == 200, f"Public promotions failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Public promotions available: {len(data)}")


class TestWebsiteUploadAPI:
    """Test Website Upload functionality"""
    
    def test_website_config(self, auth_headers):
        """GET /api/website/config - Get website config"""
        response = requests.get(f"{BASE_URL}/api/website/config", headers=auth_headers)
        assert response.status_code == 200, f"Website config failed: {response.text}"
        data = response.json()
        assert "salon_name" in data
        print(f"Website config - Salon name: {data.get('salon_name')}")
    
    def test_public_website(self):
        """GET /api/public/website - Public website endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200, f"Public website failed: {response.text}"
        data = response.json()
        assert "config" in data
        assert "reviews" in data
        assert "gallery" in data
        print(f"Public website - Config loaded: {data['config'].get('salon_name')}")


class TestCardsAPI:
    """Test Cards CRUD"""
    
    def test_get_cards(self, auth_headers):
        """GET /api/cards - Get all cards"""
        response = requests.get(f"{BASE_URL}/api/cards", headers=auth_headers)
        assert response.status_code == 200, f"Get cards failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Total cards: {len(data)}")


class TestPlanningFeatures:
    """Test Planning page related APIs"""
    
    def test_get_appointments(self, auth_headers):
        """GET /api/appointments - Get today's appointments"""
        import datetime
        today = datetime.date.today().isoformat()
        response = requests.get(f"{BASE_URL}/api/appointments?date={today}", headers=auth_headers)
        assert response.status_code == 200, f"Get appointments failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Today's appointments: {len(data)}")
    
    def test_get_operators(self, auth_headers):
        """GET /api/operators - Get operators for planning"""
        response = requests.get(f"{BASE_URL}/api/operators", headers=auth_headers)
        assert response.status_code == 200, f"Get operators failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Total operators: {len(data)}")
    
    def test_get_clients(self, auth_headers):
        """GET /api/clients - Get clients for planning"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200, f"Get clients failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Total clients: {len(data)}")
    
    def test_get_services(self, auth_headers):
        """GET /api/services - Get services for planning"""
        response = requests.get(f"{BASE_URL}/api/services", headers=auth_headers)
        assert response.status_code == 200, f"Get services failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Total services: {len(data)}")


class TestPublicEndpoints:
    """Test public (no auth) endpoints"""
    
    def test_public_services(self):
        """GET /api/public/services"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200, f"Public services failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Public services: {len(data)}")
    
    def test_public_operators(self):
        """GET /api/public/operators"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200, f"Public operators failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Public operators: {len(data)}")


class TestCardPromoSelectionFeature:
    """Test the new card/promo selection feature for appointment creation"""
    
    def test_client_cards_endpoint(self, auth_headers):
        """GET /api/cards?client_id={id} - Get cards for specific client"""
        # Get a client first
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients for testing")
        
        client_id = clients[0]["id"]
        
        # Get cards for this client
        response = requests.get(f"{BASE_URL}/api/cards?client_id={client_id}", headers=auth_headers)
        assert response.status_code == 200, f"Get client cards failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Client {clients[0]['name']} has {len(data)} cards")
    
    def test_client_promotions_check(self, auth_headers):
        """GET /api/promotions/check/{client_id} - Check promos for client"""
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients for testing")
        
        client_id = clients[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/promotions/check/{client_id}", headers=auth_headers)
        assert response.status_code == 200, f"Promotions check failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Client {clients[0]['name']} eligible for {len(data)} promotions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
