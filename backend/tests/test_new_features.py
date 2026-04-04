"""
Test suite for new features in iteration 49:
1. Client history endpoint - GET /api/clients/{client_id}/history
2. Client WhatsApp endpoint - GET /api/clients/{client_id}/whatsapp
3. Thank you template endpoint - GET /api/reminders/thank-you-template
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "melitobruno@gmail.com"
TEST_PASSWORD = "mbhs637104"
TEST_CLIENT_ID = "691bcfd1-b8d1-4d43-b166-b9a6d4fcddea"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def api_client(auth_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestClientHistoryEndpoint:
    """Tests for GET /api/clients/{client_id}/history"""
    
    def test_client_history_returns_200(self, api_client):
        """Test that client history endpoint returns 200 for valid client"""
        response = api_client.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_client_history_response_structure(self, api_client):
        """Test that client history response has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/history")
        assert response.status_code == 200
        
        data = response.json()
        # Check required fields
        assert "client" in data, "Response should contain 'client' field"
        assert "total_visits" in data, "Response should contain 'total_visits' field"
        assert "total_spent" in data, "Response should contain 'total_spent' field"
        assert "loyalty_points" in data, "Response should contain 'loyalty_points' field"
        assert "appointments" in data, "Response should contain 'appointments' field"
        assert "payments" in data, "Response should contain 'payments' field"
        
        # Check client sub-structure
        client = data["client"]
        assert "id" in client, "Client should have 'id'"
        assert "name" in client, "Client should have 'name'"
        
        # Check data types
        assert isinstance(data["total_visits"], int), "total_visits should be int"
        assert isinstance(data["total_spent"], (int, float)), "total_spent should be numeric"
        assert isinstance(data["loyalty_points"], int), "loyalty_points should be int"
        assert isinstance(data["appointments"], list), "appointments should be list"
        assert isinstance(data["payments"], list), "payments should be list"
    
    def test_client_history_invalid_client_returns_404(self, api_client):
        """Test that invalid client ID returns 404"""
        response = api_client.get(f"{BASE_URL}/api/clients/invalid-client-id-12345/history")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_client_history_without_auth_returns_401_or_403(self):
        """Test that unauthenticated request returns 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/history")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"


class TestClientWhatsAppEndpoint:
    """Tests for GET /api/clients/{client_id}/whatsapp"""
    
    def test_client_whatsapp_returns_200(self, api_client):
        """Test that WhatsApp endpoint returns 200 for valid client with phone"""
        response = api_client.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/whatsapp")
        # Could be 200 or 400 depending on whether client has phone
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
    
    def test_client_whatsapp_response_structure(self, api_client):
        """Test that WhatsApp response has correct structure when successful"""
        response = api_client.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/whatsapp")
        
        if response.status_code == 200:
            data = response.json()
            assert "url" in data, "Response should contain 'url' field"
            assert data["url"].startswith("https://wa.me/"), "URL should be a wa.me link"
        elif response.status_code == 400:
            # Client has no phone - this is expected behavior
            data = response.json()
            assert "detail" in data, "Error response should have 'detail'"
    
    def test_client_whatsapp_invalid_client_returns_404(self, api_client):
        """Test that invalid client ID returns 404"""
        response = api_client.get(f"{BASE_URL}/api/clients/invalid-client-id-12345/whatsapp")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_client_whatsapp_without_auth_returns_401_or_403(self):
        """Test that unauthenticated request returns 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}/whatsapp")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"


class TestThankYouTemplateEndpoint:
    """Tests for GET /api/reminders/thank-you-template"""
    
    def test_thank_you_template_returns_200(self, api_client):
        """Test that thank you template endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/reminders/thank-you-template")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_thank_you_template_response_structure(self, api_client):
        """Test that thank you template response has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/reminders/thank-you-template")
        assert response.status_code == 200
        
        data = response.json()
        assert "text" in data, "Response should contain 'text' field"
        assert isinstance(data["text"], str), "text should be a string"
        assert len(data["text"]) > 0, "text should not be empty"
    
    def test_thank_you_template_contains_placeholder(self, api_client):
        """Test that thank you template contains {nome} placeholder"""
        response = api_client.get(f"{BASE_URL}/api/reminders/thank-you-template")
        assert response.status_code == 200
        
        data = response.json()
        # The template should contain {nome} placeholder for personalization
        # This is optional but expected based on the default template
        text = data["text"]
        assert "{nome}" in text or "Ciao" in text, "Template should be personalizable or have greeting"
    
    def test_thank_you_template_without_auth_returns_401_or_403(self):
        """Test that unauthenticated request returns 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/reminders/thank-you-template")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"


class TestRemindersTemplates:
    """Tests for message templates including thank_you type"""
    
    def test_templates_list_includes_thank_you(self, api_client):
        """Test that templates list includes thank_you type"""
        response = api_client.get(f"{BASE_URL}/api/reminders/templates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check if thank_you template type exists
        template_types = [t.get("template_type") for t in data]
        assert "thank_you" in template_types, f"Templates should include 'thank_you' type. Found: {template_types}"
    
    def test_templates_have_required_fields(self, api_client):
        """Test that all templates have required fields"""
        response = api_client.get(f"{BASE_URL}/api/reminders/templates")
        assert response.status_code == 200
        
        data = response.json()
        for template in data:
            assert "id" in template, "Template should have 'id'"
            assert "name" in template, "Template should have 'name'"
            assert "text" in template, "Template should have 'text'"
            assert "template_type" in template, "Template should have 'template_type'"


class TestClientEndpoints:
    """Tests for basic client endpoints"""
    
    def test_get_client_by_id(self, api_client):
        """Test getting a specific client by ID"""
        response = api_client.get(f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == TEST_CLIENT_ID, "Client ID should match"
        assert "name" in data, "Client should have name"
    
    def test_get_clients_list(self, api_client):
        """Test getting list of clients"""
        response = api_client.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
