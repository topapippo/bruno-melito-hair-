"""
Test flusso abbonamento (subscription):
- incasso SOLO alla vendita (card_sale_id presente, total_paid > 0)
- checkout servizio con abbonamento: total_paid = 0, payment_type = subscription_checkout
- checkout servizio con prepaid: total_paid scalato, payment_type = prepaid_checkout
- IN SCADENZA: remaining_services = 1 dopo checkout
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
TEST_EMAIL = os.environ.get("TEST_ADMIN_EMAIL", "")
TEST_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD", "")


@pytest.fixture(scope="module")
def auth_headers():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert resp.status_code == 200, f"Login fallito: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def test_client_id(auth_headers):
    """Crea un cliente temporaneo per i test."""
    name = f"Test Abbonamento {uuid.uuid4().hex[:6]}"
    resp = requests.post(f"{BASE_URL}/api/clients", json={"name": name, "phone": "3331234567"}, headers=auth_headers)
    assert resp.status_code == 200
    return resp.json()["id"]


@pytest.fixture(scope="module")
def test_service_id(auth_headers):
    """Recupera il primo servizio disponibile."""
    resp = requests.get(f"{BASE_URL}/api/services", headers=auth_headers)
    assert resp.status_code == 200
    services = resp.json()
    assert len(services) > 0, "Nessun servizio trovato — creare almeno uno prima di eseguire i test"
    return services[0]["id"]


class TestSubscriptionSale:
    """Vend una subscription e verifica che il payment abbia card_sale_id + payment_type corretto."""

    def test_sell_subscription_creates_card_sale_payment(self, auth_headers, test_client_id):
        # Prima cerca un template di tipo subscription
        resp = requests.get(f"{BASE_URL}/api/card-templates", headers=auth_headers)
        assert resp.status_code == 200
        templates = resp.json()
        sub_templates = [t for t in templates if t.get("card_type") == "subscription"]
        if not sub_templates:
            pytest.skip("Nessun template subscription disponibile")

        template_id = sub_templates[0]["id"]
        amount = sub_templates[0].get("default_price", 50.0)

        resp = requests.post(f"{BASE_URL}/api/cards/sell", json={
            "template_id": template_id,
            "client_id": test_client_id,
            "amount_paid": amount,
            "payment_method": "cash"
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        card_id = data["card_id"]
        payment_id = data["payment_id"]

        # Verifica il payment creato
        resp = requests.get(f"{BASE_URL}/api/payments", headers=auth_headers)
        assert resp.status_code == 200
        payments = resp.json()
        sale_payment = next((p for p in payments if p.get("id") == payment_id), None)
        assert sale_payment is not None, "Payment di vendita non trovato"
        assert sale_payment["card_sale_id"] == card_id, "card_sale_id mancante"
        assert sale_payment["total_paid"] == amount, "Incasso vendita deve essere l'importo pagato"
        assert sale_payment["payment_type"] == "subscription_sale", f"payment_type errato: {sale_payment.get('payment_type')}"


class TestSubscriptionCheckout:
    """Verifica che il checkout con abbonamento registri total_paid=0 e payment_type=subscription_checkout."""

    @pytest.fixture(scope="class")
    def subscription_card(self, auth_headers, test_client_id):
        """Crea una subscription card per i test di checkout."""
        resp = requests.get(f"{BASE_URL}/api/card-templates", headers=auth_headers)
        assert resp.status_code == 200
        templates = resp.json()
        sub_templates = [t for t in templates if t.get("card_type") == "subscription" and t.get("total_services", 0) >= 3]
        if not sub_templates:
            pytest.skip("Nessun template subscription con >= 3 servizi")

        template_id = sub_templates[0]["id"]
        resp = requests.post(f"{BASE_URL}/api/cards/sell", json={
            "template_id": template_id,
            "client_id": test_client_id,
            "amount_paid": 100.0,
            "payment_method": "cash"
        }, headers=auth_headers)
        assert resp.status_code == 200
        return resp.json()["card_id"]

    @pytest.fixture(scope="class")
    def appointment_id(self, auth_headers, test_client_id, test_service_id):
        """Crea un appuntamento temporaneo."""
        from datetime import date
        today = date.today().isoformat()
        resp = requests.post(f"{BASE_URL}/api/appointments", json={
            "client_id": test_client_id,
            "service_ids": [test_service_id],
            "date": today,
            "time": "10:00"
        }, headers=auth_headers)
        assert resp.status_code == 200
        return resp.json()["id"]

    def test_subscription_checkout_total_paid_is_zero(self, auth_headers, appointment_id, subscription_card):
        resp = requests.post(f"{BASE_URL}/api/appointments/{appointment_id}/checkout", json={
            "payment_method": "prepaid",
            "total_paid": 0,
            "card_id": subscription_card
        }, headers=auth_headers)
        assert resp.status_code == 200, f"Checkout fallito: {resp.text}"
        data = resp.json()
        assert data["status"] == "ok"

        # Verifica il payment creato
        payments_resp = requests.get(f"{BASE_URL}/api/payments", headers=auth_headers)
        payments = payments_resp.json()
        checkout_payment = next((p for p in payments if p.get("appointment_id") == appointment_id), None)
        assert checkout_payment is not None, "Payment di checkout non trovato"
        assert checkout_payment["total_paid"] == 0.0, f"Subscription checkout deve avere total_paid=0, trovato: {checkout_payment['total_paid']}"
        assert checkout_payment["payment_type"] == "subscription_checkout", f"payment_type errato: {checkout_payment.get('payment_type')}"
        assert not checkout_payment.get("card_sale_id"), "checkout non deve avere card_sale_id"

    def test_subscription_checkout_scales_services(self, auth_headers, appointment_id, subscription_card):
        # Dopo il checkout sopra, verifica che la card abbia scalato
        resp = requests.get(f"{BASE_URL}/api/cards/{subscription_card}", headers=auth_headers)
        if resp.status_code == 404:
            pytest.skip("Endpoint card detail non disponibile")
        assert resp.status_code == 200
        card = resp.json()
        assert card["used_services"] >= 1, "La card deve aver scalato almeno 1 servizio"

    def test_subscription_checkout_remaining_services_warning(self, auth_headers, test_client_id, test_service_id):
        """Verifica che remaining_services=1 venga restituito quando rimane 1 servizio."""
        # Crea una card con esattamente 2 servizi, poi esegui 1 checkout
        resp = requests.get(f"{BASE_URL}/api/card-templates", headers=auth_headers)
        templates = resp.json()
        sub_templates = [t for t in templates if t.get("card_type") == "subscription" and t.get("total_services") == 2]
        if not sub_templates:
            pytest.skip("Nessun template subscription con esattamente 2 servizi")

        card_resp = requests.post(f"{BASE_URL}/api/cards/sell", json={
            "template_id": sub_templates[0]["id"],
            "client_id": test_client_id,
            "amount_paid": 80.0,
            "payment_method": "cash"
        }, headers=auth_headers)
        assert card_resp.status_code == 200
        card_id = card_resp.json()["card_id"]

        from datetime import date
        today = date.today().isoformat()
        apt_resp = requests.post(f"{BASE_URL}/api/appointments", json={
            "client_id": test_client_id,
            "service_ids": [test_service_id],
            "date": today,
            "time": "11:00"
        }, headers=auth_headers)
        assert apt_resp.status_code == 200
        apt_id = apt_resp.json()["id"]

        checkout_resp = requests.post(f"{BASE_URL}/api/appointments/{apt_id}/checkout", json={
            "payment_method": "prepaid",
            "total_paid": 0,
            "card_id": card_id
        }, headers=auth_headers)
        assert checkout_resp.status_code == 200
        result = checkout_resp.json()
        card_data = result.get("card")
        assert card_data is not None, "La risposta deve includere i dati della card"
        assert card_data["remaining_services"] == 1, f"Deve restare 1 servizio, trovato: {card_data.get('remaining_services')}"
        assert card_data["card_active"] is True, "La card deve essere ancora attiva"
