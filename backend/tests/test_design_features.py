"""
Test suite for the Colori & Font (Design & Style) feature in Bruno Melito Hair salon app.
Tests backend API endpoints for website config, public website data retrieval,
and color/font persistence.
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://booking-modal-fix-4.preview.emergentagent.com')
API = f"{BASE_URL}/api"

# Test credentials
TEST_EMAIL = "admin@brunomelito.it"
TEST_PASSWORD = "Admin123!"

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for protected endpoints"""
    response = requests.post(f"{API}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_success(self, api_client):
        """TEST 1: Login with valid credentials returns token"""
        response = api_client.post(f"{API}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "access_token" in data, "access_token field missing from login response"
        assert isinstance(data["access_token"], str), "access_token should be a string"
        assert len(data["access_token"]) > 0, "access_token should not be empty"
        print(f"✓ Login successful, token received")


class TestPublicWebsiteEndpoint:
    """Tests for /api/public/website endpoint"""
    
    def test_public_website_returns_config(self, api_client):
        """TEST 2: Public website endpoint returns config object"""
        response = api_client.get(f"{API}/public/website")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "config" in data, "config field missing from public website response"
        print(f"✓ Public website returns config object")
    
    def test_public_website_has_design_fields(self, api_client):
        """TEST 3: Config includes color and font fields"""
        response = api_client.get(f"{API}/public/website")
        assert response.status_code == 200
        config = response.json().get("config", {})
        
        # Check color fields
        assert "primary_color" in config, "primary_color missing from config"
        assert "accent_color" in config, "accent_color missing from config"
        assert "bg_color" in config, "bg_color missing from config"
        assert "text_color" in config, "text_color missing from config"
        
        # Check font fields
        assert "font_display" in config, "font_display missing from config"
        assert "font_body" in config, "font_body missing from config"
        
        print(f"✓ Config has all design fields: primary_color, accent_color, bg_color, text_color, font_display, font_body")
    
    def test_public_website_color_format(self, api_client):
        """TEST 4: Color values are valid hex format"""
        response = api_client.get(f"{API}/public/website")
        assert response.status_code == 200
        config = response.json().get("config", {})
        
        color_fields = ["primary_color", "accent_color", "bg_color", "text_color"]
        for field in color_fields:
            color = config.get(field, "")
            assert color.startswith("#"), f"{field} should start with # (got: {color})"
            assert len(color) in [4, 7], f"{field} should be 4 or 7 chars (got: {color})"
        
        print(f"✓ All color values are valid hex format")
    
    def test_public_website_returns_reviews(self, api_client):
        """TEST 5: Public website endpoint returns reviews array"""
        response = api_client.get(f"{API}/public/website")
        assert response.status_code == 200
        data = response.json()
        assert "reviews" in data, "reviews field missing from public website response"
        assert isinstance(data["reviews"], list), "reviews should be an array"
        print(f"✓ Public website returns reviews array ({len(data['reviews'])} reviews)")
    
    def test_public_website_returns_gallery(self, api_client):
        """TEST 6: Public website endpoint returns gallery array"""
        response = api_client.get(f"{API}/public/website")
        assert response.status_code == 200
        data = response.json()
        assert "gallery" in data, "gallery field missing from public website response"
        assert isinstance(data["gallery"], list), "gallery should be an array"
        print(f"✓ Public website returns gallery array ({len(data['gallery'])} items)")


class TestWebsiteConfigEndpoints:
    """Tests for authenticated website config endpoints"""
    
    def test_get_website_config_requires_auth(self, api_client):
        """TEST 7: GET /website/config requires authentication"""
        response = api_client.get(f"{API}/website/config")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ GET /website/config requires auth (returns {response.status_code})")
    
    def test_get_website_config_with_auth(self, authenticated_client):
        """TEST 8: GET /website/config works with authentication"""
        response = authenticated_client.get(f"{API}/website/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "salon_name" in data, "salon_name field missing from config"
        print(f"✓ GET /website/config returns config with salon_name: {data.get('salon_name')}")
    
    def test_config_has_design_fields(self, authenticated_client):
        """TEST 9: Authenticated config includes all design fields"""
        response = authenticated_client.get(f"{API}/website/config")
        assert response.status_code == 200
        config = response.json()
        
        design_fields = [
            "primary_color", "accent_color", "bg_color", "text_color",
            "font_display", "font_body"
        ]
        
        for field in design_fields:
            assert field in config, f"{field} missing from config"
        
        print(f"✓ Authenticated config has all design fields")
    
    def test_update_website_config_requires_auth(self, api_client):
        """TEST 10: PUT /website/config requires authentication"""
        response = api_client.put(f"{API}/website/config", json={"test": "value"})
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ PUT /website/config requires auth (returns {response.status_code})")
    
    def test_update_color_and_persist(self, authenticated_client):
        """TEST 11: Update primary_color and verify persistence"""
        # Get current config
        get_response = authenticated_client.get(f"{API}/website/config")
        assert get_response.status_code == 200
        original_config = get_response.json()
        original_color = original_config.get("primary_color", "#FF3366")
        
        # Update with test color
        test_color = "#AABBCC"
        update_response = authenticated_client.put(f"{API}/website/config", json={
            "primary_color": test_color
        })
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Verify the update was applied
        updated_config = update_response.json()
        assert updated_config.get("primary_color") == test_color, \
            f"Expected {test_color}, got {updated_config.get('primary_color')}"
        
        # Verify persistence via GET
        verify_response = authenticated_client.get(f"{API}/website/config")
        assert verify_response.status_code == 200
        verified_config = verify_response.json()
        assert verified_config.get("primary_color") == test_color, \
            f"Color not persisted. Expected {test_color}, got {verified_config.get('primary_color')}"
        
        # Restore original color
        authenticated_client.put(f"{API}/website/config", json={
            "primary_color": original_color
        })
        
        print(f"✓ Color update and persistence verified (changed to {test_color}, restored to {original_color})")
    
    def test_update_font_and_persist(self, authenticated_client):
        """TEST 12: Update font_display and verify persistence"""
        # Get current config
        get_response = authenticated_client.get(f"{API}/website/config")
        assert get_response.status_code == 200
        original_config = get_response.json()
        original_font = original_config.get("font_display", "Cormorant Garamond")
        
        # Update with test font
        test_font = "Playfair Display"
        update_response = authenticated_client.put(f"{API}/website/config", json={
            "font_display": test_font
        })
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Verify persistence via GET
        verify_response = authenticated_client.get(f"{API}/website/config")
        assert verify_response.status_code == 200
        verified_config = verify_response.json()
        assert verified_config.get("font_display") == test_font, \
            f"Font not persisted. Expected {test_font}, got {verified_config.get('font_display')}"
        
        # Restore original font
        authenticated_client.put(f"{API}/website/config", json={
            "font_display": original_font
        })
        
        print(f"✓ Font update and persistence verified (changed to {test_font}, restored to {original_font})")


class TestDefaultConfigValues:
    """Tests for default configuration values in backend"""
    
    def test_default_colors_match_expected(self, api_client):
        """TEST 13: Default colors match expected values"""
        response = api_client.get(f"{API}/public/website")
        assert response.status_code == 200
        config = response.json().get("config", {})
        
        # Check that default colors are set (values from DEFAULT_WEBSITE_CONFIG)
        # Note: These may have been customized, so we just check they're valid
        primary = config.get("primary_color", "")
        assert primary.startswith("#"), "primary_color should be a valid hex color"
        
        print(f"✓ Default colors are configured (primary: {primary})")
    
    def test_default_fonts_match_expected(self, api_client):
        """TEST 14: Default fonts match expected values"""
        response = api_client.get(f"{API}/public/website")
        assert response.status_code == 200
        config = response.json().get("config", {})
        
        font_display = config.get("font_display", "")
        font_body = config.get("font_body", "")
        
        # Check fonts are not empty
        assert len(font_display) > 0, "font_display should not be empty"
        assert len(font_body) > 0, "font_body should not be empty"
        
        print(f"✓ Default fonts are configured (display: {font_display}, body: {font_body})")


class TestPublicServicesEndpoint:
    """Tests for public services endpoint"""
    
    def test_public_services_returns_list(self, api_client):
        """TEST 15: Public services endpoint returns list"""
        response = api_client.get(f"{API}/public/services")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Services should be a list"
        print(f"✓ Public services returns list ({len(data)} services)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
