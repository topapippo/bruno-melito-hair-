"""
Test Suite for Iteration 11 Features - MBHS Salon
Tests for: Date change in edit dialog, Past time slot blocking, Dashboard buttons, Auto-apply promos, Auto-select prepaid cards
"""
import pytest
import requests
import os
from datetime import date, datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Test login functionality"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login successful, user: {data['user']['email']}")
        return data['access_token']


class TestAppointmentsAPI:
    """Test appointment endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and setup auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_appointments_today(self):
        """Test getting today's appointments"""
        today = date.today().strftime('%Y-%m-%d')
        response = requests.get(f"{BASE_URL}/api/appointments?date={today}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} appointments for today")
    
    def test_get_appointments_tomorrow(self):
        """Test getting tomorrow's appointments"""
        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        response = requests.get(f"{BASE_URL}/api/appointments?date={tomorrow}", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} appointments for tomorrow")
    
    def test_update_appointment_date(self):
        """Test updating an appointment's date (Feature 1)"""
        # Get tomorrow's appointments
        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        response = requests.get(f"{BASE_URL}/api/appointments?date={tomorrow}", headers=self.headers)
        appointments = response.json()
        
        if len(appointments) > 0:
            apt = appointments[0]
            apt_id = apt['id']
            
            # Update the appointment to a different date
            new_date = (date.today() + timedelta(days=2)).strftime('%Y-%m-%d')
            update_response = requests.put(f"{BASE_URL}/api/appointments/{apt_id}", 
                json={"date": new_date},
                headers=self.headers
            )
            assert update_response.status_code == 200
            updated = update_response.json()
            assert updated['date'] == new_date
            print(f"Successfully updated appointment date to {new_date}")
            
            # Revert the date
            requests.put(f"{BASE_URL}/api/appointments/{apt_id}", 
                json={"date": tomorrow},
                headers=self.headers
            )
        else:
            pytest.skip("No appointments found to test date update")


class TestPromotionsAPI:
    """Test promotions endpoints for Feature 4"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and setup auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_promotions(self):
        """Test getting all promotions"""
        response = requests.get(f"{BASE_URL}/api/promotions", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} promotions")
    
    def test_check_promotions_for_client(self):
        """Test checking eligible promotions for a client"""
        # First get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = clients_response.json()
        
        if len(clients) > 0:
            client_id = clients[0]['id']
            response = requests.get(f"{BASE_URL}/api/promotions/check/{client_id}", headers=self.headers)
            assert response.status_code == 200
            promos = response.json()
            assert isinstance(promos, list)
            print(f"Found {len(promos)} eligible promotions for client")
        else:
            pytest.skip("No clients found")


class TestPrepaidCardsAPI:
    """Test prepaid cards endpoints for Feature 5"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and setup auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_client_cards(self):
        """Test getting prepaid cards for a client"""
        # First get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = clients_response.json()
        
        if len(clients) > 0:
            client_id = clients[0]['id']
            response = requests.get(f"{BASE_URL}/api/clients/{client_id}/cards", headers=self.headers)
            assert response.status_code == 200
            cards = response.json()
            assert isinstance(cards, list)
            print(f"Client has {len(cards)} prepaid cards")
        else:
            pytest.skip("No clients found")


class TestDashboardStatsAPI:
    """Test dashboard stats endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and setup auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_dashboard_stats(self):
        """Test getting dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/stats/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "today_appointments_count" in data
        assert "total_clients" in data
        print(f"Dashboard stats: {data['today_appointments_count']} appointments today, {data['total_clients']} total clients")


class TestServicesAPI:
    """Test services endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and setup auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_services(self):
        """Test getting all services"""
        response = requests.get(f"{BASE_URL}/api/services", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"Found {len(data)} services")


class TestOperatorsAPI:
    """Test operators endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and setup auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_operators(self):
        """Test getting all operators"""
        response = requests.get(f"{BASE_URL}/api/operators", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} operators")


class TestPublicEndpoints:
    """Test public endpoints (no auth required)"""
    
    def test_public_services(self):
        """Test public services endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Public services: {len(data)} available")
    
    def test_public_operators(self):
        """Test public operators endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Public operators: {len(data)} available")
    
    def test_public_promotions(self):
        """Test public promotions endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/promotions/all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Public promotions: {len(data)} available")


class TestCheckoutFlow:
    """Test checkout flow with promos and cards (Features 4 & 5)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and setup auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        self.token = response.json().get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_checkout_endpoint_exists(self):
        """Test that checkout endpoint exists"""
        # Get an appointment
        tomorrow = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
        response = requests.get(f"{BASE_URL}/api/appointments?date={tomorrow}", headers=self.headers)
        appointments = response.json()
        
        if len(appointments) > 0:
            apt = appointments[0]
            apt_id = apt['id']
            
            # Try checkout endpoint (might fail if already checked out, but should exist)
            response = requests.post(f"{BASE_URL}/api/appointments/{apt_id}/checkout",
                json={
                    "payment_method": "cash",
                    "discount_type": "none",
                    "discount_value": 0,
                    "total_paid": 10.0
                },
                headers=self.headers
            )
            # Should not be 404
            assert response.status_code != 404, "Checkout endpoint not found"
            print(f"Checkout endpoint response: {response.status_code}")
        else:
            pytest.skip("No appointments found to test checkout")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
