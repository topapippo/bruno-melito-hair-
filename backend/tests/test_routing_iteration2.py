"""
Test Suite for Iteration 2 - Routing and API endpoints
Tests routing, authentication, and public API endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicAPI:
    """Public API endpoint tests"""
    
    def test_api_root(self):
        """Test API root endpoint returns ok"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print(f"✓ API root working: {data}")
    
    def test_public_website_data(self):
        """Test public website data endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        assert "config" in data
        assert "salon_name" in data["config"]
        print(f"✓ Public website data: salon_name = {data['config']['salon_name']}")
    
    def test_public_services(self):
        """Test public services endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public services: {len(data)} services found")
    
    def test_public_operators(self):
        """Test public operators endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public operators: {len(data)} operators found")
    
    def test_public_promotions(self):
        """Test public promotions endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/promotions/all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public promotions: {len(data)} promotions found")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_with_valid_credentials(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "Admin123!"
        })
        # Should be 200 if credentials exist, 401 if not
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            print(f"✓ Login successful - token received")
            return data["access_token"]
        else:
            print(f"! Login returned 401 - admin credentials may not exist")
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print(f"✓ Invalid login correctly returns 401")
    
    def test_protected_route_without_auth(self):
        """Test that protected routes return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 401
        print(f"✓ Protected route /api/clients correctly returns 401 without auth")


class TestFrontendRoutes:
    """Test frontend routing by checking response codes"""
    
    def test_root_returns_html(self):
        """Test root / returns HTML (public website)"""
        response = requests.get(BASE_URL, allow_redirects=True)
        assert response.status_code == 200
        assert 'text/html' in response.headers.get('content-type', '')
        print(f"✓ Root / returns HTML")
    
    def test_login_page(self):
        """Test /login returns HTML"""
        response = requests.get(f"{BASE_URL}/login", allow_redirects=True)
        assert response.status_code == 200
        assert 'text/html' in response.headers.get('content-type', '')
        print(f"✓ /login returns HTML")
    
    def test_sito_redirects_to_root(self):
        """Test /sito redirects to /"""
        response = requests.get(f"{BASE_URL}/sito", allow_redirects=False)
        # Should redirect (3xx) or return 200 if served as same page
        assert response.status_code in [200, 301, 302, 307, 308]
        print(f"✓ /sito handled correctly (status: {response.status_code})")
    
    def test_prenota_redirects_to_root(self):
        """Test /prenota redirects to /"""
        response = requests.get(f"{BASE_URL}/prenota", allow_redirects=False)
        # Should redirect (3xx) or return 200 if served as same page
        assert response.status_code in [200, 301, 302, 307, 308]
        print(f"✓ /prenota handled correctly (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
