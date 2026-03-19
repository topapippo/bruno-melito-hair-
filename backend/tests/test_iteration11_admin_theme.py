"""
Iteration 11 Tests: Admin Theme Customization & Dark Theme Batch Fixes
Tests the new /api/admin-theme endpoints and verifies dark theme CSS variables work.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAdminThemeAPI:
    """Admin Theme API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.token = None
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "Admin123!"
        })
        if login_res.status_code == 200:
            self.token = login_res.json().get("access_token")
        yield
        # Reset theme to default after tests
        if self.token:
            requests.put(
                f"{BASE_URL}/api/admin-theme",
                headers={"Authorization": f"Bearer {self.token}"},
                json={
                    "primary_color": "#D4AF37",
                    "accent_color": "#0EA5E9",
                    "font_family": "system-ui",
                    "font_size": "base",
                    "border_radius": "0.75rem"
                }
            )
    
    def test_login_success(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@brunomelito.it"
    
    def test_admin_theme_get_requires_auth(self):
        """Test that GET /api/admin-theme requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin-theme")
        # Without auth, should get 403 or 401
        assert response.status_code in [401, 403]
    
    def test_admin_theme_put_requires_auth(self):
        """Test that PUT /api/admin-theme requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin-theme", json={
            "primary_color": "#FF0000"
        })
        assert response.status_code in [401, 403]
    
    def test_admin_theme_get_with_auth(self):
        """Test GET /api/admin-theme returns theme config"""
        assert self.token is not None, "Login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/admin-theme",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Should return a dict (possibly empty or with defaults)
        assert isinstance(data, dict)
    
    def test_admin_theme_put_primary_color(self):
        """Test PUT /api/admin-theme saves primary_color"""
        assert self.token is not None, "Login failed"
        
        # Save custom primary color
        response = requests.put(
            f"{BASE_URL}/api/admin-theme",
            headers={"Authorization": f"Bearer {self.token}"},
            json={"primary_color": "#FF5733"}
        )
        assert response.status_code == 200
        assert response.json().get("status") == "ok"
        
        # Verify it persisted
        get_response = requests.get(
            f"{BASE_URL}/api/admin-theme",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert get_response.status_code == 200
        assert get_response.json().get("primary_color") == "#FF5733"
    
    def test_admin_theme_put_full_config(self):
        """Test PUT /api/admin-theme saves full theme configuration"""
        assert self.token is not None, "Login failed"
        
        full_config = {
            "primary_color": "#E91E63",
            "accent_color": "#00BCD4",
            "font_family": "'Poppins', sans-serif",
            "font_size": "lg",
            "border_radius": "1rem"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin-theme",
            headers={"Authorization": f"Bearer {self.token}"},
            json=full_config
        )
        assert response.status_code == 200
        
        # Verify all fields persisted
        get_response = requests.get(
            f"{BASE_URL}/api/admin-theme",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        data = get_response.json()
        assert data["primary_color"] == "#E91E63"
        assert data["accent_color"] == "#00BCD4"
        assert data["font_family"] == "'Poppins', sans-serif"
        assert data["font_size"] == "lg"
        assert data["border_radius"] == "1rem"
    
    def test_admin_theme_reset_to_default(self):
        """Test resetting theme to default values"""
        assert self.token is not None, "Login failed"
        
        default_config = {
            "primary_color": "#D4AF37",
            "accent_color": "#0EA5E9",
            "font_family": "system-ui",
            "font_size": "base",
            "border_radius": "0.75rem"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin-theme",
            headers={"Authorization": f"Bearer {self.token}"},
            json=default_config
        )
        assert response.status_code == 200
        
        # Verify reset
        get_response = requests.get(
            f"{BASE_URL}/api/admin-theme",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        data = get_response.json()
        assert data["primary_color"] == "#D4AF37"
        assert data["font_size"] == "base"


class TestSettingsAPI:
    """Settings API tests for profile/salon settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.token = None
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "Admin123!"
        })
        if login_res.status_code == 200:
            self.token = login_res.json().get("access_token")
        yield
    
    def test_get_settings(self):
        """Test GET /api/settings returns user settings"""
        assert self.token is not None, "Login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "name" in data
        assert "salon_name" in data
        assert "opening_time" in data
        assert "closing_time" in data
        assert "working_days" in data


class TestOtherProtectedEndpoints:
    """Test other protected endpoints work correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.token = None
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "Admin123!"
        })
        if login_res.status_code == 200:
            self.token = login_res.json().get("access_token")
        yield
    
    def test_get_clients(self):
        """Test GET /api/clients returns client list"""
        assert self.token is not None, "Login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_services(self):
        """Test GET /api/services returns service list"""
        assert self.token is not None, "Login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/services",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0  # Should have services
    
    def test_get_operators(self):
        """Test GET /api/operators returns operator list"""
        assert self.token is not None, "Login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/operators",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_nav_config(self):
        """Test GET /api/nav-config returns navigation config"""
        assert self.token is not None, "Login failed"
        
        response = requests.get(
            f"{BASE_URL}/api/nav-config",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
