"""
Test Card Templates (Abbonamenti) Integration in Public Booking and Admin Panel
Tests for iteration 18: Card templates in booking widget and admin management
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://booking-widget-v2.preview.emergentagent.com').rstrip('/')

class TestPublicWebsiteEndpoint:
    """Test /api/public/website returns card_templates array"""
    
    def test_public_website_returns_card_templates(self):
        """Verify /api/public/website includes card_templates in response"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "card_templates" in data, "Response should include 'card_templates' field"
        assert isinstance(data["card_templates"], list), "card_templates should be a list"
        print(f"✓ /api/public/website returns card_templates: {len(data['card_templates'])} templates found")
        
    def test_public_website_card_templates_structure(self):
        """Verify card_templates have expected structure"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        
        data = response.json()
        card_templates = data.get("card_templates", [])
        
        if len(card_templates) > 0:
            tmpl = card_templates[0]
            # Check expected fields
            expected_fields = ["id", "name"]
            for field in expected_fields:
                assert field in tmpl, f"Card template should have '{field}' field"
            print(f"✓ Card template structure valid: {tmpl.get('name', 'Unknown')}")
        else:
            print("⚠ No card templates found - test data may need to be created")
            
    def test_public_website_returns_promos(self):
        """Verify /api/public/website includes promos in response"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        
        data = response.json()
        assert "promos" in data, "Response should include 'promos' field"
        assert isinstance(data["promos"], list), "promos should be a list"
        print(f"✓ /api/public/website returns promos: {len(data['promos'])} promos found")


class TestPublicBookingEndpoint:
    """Test /api/public/booking accepts promo_id and card_template_id"""
    
    def test_booking_accepts_promo_id_field(self):
        """Verify booking endpoint accepts promo_id in payload"""
        # Get services first
        services_res = requests.get(f"{BASE_URL}/api/public/services")
        assert services_res.status_code == 200
        services = services_res.json()
        
        if len(services) == 0:
            pytest.skip("No services available for booking test")
            
        # Calculate a future date
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Test booking with promo_id field (even if null)
        booking_data = {
            "client_name": "TEST_PromoBooking",
            "client_phone": "3331234567",
            "service_ids": [services[0]["id"]],
            "date": future_date,
            "time": "10:00",
            "notes": "Test booking with promo_id",
            "promo_id": None,  # Testing that field is accepted
            "card_template_id": None
        }
        
        response = requests.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        # Accept 200, 201, or 409 (conflict is ok - means endpoint works)
        assert response.status_code in [200, 201, 409], f"Booking should accept promo_id field, got {response.status_code}: {response.text}"
        print(f"✓ Booking endpoint accepts promo_id field (status: {response.status_code})")
        
    def test_booking_accepts_card_template_id_field(self):
        """Verify booking endpoint accepts card_template_id in payload"""
        # Get services first
        services_res = requests.get(f"{BASE_URL}/api/public/services")
        assert services_res.status_code == 200
        services = services_res.json()
        
        if len(services) == 0:
            pytest.skip("No services available for booking test")
            
        # Calculate a future date
        future_date = (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%d")
        
        # Test booking with card_template_id field
        booking_data = {
            "client_name": "TEST_CardTemplateBooking",
            "client_phone": "3339876543",
            "service_ids": [services[0]["id"]],
            "date": future_date,
            "time": "11:00",
            "notes": "Test booking with card_template_id",
            "promo_id": None,
            "card_template_id": None  # Testing that field is accepted
        }
        
        response = requests.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        assert response.status_code in [200, 201, 409], f"Booking should accept card_template_id field, got {response.status_code}: {response.text}"
        print(f"✓ Booking endpoint accepts card_template_id field (status: {response.status_code})")


class TestCardTemplatesAdminEndpoint:
    """Test admin card-templates endpoint"""
    
    def test_card_templates_endpoint_exists(self):
        """Verify /api/card-templates endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/card-templates")
        # Should return 200, 401, or 403 (if auth required)
        assert response.status_code in [200, 401, 403], f"Card templates endpoint should exist, got {response.status_code}"
        print(f"✓ /api/card-templates endpoint exists (status: {response.status_code})")
        
    def test_card_templates_returns_list(self):
        """Verify card-templates returns a list"""
        response = requests.get(f"{BASE_URL}/api/card-templates")
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list), "card-templates should return a list"
            print(f"✓ /api/card-templates returns list with {len(data)} templates")
        else:
            print(f"⚠ Card templates requires auth (status: {response.status_code})")


class TestPublicServicesAndOperators:
    """Test public services and operators endpoints"""
    
    def test_public_services_endpoint(self):
        """Verify /api/public/services returns services"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Services should be a list"
        print(f"✓ /api/public/services returns {len(data)} services")
        
    def test_public_operators_endpoint(self):
        """Verify /api/public/operators returns operators"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Operators should be a list"
        print(f"✓ /api/public/operators returns {len(data)} operators")
        
    def test_public_busy_slots_endpoint(self):
        """Verify /api/public/busy-slots returns busy slots"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/public/busy-slots?date={today}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "busy" in data, "Response should include 'busy' field"
        assert "operators" in data, "Response should include 'operators' field"
        print(f"✓ /api/public/busy-slots returns busy slots data")


class TestBookingModelValidation:
    """Test PublicBookingRequest model accepts new fields"""
    
    def test_booking_with_all_optional_fields(self):
        """Test booking with all optional fields including promo_id and card_template_id"""
        services_res = requests.get(f"{BASE_URL}/api/public/services")
        if services_res.status_code != 200 or len(services_res.json()) == 0:
            pytest.skip("No services available")
            
        services = services_res.json()
        future_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        
        # Full booking payload with all fields
        booking_data = {
            "client_name": "TEST_FullBooking",
            "client_phone": "3335551234",
            "service_ids": [services[0]["id"]],
            "operator_id": None,
            "date": future_date,
            "time": "14:00",
            "notes": "Full test booking",
            "promo_id": "test-promo-id",  # Non-null value to test field acceptance
            "card_template_id": "test-card-template-id"  # Non-null value
        }
        
        response = requests.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        # The booking may fail due to invalid IDs, but should not fail due to field validation
        # 400 would indicate field validation error, 409 is conflict (slot taken)
        # 200/201 is success
        assert response.status_code in [200, 201, 409], f"Booking should accept all fields, got {response.status_code}: {response.text}"
        print(f"✓ Booking accepts all optional fields including promo_id and card_template_id")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
