"""
Iteration 29: Test Hero Image Upload and Admin Theme Customization Features
- Hero image upload in CMS (Gestione Sito → Generale tab)
- Admin theme customization in Settings page with 6 presets
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://salon-theme-preview.preview.emergentagent.com').rstrip('/')

class TestAuthAndSettings:
    """Authentication and Settings API tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "mbhs637104"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_01_login_success(self, auth_token):
        """Test login with admin credentials"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✓ Login successful, token length: {len(auth_token)}")
    
    def test_02_get_settings_returns_admin_theme(self, auth_token):
        """Test GET /api/settings returns admin_theme object"""
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"GET settings failed: {response.text}"
        data = response.json()
        
        # Verify admin_theme object exists
        assert "admin_theme" in data, "admin_theme not in settings response"
        admin_theme = data["admin_theme"]
        
        # Verify required fields
        required_fields = ["primary", "sidebar_bg", "sidebar_text", "accent", "font_display", "font_body"]
        for field in required_fields:
            assert field in admin_theme, f"Missing field '{field}' in admin_theme"
        
        print(f"✓ GET /api/settings returns admin_theme with fields: {list(admin_theme.keys())}")
        print(f"  Current theme: primary={admin_theme['primary']}, sidebar_bg={admin_theme['sidebar_bg']}")
    
    def test_03_put_admin_theme_saves_successfully(self, auth_token):
        """Test PUT /api/settings/admin-theme saves theme"""
        # Test with Blu Elegante preset
        test_theme = {
            "primary": "#2563EB",
            "sidebar_bg": "#F0F4FF",
            "sidebar_text": "#0F172A",
            "accent": "#F59E0B",
            "font_display": "Montserrat",
            "font_body": "Inter"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/settings/admin-theme",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"admin_theme": test_theme}
        )
        assert response.status_code == 200, f"PUT admin-theme failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True, "Response should have success=True"
        assert "admin_theme" in data, "Response should include admin_theme"
        
        # Verify saved values
        saved_theme = data["admin_theme"]
        assert saved_theme["primary"] == test_theme["primary"]
        assert saved_theme["sidebar_bg"] == test_theme["sidebar_bg"]
        
        print(f"✓ PUT /api/settings/admin-theme saved Blu Elegante theme successfully")
    
    def test_04_verify_theme_persisted(self, auth_token):
        """Verify theme was actually persisted by fetching settings again"""
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        admin_theme = data["admin_theme"]
        # Should still have Blu Elegante values from previous test
        assert admin_theme["primary"] == "#2563EB", f"Theme not persisted, got: {admin_theme['primary']}"
        
        print(f"✓ Theme persisted correctly: primary={admin_theme['primary']}")
    
    def test_05_reset_to_rosa_classico(self, auth_token):
        """Reset theme back to Rosa Classico (default)"""
        default_theme = {
            "primary": "#C8617A",
            "sidebar_bg": "#FAF7F2",
            "sidebar_text": "#2D1B14",
            "accent": "#D4A847",
            "font_display": "Cormorant Garamond",
            "font_body": "Poppins"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/settings/admin-theme",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"admin_theme": default_theme}
        )
        assert response.status_code == 200
        
        print(f"✓ Reset theme to Rosa Classico default")


class TestPublicWebsiteAPI:
    """Test public website API includes hero_image field"""
    
    def test_01_public_website_includes_hero_image(self):
        """Test GET /api/public/website includes hero_image in config"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200, f"GET public/website failed: {response.text}"
        data = response.json()
        
        assert "config" in data, "Response should have config object"
        config = data["config"]
        
        # hero_image should be in config (may be empty string if not set)
        assert "hero_image" in config, "hero_image field missing from config"
        
        # Also verify other hero-related fields
        hero_fields = ["hero_image", "hero_description"]
        for field in hero_fields:
            assert field in config, f"Missing hero field: {field}"
        
        print(f"✓ GET /api/public/website includes hero_image: '{config.get('hero_image', '')[:50]}...'")
        print(f"  hero_description: '{config.get('hero_description', '')[:50]}...'")


class TestWebsiteConfigAPI:
    """Test website config API for hero image and slogan fields"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "mbhs637104"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_01_get_website_config_has_hero_fields(self, auth_token):
        """Test GET /api/website/config includes hero fields"""
        response = requests.get(
            f"{BASE_URL}/api/website/config",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"GET website/config failed: {response.text}"
        config = response.json()
        
        # Verify hero-related fields exist
        hero_fields = ["hero_image", "hero_description", "slogan"]
        for field in hero_fields:
            assert field in config, f"Missing field: {field}"
        
        print(f"✓ GET /api/website/config has hero fields")
        print(f"  hero_image: '{config.get('hero_image', '')[:50]}...'")
        print(f"  hero_slogan: '{config.get('hero_slogan', '')}'")
    
    def test_02_update_hero_slogan(self, auth_token):
        """Test updating hero_slogan field"""
        # First get current config
        get_response = requests.get(
            f"{BASE_URL}/api/website/config",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        current_config = get_response.json()
        
        # Update with test slogan
        test_slogan = "TEST_Metti la testa a posto!!"
        update_data = {
            "hero_slogan": test_slogan,
            "hero_description": current_config.get("hero_description", "")
        }
        
        response = requests.put(
            f"{BASE_URL}/api/website/config",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=update_data
        )
        assert response.status_code == 200, f"PUT website/config failed: {response.text}"
        
        # Verify update
        updated_config = response.json()
        assert updated_config.get("hero_slogan") == test_slogan
        
        print(f"✓ Updated hero_slogan to: {test_slogan}")
        
        # Restore original
        restore_data = {"hero_slogan": current_config.get("hero_slogan", "Metti la testa a posto!!")}
        requests.put(
            f"{BASE_URL}/api/website/config",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=restore_data
        )
        print(f"✓ Restored original hero_slogan")


class TestUploadEndpoint:
    """Test file upload endpoint for hero image"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "mbhs637104"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_01_upload_endpoint_exists(self, auth_token):
        """Test that /api/website/upload endpoint exists and requires file"""
        # Test without file - should return 422 (validation error)
        response = requests.post(
            f"{BASE_URL}/api/website/upload",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # 422 means endpoint exists but requires file
        assert response.status_code in [400, 422], f"Unexpected status: {response.status_code}"
        
        print(f"✓ /api/website/upload endpoint exists (returns {response.status_code} without file)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
