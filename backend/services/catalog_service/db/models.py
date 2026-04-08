from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from shared.database import Base

class Venue(Base):
    __tablename__ = "venues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    google_place_id = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=False)
    vicinity = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # children
    dishes = relationship("Dish", back_populates="venue", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="venue")

class Dish(Base):
    __tablename__ = "dishes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    
    # Base Flavor Fingerprints
    base_spice = Column(Float, default=0.5)
    base_acid = Column(Float, default=0.5)
    base_umami = Column(Float, default=0.5)
    base_sweet = Column(Float, default=0.5)
    base_texture = Column(Float, default=0.5)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    venue = relationship("Venue", back_populates="dishes")
    reviews = relationship("Review", back_populates="dish", cascade="all, delete-orphan")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False) # Represents reference to users table in User Service
    dish_id = Column(UUID(as_uuid=True), ForeignKey("dishes.id", ondelete="CASCADE"), nullable=False)
    venue_id = Column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="SET NULL"), nullable=True)
    rating = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    dish = relationship("Dish", back_populates="reviews")
    venue = relationship("Venue", back_populates="reviews")
    media = relationship("Media", back_populates="review", cascade="all, delete-orphan")

class Media(Base):
    __tablename__ = "media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id = Column(UUID(as_uuid=True), ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False)
    media_url = Column(String, nullable=False)
    media_type = Column(String, default="image")
    created_at = Column(DateTime, default=datetime.utcnow)

    review = relationship("Review", back_populates="media")
