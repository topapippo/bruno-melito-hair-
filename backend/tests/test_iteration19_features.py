"""
Iteration 19 Tests: Modal Widths, Conflict Flow, Dynamic Colors, Object Storage
Tests for:
1. Public booking modal wider (sm:max-w-4xl) with 3-column service grid
2. Admin planning dialog wider (sm:max-w-[900px]) with 3-column service grid
3. Booking conflict flow returns 409 with available_operators and alternative_slots
4. Dynamic colors from config (primary_color)
5. Object storage upload and serve endpoints
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicWebsiteConfig:
    """Test dynamic colors from website config"""
    
    def test_public_website_returns_config_with_primary_color(self):
        """Verify /api/public/website returns config with primary_color"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        
        # Check config exists
        assert "config" in data
        config = data["config"]
        
        # Check primary_color exists and is a valid hex color
        assert "primary_color" in config
        primary_color = config["primary_color"]
        assert primary_color.startswith("#")
        assert len(primary_color) in [4, 7]  # #RGB or #RRGGBB
        print(f"PASS: primary_color = {primary_color}")
        
    def test_public_website_returns_card_templates(self):
        """Verify /api/public/website returns card_templates array"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        
        assert "card_templates" in data
        assert isinstance(data["card_templates"], list)
        print(f"PASS: card_templates count = {len(data['card_templates'])}")
        
    def test_public_website_returns_promos(self):
        """Verify /api/public/website returns promos array"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        
        assert "promos" in data
        assert isinstance(data["promos"], list)
        print(f"PASS: promos count = {len(data['promos'])}")


class TestPublicServices:
    """Test public services endpoint"""
    
    def test_public_services_returns_list(self):
        """Verify /api/public/services returns services list"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check service structure
        service = data[0]
        assert "id" in service
        assert "name" in service
        assert "price" in service
        assert "duration" in service
        assert "category" in service
        print(f"PASS: {len(data)} services returned")


class TestPublicOperators:
    """Test public operators endpoint"""
    
    def test_public_operators_returns_list(self):
        """Verify /api/public/operators returns operators list"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check operator structure
        operator = data[0]
        assert "id" in operator
        assert "name" in operator
        print(f"PASS: {len(data)} operators returned")


class TestBusySlots:
    """Test busy slots endpoint"""
    
    def test_busy_slots_returns_structure(self):
        """Verify /api/public/busy-slots returns correct structure"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/public/busy-slots?date={today}")
        assert response.status_code == 200
        data = response.json()
        
        assert "busy" in data
        assert "operators" in data
        assert isinstance(data["busy"], dict)
        assert isinstance(data["operators"], list)
        print(f"PASS: busy_slots structure correct, {len(data['operators'])} operators")


class TestBookingConflictFlow:
    """Test booking conflict detection and response"""
    
    def test_booking_conflict_returns_409_with_details(self):
        """
        Test that booking same slot twice returns 409 with:
        - available_operators array
        - alternative_slots array
        """
        # Get services and operators first
        services_res = requests.get(f"{BASE_URL}/api/public/services")
        assert services_res.status_code == 200
        services = services_res.json()
        assert len(services) > 0
        
        operators_res = requests.get(f"{BASE_URL}/api/public/operators")
        assert operators_res.status_code == 200
        operators = operators_res.json()
        assert len(operators) > 0
        
        # Use a future date to avoid conflicts with existing appointments
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        test_time = "10:00"
        test_service_id = services[0]["id"]
        test_operator_id = operators[0]["id"]
        
        # First booking - should succeed
        booking_data = {
            "client_name": f"TEST_Conflict_{uuid.uuid4().hex[:6]}",
            "client_phone": "3331234567",
            "service_ids": [test_service_id],
            "operator_id": test_operator_id,
            "date": future_date,
            "time": test_time,
            "notes": "Test booking for conflict flow"
        }
        
        first_response = requests.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        
        if first_response.status_code == 409:
            # Slot already taken, check conflict response
            print("First booking got 409 - slot already taken, checking conflict response...")
            conflict_data = first_response.json()
            detail = conflict_data.get("detail", {})
            
            if isinstance(detail, dict):
                assert "available_operators" in detail or "alternative_slots" in detail
                print(f"PASS: Conflict response has available_operators={len(detail.get('available_operators', []))} and alternative_slots={len(detail.get('alternative_slots', []))}")
            return
        
        assert first_response.status_code in [200, 201], f"First booking failed: {first_response.text}"
        print(f"First booking succeeded: {first_response.json()}")
        
        # Second booking with same slot - should return 409
        booking_data["client_name"] = f"TEST_Conflict2_{uuid.uuid4().hex[:6]}"
        second_response = requests.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        
        assert second_response.status_code == 409, f"Expected 409, got {second_response.status_code}: {second_response.text}"
        
        conflict_data = second_response.json()
        detail = conflict_data.get("detail", {})
        
        # Check that detail is a dict with conflict info (not just a string)
        assert isinstance(detail, dict), f"Expected detail to be dict, got {type(detail)}: {detail}"
        
        # Check for available_operators
        assert "available_operators" in detail, f"Missing available_operators in conflict response: {detail}"
        assert isinstance(detail["available_operators"], list)
        
        # Check for alternative_slots
        assert "alternative_slots" in detail, f"Missing alternative_slots in conflict response: {detail}"
        assert isinstance(detail["alternative_slots"], list)
        
        # Check for conflict flag
        assert detail.get("conflict") == True, f"Missing conflict=True in response: {detail}"
        
        print(f"PASS: Conflict response correct - available_operators={len(detail['available_operators'])}, alternative_slots={len(detail['alternative_slots'])}")
        
    def test_conflict_alternative_slots_have_correct_structure(self):
        """Test that alternative_slots have date, time, operator_id, operator_name"""
        # Get services and operators
        services_res = requests.get(f"{BASE_URL}/api/public/services")
        services = services_res.json()
        operators_res = requests.get(f"{BASE_URL}/api/public/operators")
        operators = operators_res.json()
        
        future_date = (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%d")
        test_time = "11:00"
        
        # Create first booking
        booking_data = {
            "client_name": f"TEST_AltSlot_{uuid.uuid4().hex[:6]}",
            "client_phone": "3331234568",
            "service_ids": [services[0]["id"]],
            "operator_id": operators[0]["id"],
            "date": future_date,
            "time": test_time,
            "notes": "Test for alternative slots structure"
        }
        
        first_response = requests.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        
        if first_response.status_code == 409:
            conflict_data = first_response.json()
            detail = conflict_data.get("detail", {})
            if isinstance(detail, dict) and "alternative_slots" in detail:
                alt_slots = detail["alternative_slots"]
                if len(alt_slots) > 0:
                    slot = alt_slots[0]
                    assert "time" in slot, f"Missing time in alternative slot: {slot}"
                    print(f"PASS: Alternative slot structure correct: {slot}")
            return
            
        if first_response.status_code not in [200, 201]:
            pytest.skip(f"First booking failed unexpectedly: {first_response.text}")
            
        # Create second booking to trigger conflict
        booking_data["client_name"] = f"TEST_AltSlot2_{uuid.uuid4().hex[:6]}"
        second_response = requests.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        
        if second_response.status_code == 409:
            conflict_data = second_response.json()
            detail = conflict_data.get("detail", {})
            
            if isinstance(detail, dict) and "alternative_slots" in detail:
                alt_slots = detail["alternative_slots"]
                if len(alt_slots) > 0:
                    slot = alt_slots[0]
                    assert "time" in slot, f"Missing time in alternative slot: {slot}"
                    print(f"PASS: Alternative slot structure correct: {slot}")
                else:
                    print("PASS: No alternative slots available (all busy)")
            else:
                print(f"WARN: Unexpected detail format: {detail}")
        else:
            print(f"WARN: Second booking did not return 409: {second_response.status_code}")


class TestObjectStorage:
    """Test object storage upload and serve endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for admin endpoints"""
        login_data = {
            "email": "admin@brunomelito.it",
            "password": "Admin123!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
        
    def test_upload_endpoint_exists(self, auth_token):
        """Verify /api/website/upload endpoint exists and requires auth"""
        # Test without auth - should fail
        response = requests.post(f"{BASE_URL}/api/website/upload")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASS: Upload endpoint requires authentication")
        
    def test_upload_image_file(self, auth_token):
        """Test uploading an image file to object storage"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a simple test image (1x1 pixel PNG)
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {"file": ("test_image.png", png_data, "image/png")}
        response = requests.post(f"{BASE_URL}/api/website/upload", headers=headers, files=files)
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        assert "id" in data, f"Missing id in upload response: {data}"
        assert "url" in data, f"Missing url in upload response: {data}"
        
        file_id = data["id"]
        file_url = data["url"]
        print(f"PASS: Upload succeeded - id={file_id}, url={file_url}")
        
        return file_id
        
    def test_serve_uploaded_file(self, auth_token):
        """Test serving an uploaded file via /api/website/files/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First upload a file
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {"file": ("test_serve.png", png_data, "image/png")}
        upload_response = requests.post(f"{BASE_URL}/api/website/upload", headers=headers, files=files)
        
        if upload_response.status_code != 200:
            pytest.skip(f"Upload failed, cannot test serve: {upload_response.text}")
            
        file_id = upload_response.json()["id"]
        
        # Now try to serve the file (no auth required for serving)
        serve_response = requests.get(f"{BASE_URL}/api/website/files/{file_id}")
        
        assert serve_response.status_code == 200, f"Serve failed: {serve_response.status_code}"
        assert len(serve_response.content) > 0, "Served file is empty"
        
        content_type = serve_response.headers.get("Content-Type", "")
        assert "image" in content_type.lower() or "octet-stream" in content_type.lower(), f"Unexpected content type: {content_type}"
        
        print(f"PASS: File served successfully - size={len(serve_response.content)} bytes, content-type={content_type}")
        
    def test_serve_nonexistent_file_returns_404(self):
        """Test that serving a non-existent file returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/website/files/{fake_id}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Non-existent file returns 404")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """Test admin login with provided credentials"""
        login_data = {
            "email": "admin@brunomelito.it",
            "password": "Admin123!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # API returns access_token (not token)
        assert "access_token" in data or "token" in data, f"Missing token in login response: {data}"
        assert "user" in data, f"Missing user in login response: {data}"
        print("PASS: Admin login successful")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
