-- ============================================================
-- JustAteIt — Full RDS PostgreSQL Schema
-- ============================================================

-- 1. Users table (mirrors Clerk user data)
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  username     TEXT,
  display_name TEXT,
  avatar_url   TEXT,
  bio          TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- 2. Flavor profiles (Computed User Scores)
CREATE TABLE IF NOT EXISTS flavor_profiles (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  spice           FLOAT DEFAULT 0.35,
  acid            FLOAT DEFAULT 0.50,
  umami           FLOAT DEFAULT 0.70,
  sweet           FLOAT DEFAULT 0.30,
  texture         FLOAT DEFAULT 0.45,
  review_count    INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Venues (Location/Restaurant data)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- Important for UUID generation

CREATE TABLE IF NOT EXISTS venues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_place_id TEXT UNIQUE,
  name            TEXT NOT NULL,
  vicinity        TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 4. Dishes (Menu items & Base Flavor Fingerprints)
CREATE TABLE IF NOT EXISTS dishes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id     UUID REFERENCES venues(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  base_spice   FLOAT DEFAULT 0.5,
  base_acid    FLOAT DEFAULT 0.5,
  base_umami   FLOAT DEFAULT 0.5,
  base_sweet   FLOAT DEFAULT 0.5,
  base_texture FLOAT DEFAULT 0.5,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- 5. Reviews (The Logs tying a User to a Dish)
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dish_id    UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  venue_id   UUID REFERENCES venues(id) ON DELETE SET NULL,
  rating     FLOAT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Media (Attached photos for a review)
CREATE TABLE IF NOT EXISTS media (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id   UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  media_url   TEXT NOT NULL,
  media_type  TEXT DEFAULT 'image',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 7. Flavor Audit Logs (Tracking flavor journey over time)
CREATE TABLE IF NOT EXISTS flavor_audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_id   UUID REFERENCES reviews(id) ON DELETE SET NULL,
  delta_spice FLOAT,
  delta_acid  FLOAT,
  delta_umami FLOAT,
  delta_sweet FLOAT,
  delta_texture FLOAT,
  new_spice   FLOAT,
  new_acid    FLOAT,
  new_umami   FLOAT,
  new_sweet   FLOAT,
  new_texture FLOAT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Create Indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_venues_google_place_id ON venues(google_place_id);
CREATE INDEX IF NOT EXISTS idx_dishes_venue_id ON dishes(venue_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_venue_id ON reviews(venue_id);
CREATE INDEX IF NOT EXISTS idx_media_review_id ON media(review_id);
