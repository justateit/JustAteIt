import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from shared.database import get_db
from services.catalog_service.db import models
from services.catalog_service.main import app as catalog_app

# SQLite in-memory shared database instance
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create catalog tables in the SQLite database
models.Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

catalog_app.dependency_overrides[get_db] = override_get_db
client = TestClient(catalog_app)

def test_log_single_interaction():
    payload = {
        "user_id": "test_user_001",
        "dish_id": "00000000-0000-4000-8000-000002010001",
        "venue_id": "00000000-0000-4000-8000-000001010001",
        "interaction_type": "dwell",
        "dwell_time_ms": 3500,
        "session_id": "sess_123",
        "context": {"feed_position": 2, "device": "ios"}
    }
    resp = client.post("/interactions", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "id" in data

def test_log_batch_interactions():
    payload = {
        "interactions": [
            {
                "user_id": "test_user_001",
                "interaction_type": "impression",
                "dwell_time_ms": 500,
                "session_id": "sess_123",
                "context": {"feed_position": 0}
            },
            {
                "user_id": "test_user_001",
                "interaction_type": "expand",
                "dwell_time_ms": 8200,
                "session_id": "sess_123",
                "context": {"feed_position": 1}
            },
            {
                "user_id": "test_user_002",
                "interaction_type": "skip",
                "dwell_time_ms": 400,
                "session_id": "sess_456"
            }
        ]
    }
    resp = client.post("/interactions/batch", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["count"] == 3

def test_get_user_interactions():
    user_id = "test_user_001"
    resp = client.get(f"/interactions/{user_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 3
    types = [item["interaction_type"] for item in data["interactions"]]
    assert "dwell" in types
    assert "impression" in types
    assert "expand" in types

def test_get_feed_empty_or_populated():
    """Verifies that the /feed endpoint returns algorithmic recommendations."""
    db = TestingSessionLocal()
    # Seed a venue and two dishes
    venue = models.Venue(name="Test Kitchen", vicinity="Downtown", lat=37.77, lng=-122.41)
    db.add(venue)
    db.commit()

    dish1 = models.Dish(venue_id=venue.id, name="Spicy Szechuan Noodles", cuisine="Chinese", base_spice=0.9, base_umami=0.8)
    dish2 = models.Dish(venue_id=venue.id, name="Sweet Crepes", cuisine="French", base_sweet=0.9, base_spice=0.1)
    db.add_all([dish1, dish2])
    db.commit()
    db.close()

    resp = client.get("/feed?page=1&limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert "feed" in data
    assert len(data["feed"]) >= 2
    first_dish = data["feed"][0]
    assert "match_score" in first_dish
    assert "recommendation_reason" in first_dish
    assert first_dish["match_score"] >= 15

