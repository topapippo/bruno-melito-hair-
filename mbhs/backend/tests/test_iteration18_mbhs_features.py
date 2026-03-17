"""
Test Iteration 18 - Testing MBHS Features
Features:
1. PlanningPage: No 'Non assegnato' column - verified in frontend code
2. PlanningPage: MBHS operator is pre-selected by default
3. AppointmentsPage (Agenda): Shows expense deadlines (Scadenze Uscite)
4. AppointmentsPage (Agenda): Shows upcoming appointments (7 days)
5. AppointmentsPage (Agenda): Shows card alerts
6. AppointmentsPage (Agenda): MBHS operator pre-selected
7. BookingPage/WebsitePage: Promos visible and clickable
8. Backend: POST /api/appointments auto-assigns first operator if none provided
9. Backend: GET /api/expenses returns expense data with due_date
10. Login flow works
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://design-stile-fix.preview.emergentagent.com').rstrip('/')


class TestLogin:
    """Test login functionality"""
    
    def test_login_success(self):
        """Test valid login credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert isinstance(data["access_token"], str)
        print(f"Login successful, token starts with: {data['access_token'][:20]}...")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test invalid login credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400], f"Expected 401/400 for invalid credentials, got {response.status_code}"
        print(f"Invalid credentials correctly rejected with status {response.status_code}")


class TestOperators:
    """Test operators API and MBHS as default"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_operators(self, auth_token):
        """Test GET /api/operators returns both operators"""
        response = requests.get(
            f"{BASE_URL}/api/operators",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get operators failed: {response.text}"
        operators = response.json()
        assert len(operators) >= 2, f"Expected at least 2 operators, got {len(operators)}"
        
        # Check operator names
        names = [op["name"] for op in operators]
        print(f"Found operators: {names}")
        
        # Check for MBHS operator
        mbhs_ops = [op for op in operators if "MBHS" in op["name"].upper()]
        assert len(mbhs_ops) >= 1, "MBHS operator not found"
        print(f"MBHS operator found: {mbhs_ops[0]['name']}")
        
        return operators
    
    def test_public_operators(self):
        """Test public operators endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200, f"Public operators failed: {response.text}"
        operators = response.json()
        assert len(operators) >= 2, f"Expected at least 2 operators, got {len(operators)}"
        
        names = [op["name"] for op in operators]
        print(f"Public operators: {names}")
        
        # Verify MBHS exists
        mbhs_found = any("MBHS" in op["name"].upper() for op in operators)
        assert mbhs_found, "MBHS not found in public operators"


class TestAppointmentsAutoAssign:
    """Test that appointments auto-assign MBHS operator when none provided"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_client(self, auth_token):
        """Get or create a test client"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        clients = response.json()
        if clients:
            return clients[0]
        # Create a test client if none exists
        response = requests.post(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"name": "TEST_AutoAssignClient", "phone": "1234567890"}
        )
        assert response.status_code in [200, 201]
        return response.json()
    
    @pytest.fixture
    def test_service(self, auth_token):
        """Get a test service"""
        response = requests.get(
            f"{BASE_URL}/api/services",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        services = response.json()
        assert len(services) > 0, "No services found"
        return services[0]
    
    def test_create_appointment_without_operator_auto_assigns(self, auth_token, test_client, test_service):
        """Test POST /api/appointments auto-assigns first operator when operator_id not provided"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        # Create appointment without operator_id
        response = requests.post(
            f"{BASE_URL}/api/appointments",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "client_id": test_client["id"],
                "service_ids": [test_service["id"]],
                "date": future_date,
                "time": "10:00",
                "notes": "TEST_AutoAssign appointment"
            }
        )
        assert response.status_code == 200, f"Create appointment failed: {response.text}"
        appointment = response.json()
        
        # Verify operator was auto-assigned
        assert appointment.get("operator_id") is not None, "Operator was not auto-assigned"
        assert appointment.get("operator_name") is not None, "Operator name not set"
        
        print(f"Auto-assigned operator: {appointment.get('operator_name')}")
        
        # Cleanup - delete the test appointment
        requests.delete(
            f"{BASE_URL}/api/appointments/{appointment['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        return appointment


class TestExpenses:
    """Test expenses API - due_date field and upcoming expenses"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_expenses_returns_due_date(self, auth_token):
        """Test GET /api/expenses returns expense data with due_date"""
        response = requests.get(
            f"{BASE_URL}/api/expenses",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get expenses failed: {response.text}"
        expenses = response.json()
        print(f"Found {len(expenses)} expenses")
        
        # If expenses exist, verify due_date field
        if expenses:
            for exp in expenses:
                assert "due_date" in exp, f"Expense missing due_date: {exp}"
                assert "amount" in exp, f"Expense missing amount: {exp}"
                assert "description" in exp, f"Expense missing description: {exp}"
            print(f"Sample expense: {expenses[0]}")
        
        return expenses
    
    def test_create_expense_with_due_date(self, auth_token):
        """Test creating an expense with due_date"""
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        response = requests.post(
            f"{BASE_URL}/api/expenses",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "description": "TEST_ExpenseDeadline",
                "amount": 100.00,
                "category": "altro",
                "due_date": future_date
            }
        )
        assert response.status_code == 200, f"Create expense failed: {response.text}"
        expense = response.json()
        
        assert expense["due_date"] == future_date, "due_date not saved correctly"
        assert expense["amount"] == 100.00
        assert expense["paid"] == False
        
        print(f"Created expense with due_date: {expense['due_date']}")
        
        # Cleanup
        exp_id = expense["id"]
        requests.delete(
            f"{BASE_URL}/api/expenses/{exp_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        return expense
    
    def test_get_upcoming_expenses(self, auth_token):
        """Test GET /api/expenses/upcoming returns unpaid expenses with due_date"""
        response = requests.get(
            f"{BASE_URL}/api/expenses/upcoming?days=7",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get upcoming expenses failed: {response.text}"
        upcoming = response.json()
        print(f"Found {len(upcoming)} upcoming expenses (7 days)")
        
        # Verify structure if any exist
        for exp in upcoming:
            assert "due_date" in exp, f"Upcoming expense missing due_date"
            assert "overdue" in exp, f"Upcoming expense missing overdue flag"
        
        return upcoming
    
    def test_get_unpaid_expenses(self, auth_token):
        """Test GET /api/expenses?paid=false returns unpaid expenses"""
        response = requests.get(
            f"{BASE_URL}/api/expenses?paid=false",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get unpaid expenses failed: {response.text}"
        unpaid = response.json()
        print(f"Found {len(unpaid)} unpaid expenses")
        
        # All returned should have paid=False
        for exp in unpaid:
            assert exp["paid"] == False, f"Expected paid=False, got {exp['paid']}"
        
        return unpaid


class TestPromotions:
    """Test promotions API - visible on booking pages"""
    
    def test_get_public_promotions(self):
        """Test GET /api/public/promotions/all returns active promotions"""
        response = requests.get(f"{BASE_URL}/api/public/promotions/all")
        assert response.status_code == 200, f"Get public promos failed: {response.text}"
        promos = response.json()
        
        print(f"Found {len(promos)} public promotions")
        assert len(promos) > 0, "Expected at least some promotions"
        
        # Verify structure
        for promo in promos:
            assert "id" in promo, "Promo missing id"
            assert "name" in promo, "Promo missing name"
            assert "free_service_name" in promo, "Promo missing free_service_name"
            # Should not contain user_id (private data)
            assert "user_id" not in promo, "Promo should not expose user_id"
        
        # Print promo names
        promo_names = [p["name"] for p in promos]
        print(f"Public promos: {promo_names}")
        
        return promos
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_promotions_authenticated(self, auth_token):
        """Test GET /api/promotions returns promotions for authenticated user"""
        response = requests.get(
            f"{BASE_URL}/api/promotions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get promos failed: {response.text}"
        promos = response.json()
        
        print(f"Found {len(promos)} promotions for user")
        assert len(promos) >= 8, f"Expected at least 8 default promotions, got {len(promos)}"
        
        return promos
    
    def test_check_client_promotions(self, auth_token):
        """Test GET /api/promotions/check/{client_id} returns eligible promos"""
        # Get a client first
        clients_resp = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        if not clients:
            pytest.skip("No clients to test with")
        
        client_id = clients[0]["id"]
        response = requests.get(
            f"{BASE_URL}/api/promotions/check/{client_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Check client promos failed: {response.text}"
        eligible = response.json()
        
        print(f"Client {clients[0]['name']} eligible for {len(eligible)} promotions")
        return eligible


class TestCardAlerts:
    """Test card alerts API"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_card_alerts(self, auth_token):
        """Test GET /api/cards/alerts/all returns card alerts structure"""
        response = requests.get(
            f"{BASE_URL}/api/cards/alerts/all?days=30&threshold_percent=20",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get card alerts failed: {response.text}"
        alerts = response.json()
        
        # Verify structure
        assert "expiring_cards" in alerts, "Missing expiring_cards field"
        assert "low_balance_cards" in alerts, "Missing low_balance_cards field"
        assert "total_alerts" in alerts, "Missing total_alerts field"
        
        print(f"Card alerts: {alerts['total_alerts']} total ({len(alerts['expiring_cards'])} expiring, {len(alerts['low_balance_cards'])} low balance)")
        
        return alerts


class TestPublicServices:
    """Test public services endpoint"""
    
    def test_get_public_services(self):
        """Test GET /api/public/services returns services"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200, f"Get public services failed: {response.text}"
        services = response.json()
        
        print(f"Found {len(services)} public services")
        assert len(services) > 0, "Expected at least some services"
        
        # Verify structure
        for svc in services:
            assert "id" in svc, "Service missing id"
            assert "name" in svc, "Service missing name"
            assert "price" in svc, "Service missing price"
            assert "duration" in svc, "Service missing duration"
        
        return services


class TestAppointments:
    """Test appointments API"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "melitobruno@gmail.com",
            "password": "password123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_get_appointments_for_date(self, auth_token):
        """Test GET /api/appointments?date=xxx returns appointments"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(
            f"{BASE_URL}/api/appointments?date={today}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Get appointments failed: {response.text}"
        appointments = response.json()
        
        print(f"Found {len(appointments)} appointments for today ({today})")
        
        return appointments
    
    def test_get_upcoming_appointments(self, auth_token):
        """Test getting appointments for next 7 days"""
        appointments_by_day = {}
        today = datetime.now()
        
        for i in range(1, 8):
            date = (today + timedelta(days=i)).strftime("%Y-%m-%d")
            response = requests.get(
                f"{BASE_URL}/api/appointments?date={date}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200
            apts = response.json()
            if apts:
                appointments_by_day[date] = len(apts)
        
        print(f"Appointments next 7 days: {appointments_by_day}")
        return appointments_by_day


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
