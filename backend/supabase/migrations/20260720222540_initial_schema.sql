-- ============================================================
-- JustAteIt — initial schema (source of truth)
--
-- Versioned Supabase migration converted from the former
-- backend/schema.sql. Apply locally with `supabase start` /
-- `supabase db reset`, and to hosted projects with
-- `supabase db push` over the DIRECT connection (never the
-- pooler). See backend/README.md → "Database (Supabase)".
--
-- Notes vs. the old RDS script:
--   * UUID defaults use gen_random_uuid() (built into
--     PostgreSQL 13+), so no uuid-ossp extension is needed.
--   * Row Level Security is enabled on every table with no
--     policies: the auto-generated PostgREST API denies all
--     anon/authenticated access by default. Backend services
--     connect as the table owner (postgres) or with the
--     service role key, both of which are unaffected.
-- ============================================================

-- 1. Users (mirrors Clerk user data; id is the Clerk user id)
CREATE TABLE users (
  id           TEXT PRIMARY KEY,
  username     TEXT,
  display_name TEXT,
  avatar_url   TEXT,
  bio          TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- 2. Flavor profiles (computed per-user scores)
CREATE TABLE flavor_profiles (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  spice           FLOAT DEFAULT 0.35,
  acid            FLOAT DEFAULT 0.50,
  umami           FLOAT DEFAULT 0.70,
  sweet           FLOAT DEFAULT 0.30,
  texture         FLOAT DEFAULT 0.45,
  review_count    INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Venues (location/restaurant data)
CREATE TABLE venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id TEXT UNIQUE,
  name            TEXT NOT NULL,
  vicinity        TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 4. Dishes (menu items & base flavor fingerprints)
CREATE TABLE dishes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 5. Reviews (logs tying a user to a dish)
CREATE TABLE reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dish_id    UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  venue_id   UUID REFERENCES venues(id) ON DELETE SET NULL,
  rating     FLOAT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Media (attached photos for a review)
CREATE TABLE media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  media_url   TEXT NOT NULL,
  media_type  TEXT DEFAULT 'image',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 7. Flavor audit logs (flavor journey over time)
CREATE TABLE flavor_audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_id     UUID REFERENCES reviews(id) ON DELETE SET NULL,
  delta_spice   FLOAT,
  delta_acid    FLOAT,
  delta_umami   FLOAT,
  delta_sweet   FLOAT,
  delta_texture FLOAT,
  new_spice     FLOAT,
  new_acid      FLOAT,
  new_umami     FLOAT,
  new_sweet     FLOAT,
  new_texture   FLOAT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes for commonly queried columns
CREATE INDEX idx_venues_google_place_id ON venues(google_place_id);
CREATE INDEX idx_dishes_venue_id ON dishes(venue_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_venue_id ON reviews(venue_id);
CREATE INDEX idx_media_review_id ON media(review_id);

-- Lock down the auto-generated API: RLS on, no policies (deny by
-- default). Backend services are unaffected (owner / service role).
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavor_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues            ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews           ENABLE ROW LEVEL SECURITY;
ALTER TABLE media             ENABLE ROW LEVEL SECURITY;
ALTER TABLE flavor_audit_logs ENABLE ROW LEVEL SECURITY;
