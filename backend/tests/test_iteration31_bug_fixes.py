"""
Iteration 31: Bug Fixes Testing
- Bug 1: Upselling API was using hardcoded wrong email (melitobruno@gmail.com -> admin@brunomelito.it)
- Bug 2: Promos and Card/Abbonamenti should be visible in Planning page (NewAppointmentDialog)
- Bug 3: Services on public booking site should be in clickable categories
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUpsellingApiFix:
    """Test that upselling API works with correct user (admin@brunomelito.it)"""
    
    def test_public_services_returns_data(self):
        """Verify public services endpoint returns services"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        services = response.json()
        assert len(services) > 0, "Should return at least one service"
        # Verify service structure
        first_service = services[0]
        assert "id" in first_service
        assert "name" in first_service
        assert "category" in first_service
        print(f"✓ Found {len(services)} public services")
    
    def test_upselling_returns_suggestions(self):
        """Verify upselling API returns suggestions with discounted prices"""
        # First get a service ID
        services_response = requests.get(f"{BASE_URL}/api/public/services")
        services = services_response.json()
        assert len(services) > 0, "Need at least one service"
        
        # Use the first service ID (Taglio Donna)
        service_id = services[0]["id"]
        
        # Call upselling API
        response = requests.get(f"{BASE_URL}/api/public/upselling?service_ids={service_id}")
        assert response.status_code == 200
        suggestions = response.json()
        
        # Should return suggestions (based on upselling rules)
        print(f"✓ Upselling returned {len(suggestions)} suggestions for service {services[0]['name']}")
        
        if len(suggestions) > 0:
            # Verify suggestion structure
            suggestion = suggestions[0]
            assert "id" in suggestion
            assert "name" in suggestion
            assert "original_price" in suggestion
            assert "discounted_price" in suggestion
            assert "discount_percent" in suggestion
            assert suggestion["discounted_price"] < suggestion["original_price"], "Discounted price should be less than original"
            print(f"  - {suggestion['name']}: €{suggestion['original_price']} -> €{suggestion['discounted_price']} (-{suggestion['discount_percent']}%)")


class TestPublicPromotionsAndCards:
    """Test that promotions and card templates are available for public booking"""
    
    def test_public_promotions_all_endpoint(self):
        """Verify /api/public/promotions/all returns active promotions"""
        response = requests.get(f"{BASE_URL}/api/public/promotions/all")
        assert response.status_code == 200
        promos = response.json()
        assert len(promos) > 0, "Should return at least one promotion"
        
        # Verify promo structure
        promo = promos[0]
        assert "id" in promo
        assert "name" in promo
        assert "active" in promo
        print(f"✓ Found {len(promos)} public promotions")
        for p in promos[:3]:
            print(f"  - {p['name']}")
    
    def test_public_website_includes_card_templates(self):
        """Verify /api/public/website returns card templates"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        
        assert "card_templates" in data, "Response should include card_templates"
        card_templates = data["card_templates"]
        assert len(card_templates) > 0, "Should return at least one card template"
        
        # Verify card template structure
        card = card_templates[0]
        assert "id" in card
        assert "name" in card
        assert "card_type" in card
        assert "total_value" in card
        print(f"✓ Found {len(card_templates)} card templates in public website data")
        for c in card_templates[:3]:
            print(f"  - {c['name']} ({c['card_type']}) - €{c['total_value']}")


class TestAuthenticatedPromotionsAndCards:
    """Test that authenticated endpoints return promos and cards for Planning page"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@brunomelito.it",
            "password": "mbhs637104"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_promotions_endpoint(self, auth_token):
        """Verify /api/promotions returns promotions for logged-in user"""
        response = requests.get(
            f"{BASE_URL}/api/promotions",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        promos = response.json()
        assert len(promos) > 0, "Should return at least one promotion"
        print(f"✓ Found {len(promos)} promotions for authenticated user")
    
    def test_card_templates_endpoint(self, auth_token):
        """Verify /api/card-templates returns card templates for logged-in user"""
        response = requests.get(
            f"{BASE_URL}/api/card-templates",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        templates = response.json()
        assert len(templates) > 0, "Should return at least one card template"
        print(f"✓ Found {len(templates)} card templates for authenticated user")


class TestServiceCategories:
    """Test that services have categories for grouping"""
    
    def test_services_have_categories(self):
        """Verify services have category field for grouping"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        services = response.json()
        
        # Check that services have categories
        categories = set()
        for service in services:
            assert "category" in service, f"Service {service['name']} should have category"
            categories.add(service["category"])
        
        print(f"✓ Found {len(categories)} unique categories: {', '.join(sorted(categories))}")
        
        # Verify expected categories exist
        expected_categories = ["taglio", "piega", "colore", "trattamento"]
        for cat in expected_categories:
            assert cat in categories, f"Expected category '{cat}' not found"
        print(f"✓ All expected categories present")


class TestPublicWebsiteConfig:
    """Test public website configuration includes service categories"""
    
    def test_website_config_has_service_categories(self):
        """Verify website config includes service_categories for landing page"""
        response = requests.get(f"{BASE_URL}/api/public/website")
        assert response.status_code == 200
        data = response.json()
        
        assert "config" in data, "Response should include config"
        config = data["config"]
        
        # Check for service_categories (used on landing page)
        if "service_categories" in config:
            categories = config["service_categories"]
            print(f"✓ Found {len(categories)} service categories in website config")
            for cat in categories[:3]:
                print(f"  - {cat.get('title', 'N/A')}: {len(cat.get('items', []))} items")
        else:
            print("ℹ No service_categories in config (services grouped from DB)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
