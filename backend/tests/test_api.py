import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def client(monkeypatch):
    # These tests must pass without a running MariaDB server.
    monkeypatch.setattr("backend.main.database_available", lambda: False)
    with TestClient(app) as test_client:
        yield test_client


def test_health_without_database(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "unavailable"}


@pytest.mark.parametrize(
    "feature",
    (
        "tour-course",
        "facility-map",
        "store-spend-map",
        "monthly-briefing",
        "what-if",
    ),
)
def test_feature_ping(client, feature):
    response = client.get(f"/api/v1/{feature}/ping")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_docs(client):
    assert client.get("/docs").status_code == 200
