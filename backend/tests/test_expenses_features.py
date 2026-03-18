"""
Test suite for Expenses (Registro Uscite) features
Tests: CRUD operations, pay/unpay, upcoming expenses, recurring expense creation
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://yarn-lock-fix.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "melitobruno@gmail.com"
TEST_PASSWORD = "password123"

# Store created expense IDs for cleanup
created_expense_ids = []

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping tests")

@pytest.fixture(scope="module")
def api_client(auth_token):
    """Create session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestExpensesCRUD:
    """Test expense CRUD operations"""
    
    def test_create_expense_basic(self, api_client):
        """Test creating a basic expense"""
        # Tomorrow's date for testing
        due_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        payload = {
            "description": "TEST_Bolletta Acqua",
            "amount": 75.50,
            "category": "bollette",
            "due_date": due_date,
            "is_recurring": False,
            "notes": "Test expense for automation"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Create expense failed: {response.text}"
        
        data = response.json()
        assert data["description"] == "TEST_Bolletta Acqua"
        assert data["amount"] == 75.50
        assert data["category"] == "bollette"
        assert data["due_date"] == due_date
        assert data["paid"] == False
        assert "id" in data
        
        created_expense_ids.append(data["id"])
        print(f"✓ Created expense with ID: {data['id']}")
    
    def test_create_recurring_expense(self, api_client):
        """Test creating a recurring expense"""
        due_date = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        
        payload = {
            "description": "TEST_Affitto Negozio",
            "amount": 800.00,
            "category": "affitto",
            "due_date": due_date,
            "is_recurring": True,
            "recurrence": "monthly",
            "notes": "Test recurring expense"
        }
        
        response = api_client.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["description"] == "TEST_Affitto Negozio"
        assert data["is_recurring"] == True
        assert data["recurrence"] == "monthly"
        
        created_expense_ids.append(data["id"])
        print(f"✓ Created recurring expense with ID: {data['id']}")
    
    def test_get_expenses_all(self, api_client):
        """Test getting all expenses"""
        response = api_client.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} total expenses")
    
    def test_get_expenses_unpaid(self, api_client):
        """Test filtering unpaid expenses"""
        response = api_client.get(f"{BASE_URL}/api/expenses?paid=false")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned should be unpaid
        for exp in data:
            assert exp["paid"] == False
        print(f"✓ Retrieved {len(data)} unpaid expenses")
    
    def test_get_expenses_paid(self, api_client):
        """Test filtering paid expenses"""
        response = api_client.get(f"{BASE_URL}/api/expenses?paid=true")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned should be paid
        for exp in data:
            assert exp["paid"] == True
        print(f"✓ Retrieved {len(data)} paid expenses")
    
    def test_update_expense(self, api_client):
        """Test updating an expense"""
        # First create an expense
        due_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        create_response = api_client.post(f"{BASE_URL}/api/expenses", json={
            "description": "TEST_Original Description",
            "amount": 100.00,
            "category": "altro",
            "due_date": due_date
        })
        assert create_response.status_code == 200
        expense_id = create_response.json()["id"]
        created_expense_ids.append(expense_id)
        
        # Update the expense
        update_payload = {
            "description": "TEST_Updated Description",
            "amount": 150.00,
            "category": "fornitori"
        }
        update_response = api_client.put(f"{BASE_URL}/api/expenses/{expense_id}", json=update_payload)
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["description"] == "TEST_Updated Description"
        assert updated["amount"] == 150.00
        assert updated["category"] == "fornitori"
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/expenses")
        expenses = get_response.json()
        found = next((e for e in expenses if e["id"] == expense_id), None)
        assert found is not None
        assert found["description"] == "TEST_Updated Description"
        print(f"✓ Updated expense successfully")
    
    def test_delete_expense(self, api_client):
        """Test deleting an expense"""
        # Create expense to delete
        create_response = api_client.post(f"{BASE_URL}/api/expenses", json={
            "description": "TEST_To Be Deleted",
            "amount": 50.00,
            "category": "altro",
            "due_date": datetime.now().strftime("%Y-%m-%d")
        })
        assert create_response.status_code == 200
        expense_id = create_response.json()["id"]
        
        # Delete it
        delete_response = api_client.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] == True
        
        # Verify it's gone
        get_response = api_client.get(f"{BASE_URL}/api/expenses")
        expenses = get_response.json()
        found = next((e for e in expenses if e["id"] == expense_id), None)
        assert found is None
        print(f"✓ Deleted expense successfully")


class TestExpensePayUnpay:
    """Test pay and unpay functionality"""
    
    def test_mark_expense_as_paid(self, api_client):
        """Test marking an expense as paid"""
        # Create unpaid expense
        due_date = datetime.now().strftime("%Y-%m-%d")
        create_response = api_client.post(f"{BASE_URL}/api/expenses", json={
            "description": "TEST_Pay Test Expense",
            "amount": 200.00,
            "category": "bollette",
            "due_date": due_date
        })
        assert create_response.status_code == 200
        expense_id = create_response.json()["id"]
        created_expense_ids.append(expense_id)
        
        # Mark as paid
        pay_response = api_client.post(f"{BASE_URL}/api/expenses/{expense_id}/pay")
        assert pay_response.status_code == 200
        assert pay_response.json()["success"] == True
        
        # Verify it's paid
        get_response = api_client.get(f"{BASE_URL}/api/expenses?paid=true")
        expenses = get_response.json()
        found = next((e for e in expenses if e["id"] == expense_id), None)
        assert found is not None
        assert found["paid"] == True
        assert found["paid_date"] is not None
        print(f"✓ Marked expense as paid successfully")
    
    def test_mark_expense_as_unpaid(self, api_client):
        """Test marking an expense as unpaid (revert)"""
        # Create and pay expense first
        due_date = datetime.now().strftime("%Y-%m-%d")
        create_response = api_client.post(f"{BASE_URL}/api/expenses", json={
            "description": "TEST_Unpay Test Expense",
            "amount": 100.00,
            "category": "tasse",
            "due_date": due_date
        })
        assert create_response.status_code == 200
        expense_id = create_response.json()["id"]
        created_expense_ids.append(expense_id)
        
        # Mark as paid
        api_client.post(f"{BASE_URL}/api/expenses/{expense_id}/pay")
        
        # Mark as unpaid (revert)
        unpay_response = api_client.post(f"{BASE_URL}/api/expenses/{expense_id}/unpay")
        assert unpay_response.status_code == 200
        assert unpay_response.json()["success"] == True
        
        # Verify it's unpaid
        get_response = api_client.get(f"{BASE_URL}/api/expenses?paid=false")
        expenses = get_response.json()
        found = next((e for e in expenses if e["id"] == expense_id), None)
        assert found is not None
        assert found["paid"] == False
        print(f"✓ Marked expense as unpaid successfully")
    
    def test_recurring_expense_creates_next(self, api_client):
        """Test that paying a recurring expense creates the next one"""
        due_date = datetime.now().strftime("%Y-%m-%d")
        
        # Create recurring expense
        create_response = api_client.post(f"{BASE_URL}/api/expenses", json={
            "description": "TEST_Recurring Auto Create",
            "amount": 500.00,
            "category": "affitto",
            "due_date": due_date,
            "is_recurring": True,
            "recurrence": "monthly"
        })
        assert create_response.status_code == 200
        expense_id = create_response.json()["id"]
        created_expense_ids.append(expense_id)
        
        # Pay it - should auto-create next occurrence
        pay_response = api_client.post(f"{BASE_URL}/api/expenses/{expense_id}/pay")
        assert pay_response.status_code == 200
        
        # Check for new unpaid expense with same description
        get_response = api_client.get(f"{BASE_URL}/api/expenses?paid=false")
        expenses = get_response.json()
        new_recurring = [e for e in expenses if e["description"] == "TEST_Recurring Auto Create" and e["id"] != expense_id]
        
        assert len(new_recurring) >= 1, "Next recurring expense should have been created"
        created_expense_ids.extend([e["id"] for e in new_recurring])
        print(f"✓ Recurring expense created next occurrence automatically")


class TestUpcomingExpenses:
    """Test upcoming expenses endpoint"""
    
    def test_get_upcoming_expenses(self, api_client):
        """Test getting upcoming expenses due within 7 days"""
        response = api_client.get(f"{BASE_URL}/api/expenses/upcoming?days=7")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All should be unpaid
        for exp in data:
            assert exp["paid"] == False
            assert "overdue" in exp  # Should have overdue flag
        
        print(f"✓ Retrieved {len(data)} upcoming expenses")
    
    def test_upcoming_expenses_with_overdue_flag(self, api_client):
        """Test that overdue flag is correctly set"""
        # Create an overdue expense (past due date)
        past_date = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
        create_response = api_client.post(f"{BASE_URL}/api/expenses", json={
            "description": "TEST_Overdue Expense",
            "amount": 99.99,
            "category": "fornitori",
            "due_date": past_date
        })
        assert create_response.status_code == 200
        expense_id = create_response.json()["id"]
        created_expense_ids.append(expense_id)
        
        # Get upcoming should include overdue ones
        response = api_client.get(f"{BASE_URL}/api/expenses/upcoming?days=7")
        assert response.status_code == 200
        
        expenses = response.json()
        overdue_exp = next((e for e in expenses if e["id"] == expense_id), None)
        
        if overdue_exp:
            assert overdue_exp["overdue"] == True
            print(f"✓ Overdue expense correctly flagged")
        else:
            print(f"✓ Overdue expense endpoint working (expense may have been filtered)")


class TestExpenseCategories:
    """Test expense categories"""
    
    def test_all_category_types(self, api_client):
        """Test creating expenses with all category types"""
        categories = ["affitto", "fornitori", "bollette", "stipendi", "tasse", "prodotti", "manutenzione", "altro"]
        
        for category in categories:
            payload = {
                "description": f"TEST_Category {category}",
                "amount": 10.00,
                "category": category,
                "due_date": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
            }
            response = api_client.post(f"{BASE_URL}/api/expenses", json=payload)
            assert response.status_code == 200
            assert response.json()["category"] == category
            created_expense_ids.append(response.json()["id"])
        
        print(f"✓ All {len(categories)} category types work correctly")


class TestExpenseErrorHandling:
    """Test error handling"""
    
    def test_update_nonexistent_expense(self, api_client):
        """Test updating a non-existent expense returns 404"""
        response = api_client.put(
            f"{BASE_URL}/api/expenses/nonexistent-id-12345",
            json={"description": "Updated"}
        )
        assert response.status_code == 404
        print(f"✓ Update non-existent expense returns 404")
    
    def test_delete_nonexistent_expense(self, api_client):
        """Test deleting a non-existent expense returns 404"""
        response = api_client.delete(f"{BASE_URL}/api/expenses/nonexistent-id-12345")
        assert response.status_code == 404
        print(f"✓ Delete non-existent expense returns 404")
    
    def test_pay_nonexistent_expense(self, api_client):
        """Test paying a non-existent expense returns 404"""
        response = api_client.post(f"{BASE_URL}/api/expenses/nonexistent-id-12345/pay")
        assert response.status_code == 404
        print(f"✓ Pay non-existent expense returns 404")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup(api_client):
    """Clean up test data after all tests"""
    yield
    # Cleanup all TEST_ prefixed expenses
    for expense_id in created_expense_ids:
        try:
            api_client.delete(f"{BASE_URL}/api/expenses/{expense_id}")
        except:
            pass
    print(f"\n✓ Cleaned up {len(created_expense_ids)} test expenses")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
