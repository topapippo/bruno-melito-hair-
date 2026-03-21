"""
Test Push Notifications and Booking Modal Features - Iteration 21
Tests:
1. Push notification endpoints (VAPID key, subscribe, send-reminders)
2. Card templates in public booking (6 items with prices)
3. Services sort order verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPushNotificationEndpoints:
    """Push notification API tests"""
    
    def test_get_vapid_key(self):
        """GET /api/push/vapid-key returns public key"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-key")
        assert response.status_code == 200
        data = response.json()
        assert "public_key" in data
        assert len(data["public_key"]) > 0
        print(f"VAPID public key returned: {data['public_key'][:30]}...")
    
    def test_subscribe_push(self):
        """POST /api/push/subscribe creates subscription"""
        payload = {
            "endpoint": "https://test-endpoint.example.com/push/pytest-test-123",
            "keys": {
                "p256dh": "test-p256dh-key-pytest",
                "auth": "test-auth-key-pytest"
            }
        }
        response = requests.post(f"{BASE_URL}/api/push/subscribe", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["subscribed", "already_subscribed"]
        print(f"Push subscription status: {data['status']}")
    
    def test_subscribe_push_duplicate(self):
        """POST /api/push/subscribe with same endpoint returns already_subscribed"""
        payload = {
            "endpoint": "https://test-endpoint.example.com/push/pytest-test-123",
            "keys": {
                "p256dh": "test-p256dh-key-pytest",
                "auth": "test-auth-key-pytest"
            }
        }
        response = requests.post(f"{BASE_URL}/api/push/subscribe", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "already_subscribed"
        print("Duplicate subscription correctly returns already_subscribed")
    
    def test_send_reminders(self):
        """POST /api/push/send-reminders works (may send 0 if no upcoming appointments)"""
        response = requests.post(f"{BASE_URL}/api/push/send-reminders")
        assert response.status_code == 200
        data = response.json()
        # Should have sent, failed, or message fields
        assert "sent" in data or "message" in data
        print(f"Send reminders response: {data}")
    
    def test_unsubscribe_push(self):
        """DELETE /api/push/unsubscribe removes subscription"""
        payload = {
            "endpoint": "https://test-endpoint.example.com/push/pytest-test-123",
            "keys": {
                "p256dh": "test-p256dh-key-pytest",
                "auth": "test-auth-key-pytest"
            }
        }
        response = requests.delete(f"{BASE_URL}/api/push/unsubscribe", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unsubscribed"
        print("Push subscription unsubscribed successfully")


class TestCardTemplatesInPublicBooking:
    """Card templates (Abbonamenti) in public booking modal tests"""
    
    def test_website_returns_card_templates(self):
        """GET /api/public/website returns card_templates array"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        assert "card_templates" in data
        assert isinstance(data["card_templates"], list)
        print(f"Card templates count: {len(data['card_templates'])}")
    
    def test_card_templates_count(self):
        """Should have 6 card templates"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        card_templates = data.get("card_templates", [])
        assert len(card_templates) == 6, f"Expected 6 card templates, got {len(card_templates)}"
        print(f"Verified 6 card templates present")
    
    def test_card_templates_have_prices(self):
        """Card templates should have total_value (prices)"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        card_templates = data.get("card_templates", [])
        
        expected_prices = [60, 40, 75, 65, 50, 100]
        actual_prices = [ct.get("total_value") for ct in card_templates]
        
        for price in expected_prices:
            assert price in actual_prices, f"Expected price €{price} not found in card templates"
        
        print(f"Card template prices verified: {actual_prices}")
    
    def test_card_templates_have_required_fields(self):
        """Card templates should have name, total_value, and other fields"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        card_templates = data.get("card_templates", [])
        
        for ct in card_templates:
            assert "id" in ct, "Card template missing id"
            assert "name" in ct, "Card template missing name"
            assert "total_value" in ct, "Card template missing total_value"
            print(f"  - {ct['name']}: €{ct['total_value']}")


class TestServicesOrder:
    """Services sort order tests"""
    
    def test_services_sorted_by_sort_order(self):
        """Services should be sorted by sort_order ascending"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        services = response.json()
        
        # Get sort_orders (use 999 for missing)
        sort_orders = [s.get("sort_order", 999) for s in services]
        
        # Check if sorted
        is_sorted = all(sort_orders[i] <= sort_orders[i+1] for i in range(len(sort_orders)-1))
        assert is_sorted, f"Services not sorted by sort_order: {sort_orders[:10]}..."
        
        print(f"Services sorted correctly. First 5 sort_orders: {sort_orders[:5]}")
    
    def test_services_count(self):
        """Should have services available"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        services = response.json()
        assert len(services) > 0, "No services found"
        print(f"Total services: {len(services)}")


class TestAdminPlanningPage:
    """Admin planning page tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_appointments_endpoint(self, auth_token):
        """GET /api/appointments works for admin"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/appointments", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Appointments count: {len(data)}")
    
    def test_operators_endpoint(self, auth_token):
        """GET /api/operators works for admin"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/operators", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Operators: {[op.get('name') for op in data]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
