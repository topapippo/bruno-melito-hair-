"""
Test suite for Sospesi (Suspended Payments) and Checkout features
Tests: Payment methods (Contanti, POS, Sospeso), Sospesi API endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "mbhs637104"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns 'access_token' not 'token'
        assert "access_token" in data, f"No access_token in response: {data}"
        return data["access_token"]
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "mbhs637104"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login successful, user: {data['user'].get('email')}")


class TestSospesiAPI:
    """Tests for Sospesi (Suspended Payments) API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "mbhs637104"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_client_id(self, auth_headers):
        """Get or create a test client"""
        # First try to get existing clients
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        if response.status_code == 200:
            clients = response.json()
            if clients and len(clients) > 0:
                return clients[0]["id"]
        
        # Create a test client if none exist
        response = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
            "name": "TEST_Sospesi_Client",
            "phone": "1234567890",
            "notes": "Test client for sospesi testing"
        })
        if response.status_code in [200, 201]:
            return response.json()["id"]
        
        pytest.skip("Could not get or create test client")
    
    def test_get_client_sospesi_empty(self, auth_headers, test_client_id):
        """Test getting sospesi for a client (may be empty)"""
        response = requests.get(
            f"{BASE_URL}/api/sospesi/client/{test_client_id}",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to get sospesi: {response.text}"
        data = response.json()
        assert "sospesi" in data, f"Response missing 'sospesi' key: {data}"
        assert "total" in data, f"Response missing 'total' key: {data}"
        assert isinstance(data["sospesi"], list)
        print(f"Client has {len(data['sospesi'])} sospesi, total: {data['total']}")
    
    def test_get_sospesi_invalid_client(self, auth_headers):
        """Test getting sospesi for non-existent client"""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{BASE_URL}/api/sospesi/client/{fake_id}",
            headers=auth_headers
        )
        # Should return empty list, not 404
        assert response.status_code == 200
        data = response.json()
        assert data["sospesi"] == []
        assert data["total"] == 0
    
    def test_settle_sospeso_not_found(self, auth_headers):
        """Test settling a non-existent sospeso"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/sospesi/{fake_id}/settle/cash",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("Correctly returned 404 for non-existent sospeso")


class TestCheckoutWithSospeso:
    """Tests for checkout flow with sospeso payment method"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "mbhs637104"
        })
        assert response.status_code == 200
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture(scope="class")
    def test_service_id(self, auth_headers):
        """Get a test service ID"""
        response = requests.get(f"{BASE_URL}/api/services", headers=auth_headers)
        if response.status_code == 200:
            services = response.json()
            if services and len(services) > 0:
                return services[0]["id"]
        pytest.skip("No services available for testing")
    
    @pytest.fixture(scope="class")
    def test_client(self, auth_headers):
        """Get or create a test client"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        if response.status_code == 200:
            clients = response.json()
            if clients and len(clients) > 0:
                return clients[0]
        pytest.skip("No clients available for testing")
    
    @pytest.fixture(scope="class")
    def test_operator_id(self, auth_headers):
        """Get a test operator ID"""
        response = requests.get(f"{BASE_URL}/api/operators", headers=auth_headers)
        if response.status_code == 200:
            operators = response.json()
            if operators and len(operators) > 0:
                return operators[0]["id"]
        pytest.skip("No operators available for testing")
    
    def test_checkout_with_cash(self, auth_headers, test_service_id, test_client, test_operator_id):
        """Test checkout with cash payment method"""
        # Create an appointment
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        create_response = requests.post(f"{BASE_URL}/api/appointments", headers=auth_headers, json={
            "client_id": test_client["id"],
            "service_ids": [test_service_id],
            "operator_id": test_operator_id,
            "date": future_date,
            "time": "10:00",
            "notes": "TEST_checkout_cash"
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create appointment: {create_response.text}")
        
        appointment = create_response.json()
        appointment_id = appointment["id"]
        
        # Checkout with cash
        checkout_response = requests.post(
            f"{BASE_URL}/api/appointments/{appointment_id}/checkout",
            headers=auth_headers,
            json={
                "payment_method": "cash",
                "discount_type": "none",
                "discount_value": 0,
                "total_paid": appointment.get("total_price", 10),
                "loyalty_points_used": 0
            }
        )
        
        assert checkout_response.status_code == 200, f"Checkout failed: {checkout_response.text}"
        data = checkout_response.json()
        assert data["success"] == True
        assert "payment_id" in data
        print(f"Cash checkout successful, payment_id: {data['payment_id']}")
        
        # Cleanup - delete the appointment
        requests.delete(f"{BASE_URL}/api/appointments/{appointment_id}", headers=auth_headers)
    
    def test_checkout_with_pos(self, auth_headers, test_service_id, test_client, test_operator_id):
        """Test checkout with POS payment method"""
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        create_response = requests.post(f"{BASE_URL}/api/appointments", headers=auth_headers, json={
            "client_id": test_client["id"],
            "service_ids": [test_service_id],
            "operator_id": test_operator_id,
            "date": future_date,
            "time": "11:00",
            "notes": "TEST_checkout_pos"
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create appointment: {create_response.text}")
        
        appointment = create_response.json()
        appointment_id = appointment["id"]
        
        # Checkout with POS
        checkout_response = requests.post(
            f"{BASE_URL}/api/appointments/{appointment_id}/checkout",
            headers=auth_headers,
            json={
                "payment_method": "pos",
                "discount_type": "none",
                "discount_value": 0,
                "total_paid": appointment.get("total_price", 10),
                "loyalty_points_used": 0
            }
        )
        
        assert checkout_response.status_code == 200, f"Checkout failed: {checkout_response.text}"
        data = checkout_response.json()
        assert data["success"] == True
        print(f"POS checkout successful, payment_id: {data['payment_id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/appointments/{appointment_id}", headers=auth_headers)
    
    def test_checkout_with_sospeso_creates_record(self, auth_headers, test_service_id, test_client, test_operator_id):
        """Test checkout with sospeso payment method creates a sospeso record"""
        from datetime import datetime, timedelta
        future_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        # Get initial sospesi count
        initial_sospesi = requests.get(
            f"{BASE_URL}/api/sospesi/client/{test_client['id']}",
            headers=auth_headers
        ).json()
        initial_count = len(initial_sospesi.get("sospesi", []))
        
        # Create an appointment
        create_response = requests.post(f"{BASE_URL}/api/appointments", headers=auth_headers, json={
            "client_id": test_client["id"],
            "service_ids": [test_service_id],
            "operator_id": test_operator_id,
            "date": future_date,
            "time": "12:00",
            "notes": "TEST_checkout_sospeso"
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create appointment: {create_response.text}")
        
        appointment = create_response.json()
        appointment_id = appointment["id"]
        total_price = appointment.get("total_price", 10)
        
        # Checkout with sospeso
        checkout_response = requests.post(
            f"{BASE_URL}/api/appointments/{appointment_id}/checkout",
            headers=auth_headers,
            json={
                "payment_method": "sospeso",
                "discount_type": "none",
                "discount_value": 0,
                "total_paid": total_price,
                "loyalty_points_used": 0
            }
        )
        
        assert checkout_response.status_code == 200, f"Checkout failed: {checkout_response.text}"
        data = checkout_response.json()
        assert data["success"] == True
        print(f"Sospeso checkout successful, payment_id: {data['payment_id']}")
        
        # Verify sospeso record was created
        new_sospesi = requests.get(
            f"{BASE_URL}/api/sospesi/client/{test_client['id']}",
            headers=auth_headers
        ).json()
        new_count = len(new_sospesi.get("sospesi", []))
        
        assert new_count > initial_count, f"Sospeso record not created. Before: {initial_count}, After: {new_count}"
        print(f"Sospeso record created successfully. Count: {initial_count} -> {new_count}")
        
        # Get the new sospeso ID for settle test
        new_sospeso = None
        for s in new_sospesi["sospesi"]:
            if s.get("appointment_id") == appointment_id:
                new_sospeso = s
                break
        
        if new_sospeso:
            # Test settling the sospeso with cash
            settle_response = requests.post(
                f"{BASE_URL}/api/sospesi/{new_sospeso['id']}/settle/cash",
                headers=auth_headers
            )
            assert settle_response.status_code == 200, f"Settle failed: {settle_response.text}"
            settle_data = settle_response.json()
            assert settle_data["success"] == True
            print(f"Sospeso settled successfully with cash")
            
            # Verify it's no longer in unsettled list
            final_sospesi = requests.get(
                f"{BASE_URL}/api/sospesi/client/{test_client['id']}",
                headers=auth_headers
            ).json()
            final_count = len(final_sospesi.get("sospesi", []))
            assert final_count == initial_count, f"Sospeso not removed after settle. Expected: {initial_count}, Got: {final_count}"
            print("Sospeso correctly removed from unsettled list after settlement")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/appointments/{appointment_id}", headers=auth_headers)


class TestPublicBookingAPI:
    """Tests for public booking page API"""
    
    def test_public_website_loads(self):
        """Test public website config endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200, f"Public website failed: {response.text}"
        data = response.json()
        assert "config" in data or "services" in data or "promotions" in data
        print("Public website API working")
    
    def test_public_services(self):
        """Test public services endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200, f"Public services failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Public services: {len(data)} services available")
    
    def test_public_promotions(self):
        """Test public promotions endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/promotions")
        assert response.status_code == 200, f"Public promotions failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Public promotions: {len(data)} promotions available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
