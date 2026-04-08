from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from shared.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    username = Column(String, nullable=True)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    flavor_profile = relationship("FlavorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")


class FlavorProfile(Base):
    __tablename__ = "flavor_profiles"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    spice = Column(Float, default=0.35)
    acid = Column(Float, default=0.50)
    umami = Column(Float, default=0.70)
    sweet = Column(Float, default=0.30)
    texture = Column(Float, default=0.45)
    review_count = Column(Integer, default=0)
    last_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="flavor_profile")
