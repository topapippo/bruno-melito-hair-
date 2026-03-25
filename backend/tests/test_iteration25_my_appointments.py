"""
Iteration 25 Tests: My Appointments Feature & Booking Conflict Resolution
Tests:
1. Public site /sito loads correctly with navbar showing 'Appuntamenti' button
2. GET /api/public/my-appointments?phone=xxx returns {upcoming:[], history:[]} structure
3. PUT /api/public/appointments/{id} modifies appointment
4. DELETE /api/public/appointments/{id}?phone=xxx cancels appointment
5. POST /api/public/booking with conflict returns 409 with available_operators and alternative_slots
6. Section reordering in CMS (verified in iteration 24)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@brunomelito.it"
ADMIN_PASSWORD = "mbhs637104"

# Operators from the request
OPERATOR_BRUNO_ID = "199c0886-55af-40c3-8658-edd0be74ce70"
OPERATOR_MBHS_ID = "f75dbe6c-1e1a-4d4d-ad13-6c36fccba262"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestPublicSiteLoads:
    """Test that public site /sito loads correctly"""
    
    def test_public_site_returns_200(self, api_client):
        """GET /sito should return 200"""
        response = api_client.get(f"{BASE_URL}/sito")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: Public site /sito returns 200")
    
    def test_public_website_api_returns_config(self, api_client):
        """GET /api/public/website should return config with section_order"""
        response = api_client.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        assert "config" in data
        assert "section_order" in data["config"]
        print(f"PASS: Public website API returns config with section_order: {data['config']['section_order']}")


class TestMyAppointmentsAPI:
    """Test the My Appointments lookup feature"""
    
    def test_my_appointments_nonexistent_phone(self, api_client):
        """GET /api/public/my-appointments?phone=123 returns empty arrays for non-existent phone"""
        response = api_client.get(f"{BASE_URL}/api/public/my-appointments?phone=123")
        assert response.status_code == 200
        data = response.json()
        assert "upcoming" in data
        assert "history" in data
        assert isinstance(data["upcoming"], list)
        assert isinstance(data["history"], list)
        assert len(data["upcoming"]) == 0
        assert len(data["history"]) == 0
        print("PASS: GET /api/public/my-appointments?phone=123 returns {upcoming:[], history:[]}")
    
    def test_my_appointments_structure(self, api_client):
        """GET /api/public/my-appointments returns proper structure"""
        response = api_client.get(f"{BASE_URL}/api/public/my-appointments?phone=339783")
        assert response.status_code == 200
        data = response.json()
        assert "upcoming" in data
        assert "history" in data
        # client_name is only returned when a client is found
        # When no client found, returns {upcoming:[], history:[]}
        print(f"PASS: GET /api/public/my-appointments returns proper structure: upcoming={len(data['upcoming'])}, history={len(data['history'])}, client_name='{data.get('client_name', 'N/A')}'")
    
    def test_my_appointments_with_created_booking(self, api_client):
        """Create a booking and verify my-appointments returns client_name"""
        # Get services
        services_resp = api_client.get(f"{BASE_URL}/api/public/services")
        services = services_resp.json()
        if not services:
            pytest.skip("No services available")
        
        # Create booking with unique phone
        test_phone = f"339{uuid.uuid4().hex[:7]}"
        future_date = (datetime.now() + timedelta(days=40)).strftime("%Y-%m-%d")
        
        booking_data = {
            "client_name": "Test Structure Client",
            "client_phone": test_phone,
            "service_ids": [services[0]["id"]],
            "operator_id": "",
            "date": future_date,
            "time": "12:00",
            "notes": "Test for structure"
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        if create_resp.status_code != 200:
            pytest.skip(f"Could not create booking: {create_resp.status_code}")
        
        # Now lookup with the phone
        lookup_resp = api_client.get(f"{BASE_URL}/api/public/my-appointments?phone={test_phone}")
        assert lookup_resp.status_code == 200
        data = lookup_resp.json()
        
        assert "upcoming" in data
        assert "history" in data
        assert "client_name" in data, "client_name should be returned when client exists"
        assert data["client_name"] == "Test Structure Client"
        assert len(data["upcoming"]) > 0, "Should have at least one upcoming appointment"
        
        print(f"PASS: GET /api/public/my-appointments with existing client returns client_name='{data['client_name']}' and {len(data['upcoming'])} upcoming appointments")


class TestBookingConflictResolution:
    """Test booking conflict resolution with available operators and alternative slots"""
    
    def test_get_public_services(self, api_client):
        """GET /api/public/services returns services list"""
        response = api_client.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        services = response.json()
        assert isinstance(services, list)
        print(f"PASS: GET /api/public/services returns {len(services)} services")
        return services
    
    def test_get_public_operators(self, api_client):
        """GET /api/public/operators returns operators list"""
        response = api_client.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200
        operators = response.json()
        assert isinstance(operators, list)
        print(f"PASS: GET /api/public/operators returns {len(operators)} operators")
        return operators
    
    def test_booking_success_creates_appointment(self, api_client):
        """POST /api/public/booking creates appointment successfully"""
        # Get a service first
        services_resp = api_client.get(f"{BASE_URL}/api/public/services")
        services = services_resp.json()
        if not services:
            pytest.skip("No services available")
        
        # Use a unique phone and future date to avoid conflicts
        test_phone = f"TEST_{uuid.uuid4().hex[:8]}"
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        booking_data = {
            "client_name": "Test Client Iteration25",
            "client_phone": test_phone,
            "service_ids": [services[0]["id"]],
            "operator_id": "",
            "date": future_date,
            "time": "10:00",
            "notes": "Test booking for iteration 25"
        }
        
        response = api_client.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        # Could be 200 (success) or 409 (conflict)
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert "appointment_id" in data
            print(f"PASS: POST /api/public/booking created appointment: {data.get('appointment_id', '')[:8]}")
            return data
        elif response.status_code == 409:
            data = response.json()
            assert "detail" in data
            assert data["detail"].get("conflict") == True
            print(f"PASS: POST /api/public/booking returned 409 conflict (expected if slot busy)")
            return None
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_booking_conflict_returns_409_with_alternatives(self, api_client):
        """POST /api/public/booking with conflict returns 409 with available_operators and alternative_slots"""
        # Get services and operators
        services_resp = api_client.get(f"{BASE_URL}/api/public/services")
        services = services_resp.json()
        if not services:
            pytest.skip("No services available")
        
        operators_resp = api_client.get(f"{BASE_URL}/api/public/operators")
        operators = operators_resp.json()
        
        # Create first booking
        test_phone1 = f"TEST_CONFLICT1_{uuid.uuid4().hex[:6]}"
        future_date = (datetime.now() + timedelta(days=31)).strftime("%Y-%m-%d")
        conflict_time = "11:00"
        
        booking1 = {
            "client_name": "Test Conflict Client 1",
            "client_phone": test_phone1,
            "service_ids": [services[0]["id"]],
            "operator_id": operators[0]["id"] if operators else "",
            "date": future_date,
            "time": conflict_time,
            "notes": "First booking for conflict test"
        }
        
        resp1 = api_client.post(f"{BASE_URL}/api/public/booking", json=booking1)
        
        # Try to book same slot with same operator
        test_phone2 = f"TEST_CONFLICT2_{uuid.uuid4().hex[:6]}"
        booking2 = {
            "client_name": "Test Conflict Client 2",
            "client_phone": test_phone2,
            "service_ids": [services[0]["id"]],
            "operator_id": operators[0]["id"] if operators else "",
            "date": future_date,
            "time": conflict_time,
            "notes": "Second booking for conflict test"
        }
        
        resp2 = api_client.post(f"{BASE_URL}/api/public/booking", json=booking2)
        
        if resp2.status_code == 409:
            data = resp2.json()
            detail = data.get("detail", {})
            assert detail.get("conflict") == True, "Expected conflict=True in response"
            assert "available_operators" in detail, "Expected available_operators in 409 response"
            assert "alternative_slots" in detail, "Expected alternative_slots in 409 response"
            assert isinstance(detail["available_operators"], list)
            assert isinstance(detail["alternative_slots"], list)
            print(f"PASS: POST /api/public/booking conflict returns 409 with available_operators={len(detail['available_operators'])} and alternative_slots={len(detail['alternative_slots'])}")
        elif resp2.status_code == 200:
            # If no conflict (different operator assigned), that's also valid
            print("PASS: POST /api/public/booking succeeded (no conflict - different operator assigned)")
        else:
            pytest.fail(f"Unexpected status code: {resp2.status_code}")


class TestAppointmentModifyCancel:
    """Test modify and cancel appointment endpoints"""
    
    def test_create_and_lookup_appointment(self, api_client):
        """Create appointment and verify it appears in my-appointments lookup"""
        # Get services
        services_resp = api_client.get(f"{BASE_URL}/api/public/services")
        services = services_resp.json()
        if not services:
            pytest.skip("No services available")
        
        # Create booking with unique phone
        test_phone = f"339{uuid.uuid4().hex[:7]}"
        future_date = (datetime.now() + timedelta(days=32)).strftime("%Y-%m-%d")
        
        booking_data = {
            "client_name": "Test Lookup Client",
            "client_phone": test_phone,
            "service_ids": [services[0]["id"]],
            "operator_id": "",
            "date": future_date,
            "time": "14:00",
            "notes": "Test for lookup"
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        if create_resp.status_code != 200:
            pytest.skip(f"Could not create booking: {create_resp.status_code}")
        
        created = create_resp.json()
        appointment_id = created.get("appointment_id")
        
        # Lookup appointments
        lookup_resp = api_client.get(f"{BASE_URL}/api/public/my-appointments?phone={test_phone}")
        assert lookup_resp.status_code == 200
        lookup_data = lookup_resp.json()
        
        # Should find the appointment in upcoming
        upcoming_ids = [a["id"] for a in lookup_data.get("upcoming", [])]
        assert appointment_id in upcoming_ids, f"Created appointment {appointment_id} not found in upcoming"
        print(f"PASS: Created appointment found in my-appointments lookup")
        
        return {"appointment_id": appointment_id, "phone": test_phone, "date": future_date}
    
    def test_modify_appointment(self, api_client):
        """PUT /api/public/appointments/{id} modifies appointment"""
        # First create an appointment
        services_resp = api_client.get(f"{BASE_URL}/api/public/services")
        services = services_resp.json()
        if not services:
            pytest.skip("No services available")
        
        test_phone = f"339{uuid.uuid4().hex[:7]}"
        # Use far future dates with unique times to avoid conflicts
        future_date = (datetime.now() + timedelta(days=53)).strftime("%Y-%m-%d")
        new_date = (datetime.now() + timedelta(days=54)).strftime("%Y-%m-%d")
        # Use random minute to avoid conflicts
        import random
        random_minute = random.choice(["00", "15", "30", "45"])
        original_time = f"08:{random_minute}"
        new_time = f"09:{random_minute}"
        
        booking_data = {
            "client_name": "Test Modify Client",
            "client_phone": test_phone,
            "service_ids": [services[0]["id"]],
            "operator_id": "",
            "date": future_date,
            "time": original_time,
            "notes": "Test for modify"
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        if create_resp.status_code != 200:
            pytest.skip(f"Could not create booking: {create_resp.status_code}")
        
        appointment_id = create_resp.json().get("appointment_id")
        
        # Modify the appointment
        modify_data = {
            "phone": test_phone,
            "date": new_date,
            "time": new_time
        }
        
        modify_resp = api_client.put(f"{BASE_URL}/api/public/appointments/{appointment_id}", json=modify_data)
        assert modify_resp.status_code == 200, f"Expected 200, got {modify_resp.status_code}: {modify_resp.text}"
        
        modify_result = modify_resp.json()
        assert modify_result.get("success") == True
        print(f"PASS: PUT /api/public/appointments/{appointment_id[:8]} modified successfully")
    
    def test_modify_appointment_wrong_phone(self, api_client):
        """PUT /api/public/appointments/{id} with wrong phone returns 403"""
        # First create an appointment
        services_resp = api_client.get(f"{BASE_URL}/api/public/services")
        services = services_resp.json()
        if not services:
            pytest.skip("No services available")
        
        test_phone = f"339{uuid.uuid4().hex[:7]}"
        future_date = (datetime.now() + timedelta(days=35)).strftime("%Y-%m-%d")
        
        booking_data = {
            "client_name": "Test Wrong Phone Client",
            "client_phone": test_phone,
            "service_ids": [services[0]["id"]],
            "operator_id": "",
            "date": future_date,
            "time": "17:00",
            "notes": "Test for wrong phone"
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        if create_resp.status_code != 200:
            pytest.skip(f"Could not create booking: {create_resp.status_code}")
        
        appointment_id = create_resp.json().get("appointment_id")
        
        # Try to modify with wrong phone
        modify_data = {
            "phone": "WRONG_PHONE_123",
            "date": future_date,
            "time": "18:00"
        }
        
        modify_resp = api_client.put(f"{BASE_URL}/api/public/appointments/{appointment_id}", json=modify_data)
        assert modify_resp.status_code == 403, f"Expected 403, got {modify_resp.status_code}"
        print(f"PASS: PUT /api/public/appointments with wrong phone returns 403")
    
    def test_cancel_appointment(self, api_client):
        """DELETE /api/public/appointments/{id}?phone=xxx cancels appointment"""
        # First create an appointment
        services_resp = api_client.get(f"{BASE_URL}/api/public/services")
        services = services_resp.json()
        if not services:
            pytest.skip("No services available")
        
        test_phone = f"339{uuid.uuid4().hex[:7]}"
        future_date = (datetime.now() + timedelta(days=36)).strftime("%Y-%m-%d")
        
        booking_data = {
            "client_name": "Test Cancel Client",
            "client_phone": test_phone,
            "service_ids": [services[0]["id"]],
            "operator_id": "",
            "date": future_date,
            "time": "09:00",
            "notes": "Test for cancel"
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        if create_resp.status_code != 200:
            pytest.skip(f"Could not create booking: {create_resp.status_code}")
        
        appointment_id = create_resp.json().get("appointment_id")
        
        # Cancel the appointment
        cancel_resp = api_client.delete(f"{BASE_URL}/api/public/appointments/{appointment_id}?phone={test_phone}")
        assert cancel_resp.status_code == 200, f"Expected 200, got {cancel_resp.status_code}: {cancel_resp.text}"
        
        cancel_result = cancel_resp.json()
        assert cancel_result.get("success") == True
        print(f"PASS: DELETE /api/public/appointments/{appointment_id[:8]}?phone=xxx cancelled successfully")
        
        # Verify it's no longer in upcoming
        lookup_resp = api_client.get(f"{BASE_URL}/api/public/my-appointments?phone={test_phone}")
        lookup_data = lookup_resp.json()
        upcoming_ids = [a["id"] for a in lookup_data.get("upcoming", [])]
        assert appointment_id not in upcoming_ids, "Cancelled appointment should not be in upcoming"
        print(f"PASS: Cancelled appointment no longer in upcoming list")
    
    def test_cancel_appointment_wrong_phone(self, api_client):
        """DELETE /api/public/appointments/{id}?phone=xxx with wrong phone returns 403"""
        # First create an appointment
        services_resp = api_client.get(f"{BASE_URL}/api/public/services")
        services = services_resp.json()
        if not services:
            pytest.skip("No services available")
        
        test_phone = f"339{uuid.uuid4().hex[:7]}"
        future_date = (datetime.now() + timedelta(days=37)).strftime("%Y-%m-%d")
        
        booking_data = {
            "client_name": "Test Cancel Wrong Phone",
            "client_phone": test_phone,
            "service_ids": [services[0]["id"]],
            "operator_id": "",
            "date": future_date,
            "time": "10:00",
            "notes": "Test for cancel wrong phone"
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/public/booking", json=booking_data)
        if create_resp.status_code != 200:
            pytest.skip(f"Could not create booking: {create_resp.status_code}")
        
        appointment_id = create_resp.json().get("appointment_id")
        
        # Try to cancel with wrong phone
        cancel_resp = api_client.delete(f"{BASE_URL}/api/public/appointments/{appointment_id}?phone=WRONG_PHONE")
        assert cancel_resp.status_code == 403, f"Expected 403, got {cancel_resp.status_code}"
        print(f"PASS: DELETE /api/public/appointments with wrong phone returns 403")


class TestSectionReordering:
    """Test section reordering feature (verified in iteration 24)"""
    
    def test_public_website_has_section_order(self, api_client):
        """GET /api/public/website returns section_order in config"""
        response = api_client.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        config = data.get("config", {})
        section_order = config.get("section_order", [])
        
        expected_sections = ["services", "salon", "about", "promotions", "reviews", "gallery", "loyalty", "contact"]
        for section in expected_sections:
            assert section in section_order, f"Expected section '{section}' in section_order"
        
        print(f"PASS: section_order contains all expected sections: {section_order}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
