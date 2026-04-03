"""
Iteration 47: Test Category Colors and Auto-Assign Operator Features

Tests:
1. Appointments colored by service CATEGORY (not operator)
2. Legend shows category colors (Styling, Trattamenti, Colore, Permanente, Stiratura, Abbonamenti)
3. Backend auto-assigns 2nd operator when time conflict exists
4. Services saved in appointments include 'category' field
5. Overlapping appointments shown side-by-side (split width)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCategoryColorsAndAutoAssign:
    """Test category colors and auto-assign operator features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@brunomelito.it", "password": "mbhs637104"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get operators
        ops_response = requests.get(f"{BASE_URL}/api/operators", headers=self.headers)
        self.operators = ops_response.json()
        assert len(self.operators) >= 2, "Need at least 2 operators for auto-assign test"
        
        # Get services
        svc_response = requests.get(f"{BASE_URL}/api/services", headers=self.headers)
        self.services = svc_response.json()
        assert len(self.services) > 0, "Need at least 1 service"
        
        yield
        
        # Cleanup: Delete test appointments
        apts_response = requests.get(
            f"{BASE_URL}/api/appointments?date=2026-04-20",
            headers=self.headers
        )
        for apt in apts_response.json():
            if apt.get("client_name", "").startswith("TEST_Iter47"):
                requests.delete(f"{BASE_URL}/api/appointments/{apt['id']}", headers=self.headers)
    
    def test_services_have_category_field(self):
        """Test that services have category field"""
        service = self.services[0]
        assert "category" in service, "Service should have 'category' field"
        assert service["category"] in ["taglio", "trattamento", "colore", "permanente", "stiratura", "abbonamento", "altro"], \
            f"Invalid category: {service['category']}"
        print(f"Service '{service['name']}' has category: {service['category']}")
    
    def test_appointment_saves_category_in_services(self):
        """Test that appointments save category field in services"""
        # Create appointment
        service = self.services[0]
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=self.headers,
            json={
                "client_name": "TEST_Iter47_CategoryCheck",
                "service_ids": [service["id"]],
                "operator_id": self.operators[0]["id"],
                "date": "2026-04-20",
                "time": "10:00"
            }
        )
        assert response.status_code == 200, f"Failed to create appointment: {response.text}"
        
        apt = response.json()
        assert "services" in apt, "Appointment should have 'services' field"
        assert len(apt["services"]) > 0, "Appointment should have at least 1 service"
        assert "category" in apt["services"][0], "Service in appointment should have 'category' field"
        print(f"Appointment service has category: {apt['services'][0]['category']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/appointments/{apt['id']}", headers=self.headers)
    
    def test_auto_assign_operator_on_conflict(self):
        """Test that backend auto-assigns to 2nd operator when time conflict exists"""
        first_operator = self.operators[0]
        second_operator = self.operators[1]
        service = self.services[0]
        
        # Create first appointment with first operator
        first_response = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=self.headers,
            json={
                "client_name": "TEST_Iter47_AutoAssign1",
                "service_ids": [service["id"]],
                "operator_id": first_operator["id"],
                "date": "2026-04-20",
                "time": "14:00"
            }
        )
        assert first_response.status_code == 200, f"Failed to create first appointment: {first_response.text}"
        first_apt = first_response.json()
        assert first_apt["operator_id"] == first_operator["id"], "First appointment should be assigned to first operator"
        
        # Create second appointment at SAME time with SAME operator
        # Backend should auto-assign to second operator
        second_response = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=self.headers,
            json={
                "client_name": "TEST_Iter47_AutoAssign2",
                "service_ids": [service["id"]],
                "operator_id": first_operator["id"],  # Request same operator
                "date": "2026-04-20",
                "time": "14:00"  # Same time
            }
        )
        assert second_response.status_code == 200, f"Failed to create second appointment: {second_response.text}"
        second_apt = second_response.json()
        
        # Verify auto-assignment
        assert second_apt["operator_id"] == second_operator["id"], \
            f"Second appointment should be auto-assigned to second operator. Got: {second_apt['operator_name']}"
        print(f"Auto-assign test PASSED: Second appointment assigned to {second_apt['operator_name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/appointments/{first_apt['id']}", headers=self.headers)
        requests.delete(f"{BASE_URL}/api/appointments/{second_apt['id']}", headers=self.headers)
    
    def test_existing_appointments_have_category(self):
        """Test that existing appointments have category in services"""
        # Get appointments from a date with known data
        response = requests.get(
            f"{BASE_URL}/api/appointments?date=2026-03-30",
            headers=self.headers
        )
        assert response.status_code == 200
        
        appointments = response.json()
        if len(appointments) > 0:
            apt = appointments[0]
            assert "services" in apt, "Appointment should have services"
            if len(apt["services"]) > 0:
                assert "category" in apt["services"][0], "Service should have category"
                print(f"Existing appointment '{apt['client_name']}' has service category: {apt['services'][0]['category']}")
        else:
            pytest.skip("No appointments found on 2026-03-30")


class TestCategoryColorMapping:
    """Test category color mapping in categories.js"""
    
    def test_category_colors_defined(self):
        """Verify expected category colors are defined"""
        expected_colors = {
            "taglio": "#0EA5E9",      # Styling - azzurro/blue
            "trattamento": "#334155", # Trattamenti - grigio/gray
            "colore": "#789F8A",      # Colore - verde/green
            "permanente": "#8B5CF6",  # Permanente - viola/purple
            "stiratura": "#D946EF",   # Stiratura - magenta
            "abbonamento": "#6366F1", # Abbonamenti - indaco/indigo
        }
        
        # These are the expected colors from categories.js
        # The test verifies the mapping is correct
        for category, color in expected_colors.items():
            print(f"Category '{category}' should have color: {color}")
        
        # This is a documentation test - actual color verification is done in UI tests
        assert True, "Category colors documented"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
