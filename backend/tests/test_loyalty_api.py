"""
Test suite for Loyalty Program API endpoints
Tests: GET /api/loyalty, GET /api/loyalty/config, GET /api/loyalty/{client_id},
POST /api/loyalty/{client_id}/redeem, POST /api/loyalty/{client_id}/use-reward/{reward_id},
POST /api/loyalty/{client_id}/add-points
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
TEST_EMAIL = "melitobruno@gmail.com"
TEST_PASSWORD = "password123"


class TestLoyaltyAPI:
    """Test loyalty program API endpoints"""
    
    token = None
    client_id = None
    reward_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token before tests"""
        if TestLoyaltyAPI.token is None:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert response.status_code == 200, f"Login failed: {response.text}"
            data = response.json()
            TestLoyaltyAPI.token = data["access_token"]
            print(f"Login successful, token obtained")
    
    def get_headers(self):
        return {"Authorization": f"Bearer {TestLoyaltyAPI.token}"}
    
    # 1. Test GET /api/loyalty/config - Get rewards configuration
    def test_01_get_loyalty_config(self):
        """Test getting loyalty program configuration"""
        response = requests.get(f"{BASE_URL}/api/loyalty/config", headers=self.get_headers())
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate config structure
        assert "points_per_euro" in data, "Missing points_per_euro"
        assert "rewards" in data, "Missing rewards"
        assert data["points_per_euro"] == 10, f"Expected 10, got {data['points_per_euro']}"
        
        # Validate rewards structure
        assert "sconto_colorazione" in data["rewards"], "Missing sconto_colorazione reward"
        assert "taglio_gratuito" in data["rewards"], "Missing taglio_gratuito reward"
        
        assert data["rewards"]["sconto_colorazione"]["points_required"] == 5
        assert data["rewards"]["taglio_gratuito"]["points_required"] == 10
        
        print(f"Loyalty config: {data}")
    
    # 2. Test GET /api/loyalty - Get all loyalty records
    def test_02_get_all_loyalty(self):
        """Test getting all loyalty records"""
        response = requests.get(f"{BASE_URL}/api/loyalty", headers=self.get_headers())
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Expected list of loyalty records"
        print(f"Total loyalty records: {len(data)}")
    
    # 3. Create a test client for loyalty testing
    def test_03_create_test_client(self):
        """Create a test client for loyalty testing"""
        timestamp = int(time.time())
        client_data = {
            "name": f"TEST_Loyalty_Client_{timestamp}",
            "phone": "3331234567",
            "email": f"test_loyalty_{timestamp}@test.com",
            "notes": "Test client for loyalty program testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=self.get_headers())
        assert response.status_code == 200, f"Failed to create client: {response.text}"
        
        data = response.json()
        TestLoyaltyAPI.client_id = data["id"]
        print(f"Created test client with ID: {TestLoyaltyAPI.client_id}")
    
    # 4. Test GET /api/loyalty/{client_id} - Get client-specific loyalty
    def test_04_get_client_loyalty(self):
        """Test getting loyalty info for a specific client"""
        response = requests.get(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}", 
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Validate loyalty structure
        assert "points" in data, "Missing points"
        assert "total_points_earned" in data, "Missing total_points_earned"
        assert "history" in data, "Missing history"
        assert "client_name" in data, "Missing client_name"
        assert "rewards_config" in data, "Missing rewards_config"
        
        # New client should start with 0 points
        assert data["points"] == 0, f"Expected 0 points for new client, got {data['points']}"
        print(f"Client loyalty data: points={data['points']}, history_len={len(data['history'])}")
    
    # 5. Test POST /api/loyalty/{client_id}/add-points - Add manual points
    def test_05_add_manual_points(self):
        """Test adding manual points to a client"""
        response = requests.post(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}/add-points",
            params={"points": 5, "description": "Test manual points addition"},
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        print(f"Manual points addition: {data}")
        
        # Verify points were added
        verify_response = requests.get(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}", 
            headers=self.get_headers()
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["points"] == 5, f"Expected 5 points, got {verify_data['points']}"
    
    # 6. Add more points to enable reward redemption
    def test_06_add_more_points(self):
        """Add more points to enable reward redemption"""
        # Add 7 more points to reach 12 total (for taglio_gratuito which requires 10)
        response = requests.post(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}/add-points",
            params={"points": 7, "description": "Additional test points"},
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify total points
        verify_response = requests.get(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}", 
            headers=self.get_headers()
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["points"] == 12, f"Expected 12 points, got {verify_data['points']}"
        print(f"Total points after addition: {verify_data['points']}")
    
    # 7. Test POST /api/loyalty/{client_id}/redeem - Redeem reward
    def test_07_redeem_reward(self):
        """Test redeeming a loyalty reward"""
        response = requests.post(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}/redeem",
            json={"reward_type": "sconto_colorazione"},
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        assert "reward" in data, "Missing reward in response"
        assert data["remaining_points"] == 7, f"Expected 7 remaining points, got {data['remaining_points']}"
        
        TestLoyaltyAPI.reward_id = data["reward"]["id"]
        print(f"Redeemed reward: {data['reward']['reward_name']}, reward_id: {TestLoyaltyAPI.reward_id}")
    
    # 8. Verify reward is in active_rewards
    def test_08_verify_active_reward(self):
        """Verify the redeemed reward appears in active_rewards"""
        response = requests.get(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}", 
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Points should be reduced by 5 (sconto_colorazione requires 5 points)
        assert data["points"] == 7, f"Expected 7 points after redemption, got {data['points']}"
        
        # Check active_rewards
        active_rewards = [r for r in data.get("active_rewards", []) if not r.get("redeemed")]
        assert len(active_rewards) >= 1, "Expected at least 1 active reward"
        
        found_reward = any(r["id"] == TestLoyaltyAPI.reward_id for r in active_rewards)
        assert found_reward, f"Reward {TestLoyaltyAPI.reward_id} not found in active_rewards"
        print(f"Active unredeemed rewards: {len(active_rewards)}")
    
    # 9. Test POST /api/loyalty/{client_id}/use-reward/{reward_id} - Use reward
    def test_09_use_reward(self):
        """Test marking a reward as used"""
        response = requests.post(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}/use-reward/{TestLoyaltyAPI.reward_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        print(f"Reward used: {data}")
        
        # Verify reward is now marked as redeemed
        verify_response = requests.get(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}", 
            headers=self.get_headers()
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        # Find the reward and check it's marked as redeemed
        reward_found = False
        for r in verify_data.get("active_rewards", []):
            if r["id"] == TestLoyaltyAPI.reward_id:
                assert r["redeemed"] == True, "Expected reward to be marked as redeemed"
                reward_found = True
                break
        assert reward_found, "Reward not found in active_rewards"
    
    # 10. Test redeeming with insufficient points
    def test_10_redeem_insufficient_points(self):
        """Test redeeming a reward with insufficient points"""
        # Client has 7 points, taglio_gratuito requires 10
        response = requests.post(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}/redeem",
            json={"reward_type": "taglio_gratuito"},
            headers=self.get_headers()
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "Punti insufficienti" in data.get("detail", ""), f"Expected insufficient points error, got {data}"
        print(f"Correctly rejected: {data['detail']}")
    
    # 11. Test invalid reward type
    def test_11_invalid_reward_type(self):
        """Test redeeming an invalid reward type"""
        response = requests.post(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}/redeem",
            json={"reward_type": "invalid_reward"},
            headers=self.get_headers()
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"Correctly rejected invalid reward type")
    
    # 12. Test using already used reward
    def test_12_use_already_used_reward(self):
        """Test using a reward that's already been used"""
        response = requests.post(
            f"{BASE_URL}/api/loyalty/{TestLoyaltyAPI.client_id}/use-reward/{TestLoyaltyAPI.reward_id}",
            headers=self.get_headers()
        )
        
        # Should fail since reward is already used
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"Correctly rejected already used reward")
    
    # 13. Test loyalty for non-existent client
    def test_13_nonexistent_client_loyalty(self):
        """Test getting loyalty for non-existent client"""
        response = requests.get(
            f"{BASE_URL}/api/loyalty/nonexistent-client-id-12345", 
            headers=self.get_headers()
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"Correctly returned 404 for non-existent client")
    
    # 14. Test client history includes loyalty_points
    def test_14_client_history_includes_loyalty(self):
        """Test that client history endpoint includes loyalty_points"""
        response = requests.get(
            f"{BASE_URL}/api/clients/{TestLoyaltyAPI.client_id}/history",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check loyalty_points is in response
        assert "loyalty_points" in data, "Missing loyalty_points in client history"
        assert data["loyalty_points"] == 7, f"Expected 7 loyalty points, got {data['loyalty_points']}"
        print(f"Client history includes loyalty_points: {data['loyalty_points']}")
    
    # 15. Cleanup - Delete test client
    def test_15_cleanup_test_client(self):
        """Cleanup - Delete test client"""
        if TestLoyaltyAPI.client_id:
            response = requests.delete(
                f"{BASE_URL}/api/clients/{TestLoyaltyAPI.client_id}",
                headers=self.get_headers()
            )
            # Don't fail if cleanup fails
            if response.status_code == 200:
                print(f"Test client {TestLoyaltyAPI.client_id} deleted")
            else:
                print(f"Warning: Failed to delete test client: {response.text}")


class TestCheckoutLoyaltyPoints:
    """Test that checkout awards loyalty points correctly"""
    
    token = None
    client_id = None
    appointment_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token before tests"""
        if TestCheckoutLoyaltyPoints.token is None:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert response.status_code == 200, f"Login failed: {response.text}"
            data = response.json()
            TestCheckoutLoyaltyPoints.token = data["access_token"]
    
    def get_headers(self):
        return {"Authorization": f"Bearer {TestCheckoutLoyaltyPoints.token}"}
    
    def test_01_create_client_for_checkout(self):
        """Create a client for checkout testing"""
        timestamp = int(time.time())
        client_data = {
            "name": f"TEST_Checkout_Client_{timestamp}",
            "phone": "3339876543",
            "email": f"test_checkout_{timestamp}@test.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=self.get_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        
        TestCheckoutLoyaltyPoints.client_id = response.json()["id"]
        print(f"Created checkout test client: {TestCheckoutLoyaltyPoints.client_id}")
    
    def test_02_get_services(self):
        """Get available services"""
        response = requests.get(f"{BASE_URL}/api/services", headers=self.get_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        
        services = response.json()
        assert len(services) > 0, "No services found"
        TestCheckoutLoyaltyPoints.service_id = services[0]["id"]
        TestCheckoutLoyaltyPoints.service_price = services[0]["price"]
        print(f"Using service: {services[0]['name']} (€{services[0]['price']})")
    
    def test_03_create_appointment(self):
        """Create an appointment"""
        today = datetime.now().strftime("%Y-%m-%d")
        appointment_data = {
            "client_id": TestCheckoutLoyaltyPoints.client_id,
            "service_ids": [TestCheckoutLoyaltyPoints.service_id],
            "date": today,
            "time": "14:00",
            "notes": "Test checkout appointment"
        }
        
        response = requests.post(f"{BASE_URL}/api/appointments", json=appointment_data, headers=self.get_headers())
        assert response.status_code == 200, f"Failed: {response.text}"
        
        TestCheckoutLoyaltyPoints.appointment_id = response.json()["id"]
        print(f"Created appointment: {TestCheckoutLoyaltyPoints.appointment_id}")
    
    def test_04_verify_initial_loyalty_points(self):
        """Verify client starts with 0 loyalty points"""
        response = requests.get(
            f"{BASE_URL}/api/loyalty/{TestCheckoutLoyaltyPoints.client_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["points"] == 0, f"Expected 0 points, got {data['points']}"
        print(f"Initial loyalty points: {data['points']}")
    
    def test_05_checkout_appointment(self):
        """Checkout appointment and verify loyalty points are awarded"""
        service_price = TestCheckoutLoyaltyPoints.service_price
        checkout_data = {
            "payment_method": "cash",
            "discount_type": "none",
            "discount_value": 0,
            "total_paid": service_price
        }
        
        response = requests.post(
            f"{BASE_URL}/api/appointments/{TestCheckoutLoyaltyPoints.appointment_id}/checkout",
            json=checkout_data,
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Expected success=True"
        
        # Calculate expected points (1 point per €10)
        expected_points = int(service_price // 10)
        
        # Verify loyalty_points_earned is returned
        assert "loyalty_points_earned" in data, "Missing loyalty_points_earned in response"
        assert data["loyalty_points_earned"] == expected_points, f"Expected {expected_points} points, got {data['loyalty_points_earned']}"
        print(f"Checkout complete, loyalty points earned: {data['loyalty_points_earned']}")
    
    def test_06_verify_loyalty_points_updated(self):
        """Verify loyalty points were actually updated"""
        response = requests.get(
            f"{BASE_URL}/api/loyalty/{TestCheckoutLoyaltyPoints.client_id}",
            headers=self.get_headers()
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        expected_points = int(TestCheckoutLoyaltyPoints.service_price // 10)
        assert data["points"] == expected_points, f"Expected {expected_points} points, got {data['points']}"
        
        # Verify history contains the earned points entry only if points > 0
        if expected_points > 0:
            assert len(data["history"]) > 0, "Expected at least one history entry when points were earned"
        print(f"Updated loyalty points: {data['points']}, history entries: {len(data['history'])}")
    
    def test_07_cleanup(self):
        """Cleanup test data"""
        # Delete appointment
        if TestCheckoutLoyaltyPoints.appointment_id:
            requests.delete(
                f"{BASE_URL}/api/appointments/{TestCheckoutLoyaltyPoints.appointment_id}",
                headers=self.get_headers()
            )
        
        # Delete client
        if TestCheckoutLoyaltyPoints.client_id:
            requests.delete(
                f"{BASE_URL}/api/clients/{TestCheckoutLoyaltyPoints.client_id}",
                headers=self.get_headers()
            )
        
        print("Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
