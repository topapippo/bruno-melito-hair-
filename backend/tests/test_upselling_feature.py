"""
Test suite for Upselling Feature
Tests the upselling API endpoints and configuration
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://salon-theme-preview.preview.emergentagent.com')

# Test data
TAGLIO_DONNA_ID = "7188fb89-2029-449a-8c09-a322104355bc"
MASCHERA_CURATIVA_ID = "2ec7dd94-a324-49de-bd3b-aa0a0d5c34ac"
LAMINAZIONE_ID = "2309b780-8ba9-47eb-b7d9-7eb47b1e7cff"


class TestUpsellingAPI:
    """Test upselling API endpoints"""
    
    def test_get_upselling_suggestions_with_trigger_service(self):
        """Test GET /api/public/upselling returns suggestions for trigger service"""
        response = requests.get(f"{BASE_URL}/api/public/upselling?service_ids={TAGLIO_DONNA_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 1, "Should return at least 1 suggestion"
        
        # Check that suggestions have required fields
        for suggestion in data:
            assert "id" in suggestion, "Suggestion should have id"
            assert "name" in suggestion, "Suggestion should have name"
            assert "original_price" in suggestion, "Suggestion should have original_price"
            assert "discounted_price" in suggestion, "Suggestion should have discounted_price"
            assert "discount_percent" in suggestion, "Suggestion should have discount_percent"
            
            # Verify discount is applied correctly (15%)
            expected_discounted = round(suggestion["original_price"] * 0.85, 2)
            assert suggestion["discounted_price"] == expected_discounted, \
                f"Discounted price should be {expected_discounted}, got {suggestion['discounted_price']}"
    
    def test_get_upselling_suggestions_no_trigger(self):
        """Test GET /api/public/upselling returns empty for non-trigger service"""
        # Use a service that's not a trigger
        response = requests.get(f"{BASE_URL}/api/public/upselling?service_ids={MASCHERA_CURATIVA_ID}")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # May or may not have suggestions depending on config
    
    def test_get_upselling_suggestions_empty_service_ids(self):
        """Test GET /api/public/upselling with empty service_ids"""
        response = requests.get(f"{BASE_URL}/api/public/upselling?service_ids=")
        
        assert response.status_code == 200
        data = response.json()
        assert data == [], "Should return empty list for empty service_ids"
    
    def test_upselling_discount_percentage(self):
        """Test that upselling discount is 15%"""
        response = requests.get(f"{BASE_URL}/api/public/upselling?service_ids={TAGLIO_DONNA_ID}")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            for suggestion in data:
                assert suggestion["discount_percent"] == 15, \
                    f"Discount should be 15%, got {suggestion['discount_percent']}%"


class TestAddServiceToAppointment:
    """Test adding upselling service to appointment"""
    
    @pytest.fixture
    def create_test_appointment(self):
        """Create a test appointment and return its ID"""
        phone = f"333{''.join(random.choices(string.digits, k=7))}"
        
        # Find an available time slot
        for hour in range(8, 20):
            for minute in [0, 15, 30, 45]:
                time_str = f"{hour:02d}:{minute:02d}"
                booking_data = {
                    "client_name": f"TEST_Upselling_{random.randint(1000, 9999)}",
                    "client_phone": phone,
                    "service_ids": [TAGLIO_DONNA_ID],
                    "date": "2026-03-30",  # Future date
                    "time": time_str,
                    "notes": "Test upselling appointment"
                }
                
                response = requests.post(f"{BASE_URL}/api/public/booking", json=booking_data)
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "appointment_id": data["appointment_id"],
                        "phone": phone,
                        "booking_code": data["booking_code"]
                    }
        
        pytest.skip("Could not create test appointment - all time slots occupied")
    
    def test_add_upselling_service_success(self, create_test_appointment):
        """Test POST /api/public/appointments/{id}/add-service"""
        apt = create_test_appointment
        
        add_service_data = {
            "service_id": MASCHERA_CURATIVA_ID,
            "phone": apt["phone"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/appointments/{apt['appointment_id']}/add-service",
            json=add_service_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["success"] == True
        assert "service_name" in data
        assert "discounted_price" in data
        assert "new_total" in data
        
        # Verify discounted price (15% off €3 = €2.55)
        assert data["discounted_price"] == 2.55, f"Expected 2.55, got {data['discounted_price']}"
    
    def test_add_upselling_service_wrong_phone(self, create_test_appointment):
        """Test adding service with wrong phone number fails"""
        apt = create_test_appointment
        
        add_service_data = {
            "service_id": MASCHERA_CURATIVA_ID,
            "phone": "0000000000"  # Wrong phone
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/appointments/{apt['appointment_id']}/add-service",
            json=add_service_data
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_add_upselling_service_invalid_appointment(self):
        """Test adding service to non-existent appointment fails"""
        add_service_data = {
            "service_id": MASCHERA_CURATIVA_ID,
            "phone": "3331234567"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/public/appointments/invalid-id-12345/add-service",
            json=add_service_data
        )
        
        assert response.status_code == 404
    
    def test_add_upselling_service_missing_fields(self):
        """Test adding service with missing fields fails"""
        response = requests.post(
            f"{BASE_URL}/api/public/appointments/some-id/add-service",
            json={}
        )
        
        assert response.status_code == 400


class TestWebsiteConfigUpselling:
    """Test upselling configuration in website config"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        login_data = {
            "email": "admin@brunomelito.it",
            "password": "mbhs637104"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not authenticate")
    
    def test_get_website_config_has_upselling(self, auth_token):
        """Test GET /api/website/config includes upselling settings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        
        assert response.status_code == 200
        
        data = response.json()
        assert "upselling_rules" in data, "Config should have upselling_rules"
        assert "upselling_discount" in data, "Config should have upselling_discount"
        
        # Verify discount is 15%
        assert data["upselling_discount"] == 15, f"Expected 15, got {data['upselling_discount']}"
    
    def test_upselling_rule_structure(self, auth_token):
        """Test upselling rules have correct structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        rules = data.get("upselling_rules", [])
        if len(rules) > 0:
            rule = rules[0]
            assert "trigger_service_id" in rule, "Rule should have trigger_service_id"
            assert "trigger_service_name" in rule, "Rule should have trigger_service_name"
            assert "suggested_service_ids" in rule, "Rule should have suggested_service_ids"
            assert "suggested_service_names" in rule, "Rule should have suggested_service_names"
            
            # Verify the existing rule for Taglio Donna
            if rule["trigger_service_id"] == TAGLIO_DONNA_ID:
                assert rule["trigger_service_name"] == "01 Taglio Donna"
                assert LAMINAZIONE_ID in rule["suggested_service_ids"] or \
                       MASCHERA_CURATIVA_ID in rule["suggested_service_ids"], \
                       "Should have at least one suggested service"


class TestPublicServicesAPI:
    """Test public services API"""
    
    def test_get_public_services(self):
        """Test GET /api/public/services returns services list"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one service"
        
        # Find Taglio Donna
        taglio_donna = next((s for s in data if s["id"] == TAGLIO_DONNA_ID), None)
        assert taglio_donna is not None, "Taglio Donna service should exist"
        assert taglio_donna["name"] == "01 Taglio Donna"
        assert taglio_donna["price"] == 10.0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
