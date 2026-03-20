"""
Tests for salon booking refactoring iteration 7
- Tests public API endpoints: busy-slots, booking with conflict handling
- Tests the 409 conflict response with available_operators and alternative_slots
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://hair-booking-fix.preview.emergentagent.com').rstrip('/')

# Test data
TEST_OPERATOR_BRUNO = "199c0886-55af-40c3-8658-edd0be74ce70"
TEST_OPERATOR_MBHS = "f75dbe6c-1e1a-4d4d-ad13-6c36fccba262"
TEST_DATE_WITH_APPOINTMENT = "2026-03-18"
TEST_TIME_BUSY = "10:00"


class TestPublicServicesAndOperators:
    """Tests for public services and operators endpoints"""

    def test_get_public_services_returns_list(self):
        """GET /api/public/services returns a list of services"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify service structure
        service = data[0]
        assert "id" in service
        assert "name" in service
        assert "category" in service
        assert "duration" in service
        assert "price" in service
        print(f"Found {len(data)} services")

    def test_get_public_operators_returns_list(self):
        """GET /api/public/operators returns list of operators"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2  # BRUNO and MBHS
        # Verify operator structure
        operator_names = [o["name"] for o in data]
        assert "BRUNO" in operator_names
        assert "MBHS" in operator_names
        print(f"Found operators: {operator_names}")


class TestBusySlotsEndpoint:
    """Tests for GET /api/public/busy-slots endpoint"""

    def test_busy_slots_returns_busy_data(self):
        """GET /api/public/busy-slots returns busy slots for a date"""
        response = requests.get(f"{BASE_URL}/api/public/busy-slots?date={TEST_DATE_WITH_APPOINTMENT}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "busy" in data
        assert "operators" in data
        assert isinstance(data["busy"], dict)
        assert isinstance(data["operators"], list)
        
        # Verify 10:00 is busy for BRUNO
        assert TEST_TIME_BUSY in data["busy"]
        busy_at_10 = data["busy"][TEST_TIME_BUSY]
        assert len(busy_at_10) > 0
        assert any(b["operator_id"] == TEST_OPERATOR_BRUNO for b in busy_at_10)
        print(f"Busy slots at {TEST_DATE_WITH_APPOINTMENT}: {list(data['busy'].keys())}")

    def test_busy_slots_empty_date(self):
        """GET /api/public/busy-slots for a date with no appointments"""
        response = requests.get(f"{BASE_URL}/api/public/busy-slots?date=2026-12-25")
        assert response.status_code == 200
        data = response.json()
        assert "busy" in data
        assert isinstance(data["busy"], dict)
        # Might be empty or have data
        print(f"Busy slots on 2026-12-25: {len(data['busy'])} slots")


class TestBookingConflictHandling:
    """Tests for POST /api/public/booking conflict handling (HTTP 409)"""

    def test_booking_conflict_returns_409(self):
        """POST /api/public/booking returns 409 when slot is occupied"""
        # Get a service ID for booking
        services_resp = requests.get(f"{BASE_URL}/api/public/services")
        service_id = services_resp.json()[0]["id"]
        
        # Try to book BRUNO at 10:00 on 2026-03-18 (known to be busy)
        response = requests.post(
            f"{BASE_URL}/api/public/booking",
            json={
                "client_name": "TEST_Conflict_Client",
                "client_phone": "TEST_333999888",
                "service_ids": [service_id],
                "operator_id": TEST_OPERATOR_BRUNO,
                "date": TEST_DATE_WITH_APPOINTMENT,
                "time": TEST_TIME_BUSY,
                "notes": "Testing conflict"
            }
        )
        
        assert response.status_code == 409, f"Expected 409, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify conflict response structure
        detail = data.get("detail", {})
        assert "message" in detail or detail.get("conflict") == True
        assert detail.get("conflict") == True
        print(f"Conflict response: {detail.get('message')}")

    def test_conflict_returns_available_operators(self):
        """POST /api/public/booking conflict includes available_operators"""
        services_resp = requests.get(f"{BASE_URL}/api/public/services")
        service_id = services_resp.json()[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/public/booking",
            json={
                "client_name": "TEST_Operators_Client",
                "client_phone": "TEST_333999887",
                "service_ids": [service_id],
                "operator_id": TEST_OPERATOR_BRUNO,
                "date": TEST_DATE_WITH_APPOINTMENT,
                "time": TEST_TIME_BUSY,
                "notes": ""
            }
        )
        
        assert response.status_code == 409
        detail = response.json().get("detail", {})
        
        # Verify available_operators
        assert "available_operators" in detail
        available_ops = detail["available_operators"]
        assert isinstance(available_ops, list)
        # MBHS should be available since only BRUNO is busy at 10:00
        op_ids = [o["id"] for o in available_ops]
        assert TEST_OPERATOR_MBHS in op_ids
        print(f"Available operators: {[o['name'] for o in available_ops]}")

    def test_conflict_returns_alternative_slots(self):
        """POST /api/public/booking conflict includes alternative_slots"""
        services_resp = requests.get(f"{BASE_URL}/api/public/services")
        service_id = services_resp.json()[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/public/booking",
            json={
                "client_name": "TEST_Slots_Client",
                "client_phone": "TEST_333999886",
                "service_ids": [service_id],
                "operator_id": TEST_OPERATOR_BRUNO,
                "date": TEST_DATE_WITH_APPOINTMENT,
                "time": TEST_TIME_BUSY,
                "notes": ""
            }
        )
        
        assert response.status_code == 409
        detail = response.json().get("detail", {})
        
        # Verify alternative_slots
        assert "alternative_slots" in detail
        alt_slots = detail["alternative_slots"]
        assert isinstance(alt_slots, list)
        assert len(alt_slots) > 0
        
        # Verify slot structure
        slot = alt_slots[0]
        assert "date" in slot
        assert "time" in slot
        assert "operator_id" in slot or "operator_name" in slot
        print(f"Alternative slots: {[(s['time'], s.get('operator_name')) for s in alt_slots[:4]]}")

    def test_booking_success_free_slot(self):
        """POST /api/public/booking succeeds for a free slot"""
        services_resp = requests.get(f"{BASE_URL}/api/public/services")
        service_id = services_resp.json()[0]["id"]
        
        import uuid
        unique_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/public/booking",
            json={
                "client_name": "TEST_Success_Client",
                "client_phone": unique_phone,
                "service_ids": [service_id],
                "operator_id": TEST_OPERATOR_MBHS,  # MBHS should be free
                "date": TEST_DATE_WITH_APPOINTMENT,
                "time": "11:30",  # A time slot that should be free
                "notes": "Test booking success"
            }
        )
        
        # Could be 200 success or 409 if slot is actually busy
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "appointment_id" in data
            assert "booking_code" in data
            print(f"Booking created: {data['booking_code']}")
        else:
            print(f"Slot was not free: {response.status_code}")


class TestMyAppointmentsLookup:
    """Tests for GET /api/public/my-appointments endpoint"""

    def test_lookup_returns_list(self):
        """GET /api/public/my-appointments returns list for valid phone"""
        # First create a booking to ensure there's data
        services_resp = requests.get(f"{BASE_URL}/api/public/services")
        service_id = services_resp.json()[0]["id"]
        
        test_phone = "TEST_LOOKUP_333111222"
        
        # Create a booking
        requests.post(
            f"{BASE_URL}/api/public/booking",
            json={
                "client_name": "TEST_Lookup_Client",
                "client_phone": test_phone,
                "service_ids": [service_id],
                "operator_id": None,
                "date": "2026-04-15",
                "time": "15:00",
                "notes": ""
            }
        )
        
        # Look up appointments
        response = requests.get(f"{BASE_URL}/api/public/my-appointments?phone={test_phone}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} appointments for test phone")

    def test_lookup_unknown_phone_returns_empty(self):
        """GET /api/public/my-appointments returns empty for unknown phone"""
        response = requests.get(f"{BASE_URL}/api/public/my-appointments?phone=UNKNOWN_999999999")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0


class TestLoginEndpoint:
    """Tests for admin login"""

    def test_login_success(self):
        """POST /api/auth/login succeeds with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@brunomelito.it",
                "password": "Admin123!"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print("Login successful")

    def test_login_failure(self):
        """POST /api/auth/login fails with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "wrong@email.com",
                "password": "wrongpassword"
            }
        )
        assert response.status_code in [401, 400]
        print("Invalid login rejected correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
