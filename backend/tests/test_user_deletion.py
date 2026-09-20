import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from shared.database import get_db, Base
from services.user_service.db import models
from services.user_service.main import app as user_app

# Use StaticPool so SQLite in-memory shares the single database instance across threads
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables in the shared in-memory SQLite database
models.Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

user_app.dependency_overrides[get_db] = override_get_db
client = TestClient(user_app)

def test_delete_nonexistent_user():
    """Verifies that attempting to delete a user that does not exist returns 404."""
    response = client.delete("/users/nonexistent_user_999999")
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"

def test_delete_existing_user():
    """Verifies that deleting an existing user succeeds and deletes profile data."""
    user_id = "test_clerk_user_delete_123"
    upsert_resp = client.post("/users", json={"id": user_id, "username": "delete_me", "display_name": "Test Delete"})
    assert upsert_resp.status_code == 200

    # Verify user exists
    get_resp = client.get(f"/users/{user_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["username"] == "delete_me"

    # Delete user
    del_resp = client.delete(f"/users/{user_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # Confirm user no longer exists
    get_after = client.get(f"/users/{user_id}")
    assert get_after.status_code == 404
