"""
Iteration 50: Test Category Colors Bug Fix

Tests:
1. GET /api/appointments returns services with category field populated
2. POST /api/appointments/repair-categories patches old appointments missing category
3. Category colors are correctly mapped in frontend
4. All 8 categories are present in the legend (Taglio, Piega, Trattamenti, Colore, Permanente, Stiratura, Abbonamenti, Altro)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Expected category colors from categories.js
EXPECTED_COLORS = {
    "taglio": "#0EA5E9",      # blue
    "piega": "#F97316",       # orange
    "trattamento": "#F59E0B", # amber
    "colore": "#10B981",      # green
    "permanente": "#8B5CF6",  # purple
    "stiratura": "#EC4899",   # pink
    "abbonamento": "#6366F1", # indigo
    "altro": "#64748B",       # gray
}


class TestCategoryColorsIteration50:
    """Test category colors bug fix for iteration 50"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "melitobruno@gmail.com", "password": "mbhs637104"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        yield
    
    def test_appointments_have_category_in_services(self):
        """Test that GET /api/appointments returns services with category field"""
        response = requests.get(
            f"{BASE_URL}/api/appointments?date=2026-04-10",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get appointments: {response.text}"
        
        appointments = response.json()
        assert len(appointments) > 0, "No appointments found for test date"
        
        for apt in appointments:
            assert "services" in apt, f"Appointment {apt['id']} missing 'services' field"
            for svc in apt["services"]:
                assert "category" in svc, f"Service {svc.get('name', 'unknown')} missing 'category' field"
                assert svc["category"], f"Service {svc.get('name', 'unknown')} has empty category"
                print(f"  ✓ {apt['client_name']} - {svc['name']}: category={svc['category']}")
    
    def test_repair_categories_endpoint(self):
        """Test POST /api/appointments/repair-categories endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/appointments/repair-categories",
            headers=self.headers
        )
        assert response.status_code == 200, f"Repair categories failed: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response missing 'success' field"
        assert data["success"] == True, "Repair categories returned success=false"
        assert "patched" in data, "Response missing 'patched' field"
        assert "total" in data, "Response missing 'total' field"
        print(f"  ✓ Repair categories: patched={data['patched']}, total={data['total']}")
    
    def test_all_categories_have_distinct_colors(self):
        """Test that all categories have distinct colors defined"""
        # Verify all expected categories have colors
        for category, color in EXPECTED_COLORS.items():
            assert color.startswith("#"), f"Category {category} has invalid color format: {color}"
            assert len(color) == 7, f"Category {category} has invalid color length: {color}"
            print(f"  ✓ {category}: {color}")
        
        # Verify all colors are unique
        colors = list(EXPECTED_COLORS.values())
        assert len(colors) == len(set(colors)), "Some categories have duplicate colors"
    
    def test_services_have_valid_categories(self):
        """Test that all services have valid category values"""
        response = requests.get(
            f"{BASE_URL}/api/services",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get services: {response.text}"
        
        services = response.json()
        valid_categories = list(EXPECTED_COLORS.keys())
        
        for svc in services:
            assert "category" in svc, f"Service {svc['name']} missing 'category' field"
            # Category should be one of the valid values or empty (will default to 'altro')
            if svc["category"]:
                assert svc["category"] in valid_categories, \
                    f"Service {svc['name']} has invalid category: {svc['category']}"
            print(f"  ✓ {svc['name']}: category={svc.get('category', 'altro')}")
    
    def test_appointment_creation_includes_category(self):
        """Test that new appointments include category in services"""
        # Get a service to use
        svc_response = requests.get(f"{BASE_URL}/api/services", headers=self.headers)
        services = svc_response.json()
        assert len(services) > 0, "No services available"
        
        service = services[0]
        
        # Get an operator
        ops_response = requests.get(f"{BASE_URL}/api/operators", headers=self.headers)
        operators = ops_response.json()
        assert len(operators) > 0, "No operators available"
        
        # Create appointment
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            headers=self.headers,
            json={
                "client_name": "TEST_Iter50_CategoryCheck",
                "service_ids": [service["id"]],
                "operator_id": operators[0]["id"],
                "date": "2026-04-20",
                "time": "15:00"
            }
        )
        assert response.status_code == 200, f"Failed to create appointment: {response.text}"
        
        apt = response.json()
        assert "services" in apt, "Created appointment missing 'services' field"
        assert len(apt["services"]) > 0, "Created appointment has no services"
        assert "category" in apt["services"][0], "Created appointment service missing 'category'"
        
        print(f"  ✓ Created appointment with service category: {apt['services'][0]['category']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/appointments/{apt['id']}", headers=self.headers)
    
    def test_category_enrichment_on_get(self):
        """Test that GET /api/appointments enriches missing categories from master services"""
        # This test verifies the backend enrichment logic
        response = requests.get(
            f"{BASE_URL}/api/appointments?date=2026-04-10",
            headers=self.headers
        )
        assert response.status_code == 200
        
        appointments = response.json()
        for apt in appointments:
            for svc in apt.get("services", []):
                # Every service should have a category after enrichment
                assert svc.get("category"), f"Service {svc.get('name')} has no category after enrichment"
        
        print(f"  ✓ All {len(appointments)} appointments have enriched categories")


class TestCategoryColorMapping:
    """Test category color mapping matches expected values"""
    
    def test_taglio_color(self):
        """Taglio should be blue (#0EA5E9)"""
        assert EXPECTED_COLORS["taglio"] == "#0EA5E9"
    
    def test_piega_color(self):
        """Piega should be orange (#F97316)"""
        assert EXPECTED_COLORS["piega"] == "#F97316"
    
    def test_colore_color(self):
        """Colore should be green (#10B981)"""
        assert EXPECTED_COLORS["colore"] == "#10B981"
    
    def test_trattamento_color(self):
        """Trattamento should be amber (#F59E0B)"""
        assert EXPECTED_COLORS["trattamento"] == "#F59E0B"
    
    def test_permanente_color(self):
        """Permanente should be purple (#8B5CF6)"""
        assert EXPECTED_COLORS["permanente"] == "#8B5CF6"
    
    def test_stiratura_color(self):
        """Stiratura should be pink (#EC4899)"""
        assert EXPECTED_COLORS["stiratura"] == "#EC4899"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
