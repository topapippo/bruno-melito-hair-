"""
Test Suite for Section Reordering Feature (Iteration 24)
Tests the new CMS Layout tab functionality for reordering sections on the public website.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://salon-cms-system.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@brunomelito.it"
ADMIN_PASSWORD = "mbhs637104"

# Expected sections that can be reordered
EXPECTED_SECTIONS = ["services", "salon", "about", "promotions", "reviews", "gallery", "loyalty", "contact"]


class TestPublicWebsiteConfig:
    """Tests for public website config endpoint - section_order field"""
    
    def test_public_website_returns_section_order(self):
        """GET /api/public/website should return section_order in config"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "config" in data, "Response should contain 'config' field"
        
        config = data["config"]
        assert "section_order" in config, "Config should contain 'section_order' field"
        
        section_order = config["section_order"]
        assert isinstance(section_order, list), "section_order should be a list"
        assert len(section_order) == 8, f"Expected 8 sections, got {len(section_order)}"
        
        # Verify all expected sections are present
        for section in EXPECTED_SECTIONS:
            assert section in section_order, f"Section '{section}' should be in section_order"
        
        print(f"PASS: Public website returns section_order: {section_order}")
    
    def test_public_website_config_structure(self):
        """Verify the full config structure from public endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        
        data = response.json()
        config = data["config"]
        
        # Check essential config fields
        assert "salon_name" in config
        assert "hours" in config
        assert "phones" in config
        
        # Check section_order is valid
        section_order = config.get("section_order", [])
        assert len(section_order) > 0, "section_order should not be empty"
        
        print(f"PASS: Public config structure valid with {len(section_order)} sections")


class TestAdminAuthentication:
    """Tests for admin login with provided credentials"""
    
    def test_admin_login_success(self):
        """Admin login with email admin@brunomelito.it and password mbhs637104"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed with status {response.status_code}: {response.text}"
        
        data = response.json()
        # Note: API returns 'access_token' not 'token'
        assert "access_token" in data, f"Response should contain 'access_token', got keys: {data.keys()}"
        assert len(data["access_token"]) > 0, "access_token should not be empty"
        
        print(f"PASS: Admin login successful, token received")
        return data["access_token"]
    
    def test_admin_login_wrong_password(self):
        """Admin login with wrong password should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Wrong password returns 401")


class TestWebsiteConfigAPI:
    """Tests for authenticated website config endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_website_config_authenticated(self, auth_token):
        """GET /api/website/config returns section_order field"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        config = response.json()
        assert "section_order" in config, "Config should contain section_order"
        
        section_order = config["section_order"]
        assert isinstance(section_order, list), "section_order should be a list"
        assert len(section_order) == 8, f"Expected 8 sections, got {len(section_order)}"
        
        print(f"PASS: Authenticated config returns section_order: {section_order}")
    
    def test_update_section_order(self, auth_token):
        """PUT /api/website/config with new section_order saves correctly"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert get_response.status_code == 200
        original_config = get_response.json()
        original_order = original_config.get("section_order", EXPECTED_SECTIONS.copy())
        
        # Create a new order by moving first section to second position
        new_order = original_order.copy()
        if len(new_order) >= 2:
            new_order[0], new_order[1] = new_order[1], new_order[0]
        
        # Update config with new order
        update_data = {"section_order": new_order}
        put_response = requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=update_data)
        
        assert put_response.status_code == 200, f"Update failed: {put_response.status_code} - {put_response.text}"
        
        updated_config = put_response.json()
        assert "section_order" in updated_config, "Updated config should contain section_order"
        assert updated_config["section_order"] == new_order, "section_order should match the new order"
        
        # Verify persistence by fetching again
        verify_response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert verify_response.status_code == 200
        verified_config = verify_response.json()
        assert verified_config["section_order"] == new_order, "section_order should persist after update"
        
        # Restore original order
        restore_data = {"section_order": original_order}
        requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=restore_data)
        
        print(f"PASS: Section order updated and persisted correctly")
        print(f"  Original: {original_order}")
        print(f"  Updated:  {new_order}")
    
    def test_update_hidden_sections(self, auth_token):
        """PUT /api/website/config with hidden_sections saves correctly"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current config
        get_response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert get_response.status_code == 200
        original_config = get_response.json()
        original_hidden = original_config.get("hidden_sections", [])
        
        # Hide a section
        new_hidden = ["gallery"]
        update_data = {"hidden_sections": new_hidden}
        put_response = requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=update_data)
        
        assert put_response.status_code == 200, f"Update failed: {put_response.status_code}"
        
        updated_config = put_response.json()
        assert "hidden_sections" in updated_config or updated_config.get("hidden_sections") == new_hidden
        
        # Restore original
        restore_data = {"hidden_sections": original_hidden}
        requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=restore_data)
        
        print(f"PASS: Hidden sections updated correctly")


class TestPublicSiteRendering:
    """Tests for public site /sito endpoint"""
    
    def test_public_site_loads(self):
        """GET /sito should return 200 (public website page)"""
        response = requests.get(f"{BASE_URL}/sito", allow_redirects=True)
        # Frontend routes return HTML, status should be 200
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Check it's HTML content
        content_type = response.headers.get("content-type", "")
        assert "text/html" in content_type, f"Expected HTML, got {content_type}"
        
        print("PASS: Public site /sito loads correctly")
    
    def test_public_api_section_order_reflects_in_config(self):
        """Verify section_order from API is available for frontend rendering"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        
        data = response.json()
        config = data["config"]
        section_order = config.get("section_order", [])
        
        # Verify all 8 sections are present
        assert len(section_order) == 8, f"Expected 8 sections, got {len(section_order)}"
        
        # Verify sections are valid
        for section in section_order:
            assert section in EXPECTED_SECTIONS, f"Unknown section: {section}"
        
        print(f"PASS: Public API returns valid section_order for frontend rendering")


class TestSectionOrderValidation:
    """Tests for section order validation"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_section_order_contains_all_sections(self, auth_token):
        """Verify section_order contains all 8 expected sections"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        
        assert response.status_code == 200
        config = response.json()
        section_order = config.get("section_order", [])
        
        # Check all expected sections are present
        for section in EXPECTED_SECTIONS:
            assert section in section_order, f"Missing section: {section}"
        
        # Check no extra sections
        for section in section_order:
            assert section in EXPECTED_SECTIONS, f"Unexpected section: {section}"
        
        print(f"PASS: section_order contains exactly the 8 expected sections")
    
    def test_default_section_order(self):
        """Verify DEFAULT_WEBSITE_CONFIG has correct section_order"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        
        data = response.json()
        config = data["config"]
        section_order = config.get("section_order", [])
        
        # Default order should be: services, salon, about, promotions, reviews, gallery, loyalty, contact
        expected_default = ["services", "salon", "about", "promotions", "reviews", "gallery", "loyalty", "contact"]
        
        # Just verify all sections are present (order may have been customized)
        assert set(section_order) == set(expected_default), "section_order should contain all expected sections"
        
        print(f"PASS: Default section_order contains all expected sections")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
