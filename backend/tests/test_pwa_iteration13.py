"""
PWA (Progressive Web App) Features Test Suite - Iteration 13
Tests manifest.json, sw.js, offline.html, icons, and meta tags

Features tested:
1. manifest.json - app metadata, icons, colors
2. sw.js - service worker file
3. offline.html - offline fallback page
4. PWA icons - all 8 sizes
5. manifest-gestionale.json - admin PWA manifest
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://booking-widget-v2.preview.emergentagent.com"


class TestManifestJson:
    """Test main PWA manifest.json"""
    
    def test_manifest_returns_200(self):
        """manifest.json should be accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_manifest_content_type(self):
        """manifest.json should return correct content type"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        content_type = response.headers.get('Content-Type', '')
        assert 'application/json' in content_type or 'manifest' in content_type, f"Unexpected content type: {content_type}"
    
    def test_manifest_name(self):
        """manifest.json should have correct app name"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert data.get("name") == "Bruno Melito Hair Stylist", f"Expected 'Bruno Melito Hair Stylist', got {data.get('name')}"
    
    def test_manifest_start_url(self):
        """manifest.json should have start_url '/'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert data.get("start_url") == "/", f"Expected '/', got {data.get('start_url')}"
    
    def test_manifest_display_standalone(self):
        """manifest.json should have display 'standalone'"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert data.get("display") == "standalone", f"Expected 'standalone', got {data.get('display')}"
    
    def test_manifest_theme_color_gold(self):
        """manifest.json theme_color should be gold #D4AF37"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert data.get("theme_color") == "#D4AF37", f"Expected '#D4AF37', got {data.get('theme_color')}"
    
    def test_manifest_background_color_dark(self):
        """manifest.json background_color should be dark #0B1120"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        assert data.get("background_color") == "#0B1120", f"Expected '#0B1120', got {data.get('background_color')}"
    
    def test_manifest_has_9_icons(self):
        """manifest.json should have 9 icons (1 logo + 8 sized icons)"""
        response = requests.get(f"{BASE_URL}/manifest.json", timeout=10)
        data = response.json()
        icons = data.get("icons", [])
        assert len(icons) == 9, f"Expected 9 icons, got {len(icons)}"


class TestServiceWorker:
    """Test sw.js service worker"""
    
    def test_sw_returns_200(self):
        """sw.js should be accessible"""
        response = requests.get(f"{BASE_URL}/sw.js", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_sw_content_type(self):
        """sw.js should return JavaScript content type"""
        response = requests.get(f"{BASE_URL}/sw.js", timeout=10)
        content_type = response.headers.get('Content-Type', '')
        assert 'javascript' in content_type or 'text/plain' in content_type, f"Unexpected content type: {content_type}"
    
    def test_sw_has_cache_name(self):
        """sw.js should define CACHE_NAME"""
        response = requests.get(f"{BASE_URL}/sw.js", timeout=10)
        content = response.text
        assert "CACHE_NAME" in content, "sw.js should define CACHE_NAME"
        assert "bruno-melito-v2" in content, "CACHE_NAME should be 'bruno-melito-v2'"
    
    def test_sw_has_install_listener(self):
        """sw.js should have install event listener"""
        response = requests.get(f"{BASE_URL}/sw.js", timeout=10)
        content = response.text
        assert "addEventListener('install'" in content, "sw.js should have install event listener"
    
    def test_sw_has_fetch_listener(self):
        """sw.js should have fetch event listener"""
        response = requests.get(f"{BASE_URL}/sw.js", timeout=10)
        content = response.text
        assert "addEventListener('fetch'" in content, "sw.js should have fetch event listener"


class TestOfflineHtml:
    """Test offline.html fallback page"""
    
    def test_offline_returns_200(self):
        """offline.html should be accessible"""
        response = requests.get(f"{BASE_URL}/offline.html", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_offline_content_type(self):
        """offline.html should return HTML content type"""
        response = requests.get(f"{BASE_URL}/offline.html", timeout=10)
        content_type = response.headers.get('Content-Type', '')
        assert 'text/html' in content_type, f"Unexpected content type: {content_type}"
    
    def test_offline_has_branding(self):
        """offline.html should show BRUNO MELITO HAIR branding"""
        response = requests.get(f"{BASE_URL}/offline.html", timeout=10)
        content = response.text
        assert "BRUNO MELITO HAIR" in content, "offline.html should have branding"
    
    def test_offline_has_sei_offline_title(self):
        """offline.html should have 'Sei Offline' title"""
        response = requests.get(f"{BASE_URL}/offline.html", timeout=10)
        content = response.text
        assert "Sei Offline" in content, "offline.html should have 'Sei Offline' title"
    
    def test_offline_has_dark_background(self):
        """offline.html should have dark background #0B1120"""
        response = requests.get(f"{BASE_URL}/offline.html", timeout=10)
        content = response.text
        assert "#0B1120" in content, "offline.html should use dark background #0B1120"
    
    def test_offline_has_gold_theme_color(self):
        """offline.html should have gold theme color #D4AF37"""
        response = requests.get(f"{BASE_URL}/offline.html", timeout=10)
        content = response.text
        assert "#D4AF37" in content, "offline.html should use gold theme color #D4AF37"


class TestPwaIcons:
    """Test all 8 PWA icon sizes"""
    
    icon_sizes = [
        "72x72",
        "96x96", 
        "128x128",
        "144x144",
        "152x152",
        "192x192",
        "384x384",
        "512x512"
    ]
    
    @pytest.mark.parametrize("size", icon_sizes)
    def test_icon_returns_200(self, size):
        """Each icon should return 200"""
        response = requests.get(f"{BASE_URL}/icons/icon-{size}.png", timeout=10)
        assert response.status_code == 200, f"Icon {size} returned {response.status_code}"
    
    @pytest.mark.parametrize("size", icon_sizes)
    def test_icon_is_png(self, size):
        """Each icon should be a PNG file"""
        response = requests.get(f"{BASE_URL}/icons/icon-{size}.png", timeout=10)
        content_type = response.headers.get('Content-Type', '')
        assert 'image/png' in content_type, f"Icon {size} has content type: {content_type}"


class TestManifestGestionale:
    """Test admin PWA manifest-gestionale.json"""
    
    def test_manifest_gestionale_returns_200(self):
        """manifest-gestionale.json should be accessible"""
        response = requests.get(f"{BASE_URL}/manifest-gestionale.json", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_manifest_gestionale_theme_color(self):
        """manifest-gestionale.json should have gold theme_color #D4AF37"""
        response = requests.get(f"{BASE_URL}/manifest-gestionale.json", timeout=10)
        data = response.json()
        assert data.get("theme_color") == "#D4AF37", f"Expected '#D4AF37', got {data.get('theme_color')}"
    
    def test_manifest_gestionale_background_color(self):
        """manifest-gestionale.json should have dark background_color #0B1120"""
        response = requests.get(f"{BASE_URL}/manifest-gestionale.json", timeout=10)
        data = response.json()
        assert data.get("background_color") == "#0B1120", f"Expected '#0B1120', got {data.get('background_color')}"


class TestMainPageMetaTags:
    """Test main page has required PWA meta tags"""
    
    def test_main_page_loads(self):
        """Main page should load"""
        response = requests.get(f"{BASE_URL}/", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    
    def test_main_page_has_theme_color_meta(self):
        """Main page should have theme-color meta tag"""
        response = requests.get(f"{BASE_URL}/", timeout=10)
        content = response.text
        assert 'name="theme-color"' in content, "Main page should have theme-color meta tag"
        assert 'content="#D4AF37"' in content, "Theme color should be #D4AF37"
    
    def test_main_page_has_manifest_link(self):
        """Main page should have manifest link"""
        response = requests.get(f"{BASE_URL}/", timeout=10)
        content = response.text
        assert 'rel="manifest"' in content, "Main page should have manifest link"
        assert 'manifest.json' in content, "Manifest link should point to manifest.json"
    
    def test_main_page_has_apple_web_app_capable(self):
        """Main page should have apple-mobile-web-app-capable meta tag"""
        response = requests.get(f"{BASE_URL}/", timeout=10)
        content = response.text
        assert 'name="apple-mobile-web-app-capable"' in content, "Should have apple-mobile-web-app-capable"
    
    def test_main_page_has_apple_touch_icon(self):
        """Main page should have apple-touch-icon link"""
        response = requests.get(f"{BASE_URL}/", timeout=10)
        content = response.text
        assert 'rel="apple-touch-icon"' in content, "Should have apple-touch-icon link"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
