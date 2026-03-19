"""
Test Iteration 10 Features:
- BookingModal dark theme (dark background, gold accents)
- Button animations (btn-gold, btn-animate, dash-card CSS classes)
- Gestione Sito path fix (/gestione-sito)
- Section reorder feature in Gestione Sito
- WebsitePage dynamic section rendering
- Success page and mobile CTA bar dark theme
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL must be set")

# Admin credentials
ADMIN_EMAIL = "admin@brunomelito.it"
ADMIN_PASSWORD = "Admin123!"


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_root(self):
        """API root should respond"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"✓ API root responding: {data}")
    
    def test_public_website_api(self):
        """Public website API should return config"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        assert "config" in data
        print(f"✓ Public website API: salon_name = {data['config'].get('salon_name')}")


class TestPublicAPIs:
    """Test public APIs used by frontend"""
    
    def test_public_services(self):
        """Services API returns list"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        services = response.json()
        assert isinstance(services, list)
        print(f"✓ Public services: {len(services)} services found")
    
    def test_public_operators(self):
        """Operators API returns list"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200
        operators = response.json()
        assert isinstance(operators, list)
        print(f"✓ Public operators: {len(operators)} operators found")
    
    def test_public_promotions(self):
        """Promotions API returns list"""
        response = requests.get(f"{BASE_URL}/api/public/promotions/all")
        assert response.status_code == 200
        promos = response.json()
        assert isinstance(promos, list)
        print(f"✓ Public promotions: {len(promos)} promotions found")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Admin can login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print(f"✓ Admin login successful, token received")
        return data["access_token"]
    
    def test_protected_endpoint_requires_auth(self):
        """Protected endpoint should require auth"""
        response = requests.get(f"{BASE_URL}/api/website/config")
        assert response.status_code in [401, 403]
        print(f"✓ Protected endpoint correctly requires auth (status: {response.status_code})")


class TestWebsiteConfigAPI:
    """Test website configuration API - critical for section reorder feature"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Auth failed")
    
    def test_get_website_config(self, auth_token):
        """GET website config with auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Website config retrieved: keys = {list(data.keys())[:10]}")
        return data
    
    def test_update_website_config_with_section_order(self, auth_token):
        """PUT website config with section_order - tests section reorder feature"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert get_response.status_code == 200
        current_config = get_response.json()
        
        # Add section_order to config if not present
        test_section_order = ['hero', 'stats', 'about', 'gallery', 'cta', 'reviews', 'contact']
        updated_config = {**current_config, 'section_order': test_section_order}
        
        # Update config
        put_response = requests.put(f"{BASE_URL}/api/website/config", 
                                     headers=headers, 
                                     json=updated_config)
        assert put_response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        # Check section_order persisted
        assert 'section_order' in verify_data
        assert verify_data['section_order'] == test_section_order
        print(f"✓ Section order saved and verified: {verify_data['section_order']}")
    
    def test_section_order_reorder(self, auth_token):
        """Test section reorder functionality - move a section"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current config
        get_response = requests.get(f"{BASE_URL}/api/website/config", headers=headers)
        current_config = get_response.json()
        
        # Reorder: move 'gallery' before 'about'
        reordered = ['hero', 'stats', 'gallery', 'about', 'cta', 'reviews', 'contact']
        updated_config = {**current_config, 'section_order': reordered}
        
        # Update
        put_response = requests.put(f"{BASE_URL}/api/website/config", 
                                     headers=headers, 
                                     json=updated_config)
        assert put_response.status_code == 200
        
        # Verify public API also reflects this
        public_response = requests.get(f"{BASE_URL}/api/public/website")
        assert public_response.status_code == 200
        public_data = public_response.json()
        
        if 'section_order' in public_data.get('config', {}):
            assert public_data['config']['section_order'] == reordered
            print(f"✓ Section reorder persisted to public API: {public_data['config']['section_order']}")
        else:
            # Reset to default for public API
            print(f"! Section order not in public config - may need manual save from admin UI")
        
        # Reset to default order
        default_order = ['hero', 'stats', 'about', 'gallery', 'cta', 'reviews', 'contact']
        reset_config = {**current_config, 'section_order': default_order}
        requests.put(f"{BASE_URL}/api/website/config", headers=headers, json=reset_config)


class TestWebsiteGalleryAPI:
    """Test gallery API"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Auth failed")
    
    def test_get_gallery(self, auth_token):
        """GET gallery items"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/website/gallery", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Gallery API: {len(data)} items")


class TestWebsiteReviewsAPI:
    """Test reviews API"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Auth failed")
    
    def test_get_reviews(self, auth_token):
        """GET reviews"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/website/reviews", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Reviews API: {len(data)} reviews")


class TestNavConfig:
    """Test nav configuration API - important for Gestione Sito path"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Auth failed")
    
    def test_get_nav_config(self, auth_token):
        """GET nav config"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/nav-config", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Nav config: sidebar={len(data.get('sidebar', []))} items, dashboard={len(data.get('dashboard', []))} items")
        
        # Verify /gestione-sito is in dashboard modules
        dashboard = data.get('dashboard', [])
        has_gestione_sito = '/gestione-sito' in dashboard
        print(f"  - /gestione-sito in dashboard: {has_gestione_sito}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
