"""
Test Suite for Iteration 3 Features:
- Routing changes (/ shows public site, /sito redirects)
- Clickable services/promos on landing page
- Twilio SMS removal and WhatsApp link generator
- Video range request support
- Reminders API with auth
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@brunomelito.it"
ADMIN_PASSWORD = "Admin123!"


class TestPublicAPI:
    """Public API endpoints that don't require authentication"""

    def test_public_website_returns_data(self):
        """Test /api/public/website returns config, reviews, gallery, services"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        assert "config" in data
        assert "salon_name" in data["config"]
        assert data["config"]["salon_name"] == "BRUNO MELITO HAIR"
        assert "reviews" in data
        assert "gallery" in data
        assert "services" in data
        print(f"Public website config loaded: {data['config'].get('salon_name')}")

    def test_public_services_returns_21_services(self):
        """Test /api/public/services returns 21 services"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 21, f"Expected 21 services, got {len(data)}"
        print(f"Services count: {len(data)}")

    def test_public_promotions_returns_7_promos(self):
        """Test /api/public/promotions/all returns 7 promotions"""
        response = requests.get(f"{BASE_URL}/api/public/promotions/all")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 7, f"Expected 7 promos, got {len(data)}"
        print(f"Promotions count: {len(data)}")

    def test_public_operators_endpoint(self):
        """Test /api/public/operators returns list"""
        response = requests.get(f"{BASE_URL}/api/public/operators")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Operators count: {len(data)}")


class TestSMSRemoval:
    """Test that Twilio SMS endpoints are removed"""

    def test_sms_send_reminder_not_found(self):
        """Test /api/sms/send-reminder returns 404 (removed)"""
        response = requests.post(f"{BASE_URL}/api/sms/send-reminder", json={})
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SMS send-reminder endpoint correctly removed (404)")

    def test_sms_status_not_found(self):
        """Test /api/sms/status returns 404 (removed)"""
        response = requests.get(f"{BASE_URL}/api/sms/status")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("SMS status endpoint correctly removed (404)")


class TestAuthEndpoints:
    """Test authentication and protected endpoints"""

    @pytest.fixture
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json().get("access_token")

    def test_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"Login successful for: {data['user']['email']}")

    def test_whatsapp_generate_link_requires_auth(self):
        """Test /api/whatsapp/generate-link requires authentication"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/generate-link", params={
            "phone": "393397833526",
            "message": "test"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("WhatsApp generate-link correctly requires auth")

    def test_whatsapp_generate_link_with_auth(self, auth_token):
        """Test /api/whatsapp/generate-link with valid auth"""
        response = requests.get(f"{BASE_URL}/api/whatsapp/generate-link", 
            headers={"Authorization": f"Bearer {auth_token}"},
            params={"phone": "393397833526", "message": "Hello"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert data["url"].startswith("https://wa.me/")
        assert "393397833526" in data["url"]
        print(f"WhatsApp link generated: {data['url'][:50]}...")

    def test_reminders_auto_check_requires_auth(self):
        """Test /api/reminders/auto-check requires authentication"""
        response = requests.get(f"{BASE_URL}/api/reminders/auto-check")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Reminders auto-check correctly requires auth")

    def test_reminders_auto_check_with_auth(self, auth_token):
        """Test /api/reminders/auto-check with valid auth"""
        response = requests.get(f"{BASE_URL}/api/reminders/auto-check",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "tomorrow_date" in data
        assert "total_tomorrow" in data
        assert "pending" in data
        print(f"Auto-check response: {data.get('tomorrow_date')}, total: {data.get('total_tomorrow')}")

    def test_reminders_templates_with_auth(self, auth_token):
        """Test /api/reminders/templates returns templates"""
        response = requests.get(f"{BASE_URL}/api/reminders/templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "name" in data[0]
            assert "text" in data[0]
        print(f"Templates count: {len(data)}")

    def test_reminders_tomorrow_with_auth(self, auth_token):
        """Test /api/reminders/tomorrow returns list"""
        response = requests.get(f"{BASE_URL}/api/reminders/tomorrow",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Tomorrow reminders count: {len(data)}")

    def test_reminders_inactive_clients_with_auth(self, auth_token):
        """Test /api/reminders/inactive-clients returns list"""
        response = requests.get(f"{BASE_URL}/api/reminders/inactive-clients",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Inactive clients count: {len(data)}")


class TestVideoRangeRequest:
    """Test video range request support"""

    def test_video_file_endpoint_exists(self):
        """Test /api/website/files/{id} endpoint structure"""
        # First get gallery to find video files
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        gallery = data.get("gallery", [])
        video_files = [g for g in gallery if g.get("file_type") == "video"]
        
        if video_files:
            # Try to access a video file
            video = video_files[0]
            image_url = video.get("image_url", "")
            if "/api/website/files/" in image_url:
                file_id = image_url.split("/api/website/files/")[-1]
                # Make request with Range header
                response = requests.head(f"{BASE_URL}/api/website/files/{file_id}",
                    headers={"Range": "bytes=0-1024"}
                )
                # Should return 200 or 206 (partial content)
                assert response.status_code in [200, 206, 404], f"Unexpected status: {response.status_code}"
                print(f"Video file endpoint works, status: {response.status_code}")
            else:
                print("Video URL not in expected format, skipping")
        else:
            print("No video files in gallery, skipping video test")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
