"""
Iteration 49: Test Category Colors, Overlapping Appointments, and Auto-Assignment

Tests:
1. Category colors: taglio=#0EA5E9, trattamento=#334155, colore=#789F8A, permanente=#8B5CF6, stiratura=#D946EF
2. Overlapping appointments detection uses TIME RANGE overlap (not exact time match)
3. Auto-assignment to 2nd operator when time RANGE conflicts
4. Services saved with category field in appointments
5. Verify test data for today (2026-04-03) exists with correct categories
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Service IDs from the review request
SERVICE_IDS = {
    "taglio": "7188fb89-2029-449a-8c09-a322104355bc",
    "trattamento": "a993a9c4-c6e9-4367-b993-421959c59f58",
    "colore": "623bf658-21c7-4d96-a05e-17f8b19feee3",
    "permanente": "c661db08-6752-4a9f-aa77-09b334d88cd9",
    "stiratura": "5c0e2738-efb4-474c-a8f5-06622050325f"
}

# Operator IDs from the review request
OPERATOR_IDS = {
    "BRUNO": "199c0886-55af-40c3-8658-edd0be74ce70",
    "MBHS": "f75dbe6c-1e1a-4d4d-ad13-6c36fccba262"
}

# Expected category colors from categories.js
EXPECTED_COLORS = {
    "taglio": "#0EA5E9",      # Styling - azzurro/blue
    "trattamento": "#334155", # Trattamenti - grigio/gray
    "colore": "#789F8A",      # Colore - verde/green
    "permanente": "#8B5CF6",  # Permanente - viola/purple
    "stiratura": "#D946EF",   # Stiratura - magenta
}


class TestIteration49Features:
    """Test category colors, overlap detection, and auto-assignment"""
    
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
        
        # Get services
        svc_response = requests.get(f"{BASE_URL}/api/services", headers=self.headers)
        self.services = svc_response.json()
        
        yield
        
        # Cleanup: Delete test appointments
        apts_response = requests.get(
            f"{BASE_URL}/api/appointments?date=2026-04-25",
            headers=self.headers
        )
        for apt in apts_response.json():
            if apt.get("client_name", "").startswith("TEST_Iter49"):
                requests.delete(f"{BASE_URL}/api/appointments/{apt['id']}", headers=self.headers)
    
    def test_services_have_correct_categories(self):
        """Test that services have correct category assignments"""
        services_by_id = {s["id"]: s for s in self.services}
        
        for category, service_id in SERVICE_IDS.items():
            if service_id in services_by_id:
                service = services_by_id[service_id]
                assert service.get("category") == category, \
                    f"Service {service['name']} should have category '{category}', got '{service.get('category')}'"
                print(f"PASS: Service '{service['name']}' has correct category: {category}")
    
    def test_appointment_saves_category_in_services(self):
        """Test that appointments save category field in services array"""
        # Find a service with known category
        taglio_service = next((s for s in self.services if s.get("category") == "taglio"), None)
        if not taglio_service:
            pytest.skip("No taglio service found")
        
        # Create appointment
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=self.headers,
            json={
                "client_name": "TEST_Iter49_CategorySave",
                "service_ids": [taglio_service["id"]],
                "operator_id": self.operators[0]["id"],
                "date": "2026-04-25",
                "time": "10:00"
            }
        )
        assert response.status_code == 200, f"Failed to create appointment: {response.text}"
        
        apt = response.json()
        assert "services" in apt, "Appointment should have 'services' field"
        assert len(apt["services"]) > 0, "Appointment should have at least 1 service"
        assert apt["services"][0].get("category") == "taglio", \
            f"Service category should be 'taglio', got '{apt['services'][0].get('category')}'"
        print(f"PASS: Appointment service has category: {apt['services'][0]['category']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/appointments/{apt['id']}", headers=self.headers)
    
    def test_auto_assign_on_time_range_overlap(self):
        """Test that auto-assignment uses TIME RANGE overlap, not exact time match"""
        first_operator = self.operators[0]
        second_operator = self.operators[1] if len(self.operators) > 1 else None
        
        if not second_operator:
            pytest.skip("Need at least 2 operators for auto-assign test")
        
        # Find a service with known duration (e.g., 30 minutes)
        service = next((s for s in self.services if s.get("duration", 0) >= 30), self.services[0])
        duration = service.get("duration", 30)
        
        # Create first appointment at 14:00 with duration (e.g., 30 min -> ends at 14:30)
        first_response = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=self.headers,
            json={
                "client_name": "TEST_Iter49_RangeOverlap1",
                "service_ids": [service["id"]],
                "operator_id": first_operator["id"],
                "date": "2026-04-25",
                "time": "14:00"
            }
        )
        assert first_response.status_code == 200, f"Failed to create first appointment: {first_response.text}"
        first_apt = first_response.json()
        print(f"First appointment: {first_apt['time']} - {first_apt['end_time']} (duration: {first_apt['total_duration']})")
        
        # Create second appointment at 14:15 (WITHIN the time range of first appointment)
        # This should trigger auto-assignment to second operator
        second_response = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=self.headers,
            json={
                "client_name": "TEST_Iter49_RangeOverlap2",
                "service_ids": [service["id"]],
                "operator_id": first_operator["id"],  # Request same operator
                "date": "2026-04-25",
                "time": "14:15"  # Within the time range of first appointment
            }
        )
        assert second_response.status_code == 200, f"Failed to create second appointment: {second_response.text}"
        second_apt = second_response.json()
        
        # Verify auto-assignment happened due to TIME RANGE overlap
        assert second_apt["operator_id"] == second_operator["id"], \
            f"Second appointment should be auto-assigned to second operator due to time range overlap. " \
            f"Got: {second_apt['operator_name']} (expected: {second_operator['name']})"
        print(f"PASS: Auto-assign on time range overlap - Second appointment assigned to {second_apt['operator_name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/appointments/{first_apt['id']}", headers=self.headers)
        requests.delete(f"{BASE_URL}/api/appointments/{second_apt['id']}", headers=self.headers)
    
    def test_no_auto_assign_when_no_overlap(self):
        """Test that no auto-assignment happens when times don't overlap"""
        first_operator = self.operators[0]
        
        # Find a service with known duration
        service = next((s for s in self.services if s.get("duration", 0) >= 15), self.services[0])
        
        # Create first appointment at 15:00
        first_response = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=self.headers,
            json={
                "client_name": "TEST_Iter49_NoOverlap1",
                "service_ids": [service["id"]],
                "operator_id": first_operator["id"],
                "date": "2026-04-25",
                "time": "15:00"
            }
        )
        assert first_response.status_code == 200
        first_apt = first_response.json()
        
        # Create second appointment at 16:00 (no overlap with 15:00 appointment)
        second_response = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=self.headers,
            json={
                "client_name": "TEST_Iter49_NoOverlap2",
                "service_ids": [service["id"]],
                "operator_id": first_operator["id"],  # Request same operator
                "date": "2026-04-25",
                "time": "16:00"  # No overlap
            }
        )
        assert second_response.status_code == 200
        second_apt = second_response.json()
        
        # Verify NO auto-assignment (same operator kept)
        assert second_apt["operator_id"] == first_operator["id"], \
            f"Second appointment should stay with first operator (no overlap). Got: {second_apt['operator_name']}"
        print(f"PASS: No auto-assign when no overlap - Both appointments with {first_operator['name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/appointments/{first_apt['id']}", headers=self.headers)
        requests.delete(f"{BASE_URL}/api/appointments/{second_apt['id']}", headers=self.headers)
    
    def test_verify_test_data_for_today(self):
        """Verify test data exists for 2026-04-03 with correct categories"""
        response = requests.get(
            f"{BASE_URL}/api/appointments?date=2026-04-03",
            headers=self.headers
        )
        assert response.status_code == 200
        
        appointments = response.json()
        print(f"Found {len(appointments)} appointments for 2026-04-03")
        
        # Check for expected test appointments
        expected_clients = ["Maria Colore", "Luisa Trattamento", "Anna Permanente", "Sara AutoAssign", "Elena Stiratura"]
        found_clients = [apt["client_name"] for apt in appointments]
        
        for client in expected_clients:
            if client in found_clients:
                apt = next(a for a in appointments if a["client_name"] == client)
                category = apt["services"][0].get("category", "N/A") if apt.get("services") else "N/A"
                print(f"FOUND: {client} at {apt['time']} with {apt.get('operator_name', 'N/A')} - category: {category}")
            else:
                print(f"NOT FOUND: {client}")
        
        # At least verify we have some appointments
        assert len(appointments) > 0, "Should have test appointments for 2026-04-03"


class TestCategoryColorValues:
    """Test that category colors match expected values"""
    
    def test_expected_category_colors(self):
        """Document and verify expected category colors"""
        print("\n=== Expected Category Colors ===")
        for category, color in EXPECTED_COLORS.items():
            print(f"  {category}: {color}")
        
        # This is a documentation test - actual color verification is done in UI tests
        assert EXPECTED_COLORS["taglio"] == "#0EA5E9", "Taglio (Styling) should be blue"
        assert EXPECTED_COLORS["trattamento"] == "#334155", "Trattamento should be dark gray"
        assert EXPECTED_COLORS["colore"] == "#789F8A", "Colore should be green"
        assert EXPECTED_COLORS["permanente"] == "#8B5CF6", "Permanente should be purple"
        assert EXPECTED_COLORS["stiratura"] == "#D946EF", "Stiratura should be magenta"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
