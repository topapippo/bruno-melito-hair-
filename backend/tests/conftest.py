"""
conftest.py – configurazione condivisa per tutti i test pytest.
Evita la duplicazione di setup in ogni file di test.
"""
import pytest
import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport

# Variabili d'ambiente di test (devono essere impostate prima dell'import dell'app)
os.environ.setdefault("JWT_SECRET", "test-secret-key-only-for-tests")
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "mbhs_test")
os.environ.setdefault("ENV", "development")


@pytest.fixture(scope="session")
def event_loop():
    """Loop asyncio condiviso per tutta la sessione di test."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_db():
    """Mock del database MongoDB per test unitari senza connessione reale."""
    with patch("database.db") as mock:
        mock.users = AsyncMock()
        mock.clients = AsyncMock()
        mock.appointments = AsyncMock()
        mock.services = AsyncMock()
        mock.operators = AsyncMock()
        mock.payments = AsyncMock()
        mock.loyalty = AsyncMock()
        mock.cards = AsyncMock()
        mock.promotions = AsyncMock()
        mock.reminders = AsyncMock()
        yield mock


@pytest.fixture
def sample_user():
    """Utente di test standard."""
    return {
        "id": "test-user-id-123",
        "email": "test@salone.it",
        "name": "Utente Test",
        "salon_name": "Salone Test",
        "created_at": "2024-01-01T00:00:00+00:00"
    }


@pytest.fixture
def sample_client():
    """Cliente di test standard."""
    return {
        "id": "test-client-id-456",
        "user_id": "test-user-id-123",
        "name": "Mario Rossi",
        "phone": "3331234567",
        "email": "mario@example.com",
        "notes": "",
        "send_sms_reminders": True,
        "total_visits": 0,
        "created_at": "2024-01-01T00:00:00+00:00"
    }


@pytest.fixture
def auth_headers():
    """Headers con JWT valido per test autenticati."""
    from auth import create_token
    token = create_token("test-user-id-123")
    return {"Authorization": f"Bearer {token}"}
