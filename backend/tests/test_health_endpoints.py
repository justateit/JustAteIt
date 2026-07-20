"""Health endpoint tests for all four backend services.

These import each FastAPI app directly and hit its health route in-process.
No database, S3, or network access is required.
"""
from fastapi.testclient import TestClient

from api_gateway.main import app as gateway_app
from services.catalog_service.main import app as catalog_app
from services.media_service.main import app as media_app
from services.user_service.main import app as user_app


def test_api_gateway_health():
    response = TestClient(gateway_app).get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "API Gateway"}


def test_user_service_health():
    response = TestClient(user_app).get("/users/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "user_service"}


def test_catalog_service_health():
    response = TestClient(catalog_app).get("/catalog/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "catalog_service"}


def test_media_service_health():
    response = TestClient(media_app).get("/media/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "media_service"}
