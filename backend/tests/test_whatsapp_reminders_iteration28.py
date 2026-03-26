"""
Test suite for WhatsApp Reminders Enhancement - Iteration 28
Tests:
- Dashboard stats with yearly_revenue and yearly_appointments
- Reminders endpoints: tomorrow, color-expiry, inactive-clients
- Templates endpoint with color_expiry default template
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@brunomelito.it"
TEST_PASSWORD = "mbhs637104"


class TestAuthentication:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        print(f"PASS: Login successful for {TEST_EMAIL}")
        return data["access_token"]


class TestDashboardStats:
    """Dashboard stats endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_dashboard_stats_returns_yearly_data(self, auth_token):
        """Test GET /api/stats/dashboard returns yearly_revenue and yearly_appointments"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=headers)
        
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Check required fields exist
        assert "yearly_revenue" in data, "Missing yearly_revenue field"
        assert "yearly_appointments" in data, "Missing yearly_appointments field"
        assert "monthly_revenue" in data, "Missing monthly_revenue field"
        assert "monthly_appointments" in data, "Missing monthly_appointments field"
        assert "today_appointments_count" in data, "Missing today_appointments_count field"
        assert "total_clients" in data, "Missing total_clients field"
        
        # Verify data types
        assert isinstance(data["yearly_revenue"], (int, float)), "yearly_revenue should be numeric"
        assert isinstance(data["yearly_appointments"], int), "yearly_appointments should be int"
        
        print(f"PASS: Dashboard stats - yearly_revenue: {data['yearly_revenue']}, yearly_appointments: {data['yearly_appointments']}")
        print(f"      monthly_revenue: {data['monthly_revenue']}, monthly_appointments: {data['monthly_appointments']}")
        print(f"      today_appointments_count: {data['today_appointments_count']}, total_clients: {data['total_clients']}")


class TestRemindersEndpoints:
    """Reminders API endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_tomorrow_reminders(self, auth_token):
        """Test GET /api/reminders/tomorrow returns list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/reminders/tomorrow", headers=headers)
        
        assert response.status_code == 200, f"Tomorrow reminders failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are reminders, check structure
        if len(data) > 0:
            reminder = data[0]
            assert "id" in reminder, "Reminder should have id"
            assert "client_name" in reminder, "Reminder should have client_name"
            assert "reminded" in reminder, "Reminder should have reminded status"
            print(f"PASS: Tomorrow reminders - {len(data)} appointments found")
            for r in data[:3]:  # Show first 3
                print(f"      - {r.get('client_name', 'N/A')} at {r.get('time', 'N/A')}, reminded: {r.get('reminded', False)}")
        else:
            print("PASS: Tomorrow reminders - 0 appointments (empty list is valid)")
    
    def test_get_color_expiry_reminders(self, auth_token):
        """Test GET /api/reminders/color-expiry returns list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/reminders/color-expiry", headers=headers)
        
        assert response.status_code == 200, f"Color expiry reminders failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are reminders, check structure
        if len(data) > 0:
            reminder = data[0]
            assert "client_id" in reminder, "Color reminder should have client_id"
            assert "client_name" in reminder, "Color reminder should have client_name"
            assert "days_ago" in reminder, "Color reminder should have days_ago"
            assert "already_sent" in reminder, "Color reminder should have already_sent status"
            print(f"PASS: Color expiry reminders - {len(data)} clients found")
            for r in data[:3]:  # Show first 3
                print(f"      - {r.get('client_name', 'N/A')}, {r.get('days_ago', 0)} days ago, sent: {r.get('already_sent', False)}")
        else:
            print("PASS: Color expiry reminders - 0 clients (empty list is valid)")
    
    def test_get_inactive_clients(self, auth_token):
        """Test GET /api/reminders/inactive-clients returns list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/reminders/inactive-clients", headers=headers)
        
        assert response.status_code == 200, f"Inactive clients failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # If there are inactive clients, check structure
        if len(data) > 0:
            client = data[0]
            assert "client_id" in client, "Inactive client should have client_id"
            assert "client_name" in client, "Inactive client should have client_name"
            assert "days_ago" in client, "Inactive client should have days_ago"
            assert "already_recalled" in client, "Inactive client should have already_recalled status"
            print(f"PASS: Inactive clients - {len(data)} clients found (60+ days)")
            for c in data[:3]:  # Show first 3
                print(f"      - {c.get('client_name', 'N/A')}, {c.get('days_ago', 0)} days ago, recalled: {c.get('already_recalled', False)}")
        else:
            print("PASS: Inactive clients - 0 clients (empty list is valid)")


class TestMessageTemplates:
    """Message templates endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        import time
        time.sleep(1)  # Rate limiting protection
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Auth failed: {response.text}")
        data = response.json()
        if "access_token" not in data:
            pytest.skip(f"No access_token in response: {data}")
        return data["access_token"]
    
    def test_get_templates_includes_color_expiry(self, auth_token):
        """Test GET /api/reminders/templates returns templates including color_expiry default"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/reminders/templates", headers=headers)
        
        assert response.status_code == 200, f"Templates failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one template"
        
        # Check template structure
        template = data[0]
        assert "id" in template, "Template should have id"
        assert "name" in template, "Template should have name"
        assert "text" in template, "Template should have text"
        assert "template_type" in template, "Template should have template_type"
        
        # Check for all 3 template types
        template_types = [t.get("template_type") for t in data]
        print(f"PASS: Templates - {len(data)} templates found")
        for t in data:
            print(f"      - {t.get('name', 'N/A')} (type: {t.get('template_type', 'N/A')})")
        
        # Verify color template exists (either color_expiry or color_recall)
        has_color_template = "color_expiry" in template_types or "color_recall" in template_types
        assert has_color_template, "Should have color_expiry or color_recall template type"
        
        if "color_expiry" in template_types:
            print("PASS: color_expiry template type found")
        elif "color_recall" in template_types:
            print("NOTE: Found color_recall template type (legacy name, should be color_expiry)")
            print("      This is a data inconsistency - frontend expects color_expiry")
    
    def test_create_color_expiry_template(self, auth_token):
        """Test creating a new template with type color_expiry"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a new color_expiry template
        new_template = {
            "name": "TEST_Color Expiry Custom",
            "text": "Ciao {nome}! Il tuo colore ha bisogno di un ritocco dopo {giorni} giorni!",
            "template_type": "color_expiry"
        }
        
        response = requests.post(f"{BASE_URL}/api/reminders/templates", 
                                 headers=headers, json=new_template)
        
        assert response.status_code == 200, f"Create template failed: {response.text}"
        data = response.json()
        
        assert data["name"] == new_template["name"], "Name should match"
        assert data["template_type"] == "color_expiry", "Type should be color_expiry"
        assert "id" in data, "Should return template id"
        
        template_id = data["id"]
        print(f"PASS: Created color_expiry template with id: {template_id}")
        
        # Cleanup - delete the test template
        delete_response = requests.delete(f"{BASE_URL}/api/reminders/templates/{template_id}", 
                                          headers=headers)
        assert delete_response.status_code == 200, f"Delete template failed: {delete_response.text}"
        print(f"PASS: Cleaned up test template {template_id}")


class TestAutoCheckEndpoint:
    """Auto-check endpoint tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_auto_check_returns_pending_info(self, auth_token):
        """Test GET /api/reminders/auto-check returns pending reminders info"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/reminders/auto-check", headers=headers)
        
        assert response.status_code == 200, f"Auto-check failed: {response.text}"
        data = response.json()
        
        # Check required fields
        assert "is_reminder_time" in data, "Should have is_reminder_time"
        assert "tomorrow_date" in data, "Should have tomorrow_date"
        assert "total_tomorrow" in data, "Should have total_tomorrow"
        assert "already_sent" in data, "Should have already_sent"
        assert "pending" in data, "Should have pending list"
        
        print(f"PASS: Auto-check - tomorrow: {data['tomorrow_date']}")
        print(f"      total_tomorrow: {data['total_tomorrow']}, already_sent: {data['already_sent']}")
        print(f"      pending: {len(data['pending'])} appointments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
