"""
Backend API tests for Reminders & Inactive Client Recall feature
Tests:
- GET /api/reminders/tomorrow - Get tomorrow's appointments for reminders
- POST /api/reminders/appointment/{id}/mark-sent - Mark reminder as sent
- GET /api/reminders/inactive-clients - Get inactive clients (60+ days)
- POST /api/reminders/inactive/{client_id}/mark-sent - Mark recall as sent
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "melitobruno@gmail.com"
TEST_PASSWORD = "password123"


@pytest.fixture(scope="module")
def auth_token():
    """Login and get auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create requests session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    })
    return session


class TestRemindersAPI:
    """Test Reminders endpoints"""
    
    def test_get_tomorrow_reminders(self, api_client):
        """GET /api/reminders/tomorrow returns tomorrow's appointments"""
        response = api_client.get(f"{BASE_URL}/api/reminders/tomorrow")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure if there are appointments
        if len(data) > 0:
            apt = data[0]
            assert "id" in apt
            assert "client_name" in apt
            assert "client_phone" in apt
            assert "client_id" in apt
            assert "date" in apt
            assert "time" in apt
            assert "services" in apt
            assert "reminded" in apt
            
            # Verify date is tomorrow
            tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
            assert apt["date"] == tomorrow, f"Expected date {tomorrow}, got {apt['date']}"
        
        print(f"✓ Tomorrow's reminders: {len(data)} appointments found")
    
    def test_mark_appointment_reminder_sent(self, api_client):
        """POST /api/reminders/appointment/{id}/mark-sent marks reminder as sent"""
        # First get tomorrow's appointments
        response = api_client.get(f"{BASE_URL}/api/reminders/tomorrow")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No appointments for tomorrow to test mark-sent")
        
        # Get an appointment that hasn't been reminded yet
        apt_to_mark = None
        for apt in data:
            if not apt.get("reminded"):
                apt_to_mark = apt
                break
        
        if apt_to_mark is None:
            # All already reminded - that's okay, test the endpoint anyway
            apt_to_mark = data[0]
        
        # Mark as sent
        mark_response = api_client.post(f"{BASE_URL}/api/reminders/appointment/{apt_to_mark['id']}/mark-sent")
        assert mark_response.status_code == 200, f"Failed: {mark_response.text}"
        
        result = mark_response.json()
        assert result.get("success") is True
        
        # Verify it's now marked as reminded
        verify_response = api_client.get(f"{BASE_URL}/api/reminders/tomorrow")
        verify_data = verify_response.json()
        
        for apt in verify_data:
            if apt["id"] == apt_to_mark["id"]:
                assert apt["reminded"] is True, "Appointment should be marked as reminded"
                break
        
        print(f"✓ Marked reminder sent for appointment {apt_to_mark['id']}")
    
    def test_mark_reminder_sent_invalid_appointment(self, api_client):
        """POST /api/reminders/appointment/{id}/mark-sent returns 404 for invalid ID"""
        response = api_client.post(f"{BASE_URL}/api/reminders/appointment/invalid-id-12345/mark-sent")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid appointment ID returns 404")
    
    def test_get_inactive_clients(self, api_client):
        """GET /api/reminders/inactive-clients returns inactive clients (60+ days)"""
        response = api_client.get(f"{BASE_URL}/api/reminders/inactive-clients")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure if there are inactive clients
        if len(data) > 0:
            client = data[0]
            assert "client_id" in client
            assert "client_name" in client
            assert "client_phone" in client
            assert "last_visit" in client
            assert "days_ago" in client
            assert "last_services" in client
            assert "already_recalled" in client
            
            # Verify days_ago is >= 60
            assert client["days_ago"] >= 60, f"Expected days_ago >= 60, got {client['days_ago']}"
        
        print(f"✓ Inactive clients: {len(data)} clients found (60+ days)")
    
    def test_mark_inactive_recall_sent(self, api_client):
        """POST /api/reminders/inactive/{client_id}/mark-sent marks recall as sent"""
        # First get inactive clients
        response = api_client.get(f"{BASE_URL}/api/reminders/inactive-clients")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No inactive clients to test mark-sent")
        
        # Get a client that hasn't been recalled yet
        client_to_mark = None
        for client in data:
            if not client.get("already_recalled"):
                client_to_mark = client
                break
        
        if client_to_mark is None:
            # All already recalled - that's okay, test the endpoint anyway with first client
            client_to_mark = data[0]
        
        # Mark as sent
        mark_response = api_client.post(f"{BASE_URL}/api/reminders/inactive/{client_to_mark['client_id']}/mark-sent")
        assert mark_response.status_code == 200, f"Failed: {mark_response.text}"
        
        result = mark_response.json()
        assert result.get("success") is True
        
        print(f"✓ Marked recall sent for client {client_to_mark['client_name']}")
    
    def test_mark_inactive_recall_invalid_client(self, api_client):
        """POST /api/reminders/inactive/{client_id}/mark-sent returns 404 for invalid client"""
        response = api_client.post(f"{BASE_URL}/api/reminders/inactive/invalid-client-12345/mark-sent")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid client ID returns 404")


class TestRemindersDataIntegrity:
    """Test data integrity and edge cases"""
    
    def test_reminders_requires_auth(self):
        """All reminder endpoints require authentication"""
        # No auth header
        response = requests.get(f"{BASE_URL}/api/reminders/tomorrow")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        response = requests.get(f"{BASE_URL}/api/reminders/inactive-clients")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        print("✓ Endpoints require authentication")
    
    def test_reminder_response_has_correct_date(self, api_client):
        """Tomorrow reminders should all have tomorrow's date"""
        response = api_client.get(f"{BASE_URL}/api/reminders/tomorrow")
        data = response.json()
        
        tomorrow = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        for apt in data:
            assert apt["date"] == tomorrow, f"All appointments should be for {tomorrow}"
        
        print(f"✓ All {len(data)} appointments are correctly for {tomorrow}")
    
    def test_inactive_clients_sorted_by_days(self, api_client):
        """Inactive clients should be sorted by days_ago descending"""
        response = api_client.get(f"{BASE_URL}/api/reminders/inactive-clients")
        data = response.json()
        
        if len(data) >= 2:
            for i in range(len(data) - 1):
                assert data[i]["days_ago"] >= data[i+1]["days_ago"], "Should be sorted by days_ago descending"
        
        print(f"✓ Inactive clients correctly sorted by days (descending)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
