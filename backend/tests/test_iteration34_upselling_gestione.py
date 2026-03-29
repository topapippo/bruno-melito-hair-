"""
Test suite for Iteration 34: Upselling on WebsitePage and Gestione Sito save functionality
Tests:
1. /prenota redirects to /sito
2. Upselling suggestions appear after booking
3. Upselling add service works
4. Gestione Sito save works for all tabs
"""
import pytest
import requests
import os
import random
import string
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://salon-cms-system.preview.emergentagent.com')

# Test data - service IDs from the database
TAGLIO_DONNA_ID = "7188fb89-2029-449a-8c09-a322104355bc"
MASCHERA_CURATIVA_ID = "2ec7dd94-a324-49de-bd3b-aa0a0d5c34ac"
LAMINAZIONE_ID = "2309b780-8ba9-47eb-b7d9-7eb47b1e7cff"


class TestPrenotaRedirect:
    """Test that /prenota redirects to /sito"""
    
    def test_prenota_returns_200(self):
        """Test /prenota endpoint returns 200 (React handles redirect)"""
        response = requests.get(f"{BASE_URL}/prenota", allow_redirects=True)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_sito_returns_200(self):
        """Test /sito endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/sito")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


class TestUpsellingAPI:
    """Test upselling API endpoints"""
    
    def test_get_upselling_suggestions_with_trigger_service(self):
        """Test GET /api/public/upselling returns suggestions for trigger service"""
        response = requests.get(f"{BASE_URL}/api/public/upselling?service_ids={TAGLIO_DONNA_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
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
    
    def test_upselling_discount_is_15_percent(self):
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
        
        # Use a future date
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        # Find an available time slot
        for hour in range(8, 20):
            for minute in [0, 15, 30, 45]:
                time_str = f"{hour:02d}:{minute:02d}"
                booking_data = {
                    "client_name": f"TEST_Upselling_{random.randint(1000, 9999)}",
                    "client_phone": phone,
                    "service_ids": [TAGLIO_DONNA_ID],
                    "date": future_date,
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


class TestGestioneSitoSave:
    """Test Gestione Sito (WebsiteAdminPage) save functionality for all tabs"""
    
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
    
    def test_get_website_config(self, auth_token):
        """Test GET /api/website/config returns config"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check essential fields exist
        assert "salon_name" in data
        assert "upselling_rules" in data
        assert "upselling_discount" in data
        assert "section_order" in data
        assert "hours" in data
    
    def test_save_general_tab(self, auth_token):
        """Test saving General tab config"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current config
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert response.status_code == 200
        current_config = response.json()
        
        # Modify a field
        test_slogan = f"Test Slogan {random.randint(1000, 9999)}"
        current_config["hero_slogan"] = test_slogan
        
        # Save
        response = requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=current_config)
        assert response.status_code == 200, f"Save failed: {response.text}"
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert response.status_code == 200
        saved_config = response.json()
        assert saved_config["hero_slogan"] == test_slogan, "hero_slogan not persisted"
    
    def test_save_upselling_tab(self, auth_token):
        """Test saving Upselling tab config"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current config
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert response.status_code == 200
        current_config = response.json()
        
        # Modify upselling discount
        original_discount = current_config.get("upselling_discount", 15)
        test_discount = 20 if original_discount != 20 else 15
        current_config["upselling_discount"] = test_discount
        
        # Save
        response = requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=current_config)
        assert response.status_code == 200, f"Save failed: {response.text}"
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert response.status_code == 200
        saved_config = response.json()
        assert saved_config["upselling_discount"] == test_discount, "upselling_discount not persisted"
        
        # Restore original
        current_config["upselling_discount"] = original_discount
        requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=current_config)
    
    def test_save_layout_tab(self, auth_token):
        """Test saving Layout tab (section_order)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current config
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert response.status_code == 200
        current_config = response.json()
        
        # Get current section order
        original_order = current_config.get("section_order", [])
        
        # Modify section order (swap first two if possible)
        if len(original_order) >= 2:
            test_order = original_order.copy()
            test_order[0], test_order[1] = test_order[1], test_order[0]
            current_config["section_order"] = test_order
            
            # Save
            response = requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=current_config)
            assert response.status_code == 200, f"Save failed: {response.text}"
            
            # Verify persistence
            response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
            assert response.status_code == 200
            saved_config = response.json()
            assert saved_config["section_order"] == test_order, "section_order not persisted"
            
            # Restore original
            current_config["section_order"] = original_order
            requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=current_config)
    
    def test_save_aspetto_tab(self, auth_token):
        """Test saving Aspetto tab (colors/fonts)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current config
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert response.status_code == 200
        current_config = response.json()
        
        # Store original values
        original_primary = current_config.get("primary_color", "#C8617A")
        
        # Modify color
        test_color = "#FF5733" if original_primary != "#FF5733" else "#C8617A"
        current_config["primary_color"] = test_color
        
        # Save
        response = requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=current_config)
        assert response.status_code == 200, f"Save failed: {response.text}"
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert response.status_code == 200
        saved_config = response.json()
        assert saved_config["primary_color"] == test_color, "primary_color not persisted"
        
        # Restore original
        current_config["primary_color"] = original_primary
        requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=current_config)
    
    def test_save_hours_contacts_tab(self, auth_token):
        """Test saving Orari & Contatti tab"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current config
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert response.status_code == 200
        current_config = response.json()
        
        # Store original values
        original_hours = current_config.get("hours", {})
        original_email = current_config.get("email", "")
        
        # Modify hours
        test_hours = original_hours.copy() if original_hours else {}
        test_hours["lun"] = "09:00 - 18:00" if test_hours.get("lun") != "09:00 - 18:00" else "Chiuso"
        current_config["hours"] = test_hours
        
        # Modify email
        test_email = f"test{random.randint(100, 999)}@brunomelito.it"
        current_config["email"] = test_email
        
        # Save
        response = requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=current_config)
        assert response.status_code == 200, f"Save failed: {response.text}"
        
        # Verify persistence
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert response.status_code == 200
        saved_config = response.json()
        assert saved_config["hours"]["lun"] == test_hours["lun"], "hours not persisted"
        assert saved_config["email"] == test_email, "email not persisted"
        
        # Restore original
        current_config["hours"] = original_hours
        current_config["email"] = original_email
        requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=current_config)
    
    def test_upselling_rules_structure(self, auth_token):
        """Test upselling rules have correct structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        rules = data.get("upselling_rules", [])
        if len(rules) > 0:
            rule = rules[0]
            assert "trigger_service_id" in rule, "Rule should have trigger_service_id"
            assert "suggested_service_ids" in rule, "Rule should have suggested_service_ids"


class TestFullBookingFlowWithUpselling:
    """Test full booking flow on /sito with upselling"""
    
    def test_public_services_available(self):
        """Test public services are available"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have services available"
        
        # Find Taglio Donna
        taglio_donna = next((s for s in data if s["id"] == TAGLIO_DONNA_ID), None)
        assert taglio_donna is not None, "Taglio Donna service should exist"
    
    def test_public_operators_available(self):
        """Test public operators are available"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_public_website_data(self):
        """Test public website data endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        
        data = response.json()
        assert "config" in data
        assert "services" in data
        assert "reviews" in data
        assert "gallery" in data
    
    def test_booking_creates_appointment(self):
        """Test booking creates appointment and returns appointment_id"""
        phone = f"333{''.join(random.choices(string.digits, k=7))}"
        
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        
        booking_data = {
            "client_name": f"TEST_Booking_{random.randint(1000, 9999)}",
            "client_phone": phone,
            "service_ids": [TAGLIO_DONNA_ID],
            "date": future_date,
            "time": "10:00",
            "notes": "Test booking"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        
        # May get 409 if slot is taken, that's OK
        if response.status_code == 200:
            data = response.json()
            assert "appointment_id" in data
            assert "booking_code" in data
            assert data["success"] == True
        elif response.status_code == 409:
            # Slot conflict is acceptable
            pass
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
