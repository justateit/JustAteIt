-- ============================================================
-- JustAteIt — local development seed (applied by `supabase db reset`)
--
-- Rules for this file (enforced by backend/tests/test_schema_invariants.py):
--   * Deterministic: every id and timestamp is a fixed literal.
--     No now(), random(), or gen_random_uuid() calls — two resets
--     always produce byte-identical rows.
--   * No PII: user ids, names, avatars, venues, and addresses are
--     synthetic. Never paste real Clerk ids, emails, phone numbers,
--     or real people/places into this file.
--
-- Fixture UUIDs follow 00000000-0000-4000-8000-0000CCCCNNNN where
-- CCCC is a per-table code (0101 venues, 0201 dishes, 0301 reviews,
-- 0401 media, 0501 audit logs) and NNNN is the row number.
-- ============================================================

-- ── Users (Clerk-style TEXT ids, clearly synthetic) ─────────────
INSERT INTO users (id, username, display_name, avatar_url, bio, created_at, updated_at) VALUES
  ('user_seed_demo_0001', 'demo_umami_fan', 'Demo Diner One',
   'https://media.example.com/seed/avatars/demo-0001.png',
   'Synthetic fixture account. Chases broth depth.',
   '2026-01-05 09:00:00+00', '2026-01-05 09:00:00+00'),
  ('user_seed_demo_0002', 'demo_spice_scout', 'Demo Diner Two',
   'https://media.example.com/seed/avatars/demo-0002.png',
   'Synthetic fixture account. Hunts heat.',
   '2026-01-06 10:30:00+00', '2026-01-06 10:30:00+00');

-- ── Venues (fictional places) ───────────────────────────────────
INSERT INTO venues (id, google_place_id, name, vicinity, lat, lng, created_at) VALUES
  ('00000000-0000-4000-8000-000001010001', 'seed-place-0001',
   'Seed Ramen Bar', '123 Example Street, Sampleville', 45.000000, -122.500000,
   '2026-01-07 12:00:00+00'),
  ('00000000-0000-4000-8000-000001010002', 'seed-place-0002',
   'Placeholder Taqueria', '456 Fixture Avenue, Sampleville', 45.010000, -122.510000,
   '2026-01-07 12:05:00+00');

-- ── Dishes (base flavor fingerprints in [0, 1]) ─────────────────
INSERT INTO dishes (id, venue_id, name, description, base_spice, base_acid, base_umami, base_sweet, base_texture, created_at) VALUES
  ('00000000-0000-4000-8000-000002010001', '00000000-0000-4000-8000-000001010001',
   'Tonkotsu Ramen', 'Rich pork-style broth fixture.', 0.30, 0.20, 0.90, 0.20, 0.70,
   '2026-01-07 12:10:00+00'),
  ('00000000-0000-4000-8000-000002010002', '00000000-0000-4000-8000-000001010001',
   'Spicy Miso Ramen', 'Chili-forward broth fixture.', 0.85, 0.25, 0.80, 0.15, 0.65,
   '2026-01-07 12:11:00+00'),
  ('00000000-0000-4000-8000-000002010003', '00000000-0000-4000-8000-000001010002',
   'Salsa Verde Tacos', 'Bright tomatillo fixture.', 0.55, 0.80, 0.50, 0.10, 0.45,
   '2026-01-07 12:12:00+00');

-- ── Reviews (ratings must stay within 1..5) ─────────────────────
INSERT INTO reviews (id, user_id, dish_id, venue_id, rating, comment, created_at) VALUES
  ('00000000-0000-4000-8000-000003010001', 'user_seed_demo_0001',
   '00000000-0000-4000-8000-000002010001', '00000000-0000-4000-8000-000001010001',
   4.5, 'Deep savory broth, springy noodles.', '2026-01-08 18:00:00+00'),
  ('00000000-0000-4000-8000-000003010002', 'user_seed_demo_0001',
   '00000000-0000-4000-8000-000002010003', '00000000-0000-4000-8000-000001010002',
   3.0, 'Good acidity but wanted more umami.', '2026-01-09 13:15:00+00'),
  ('00000000-0000-4000-8000-000003010003', 'user_seed_demo_0002',
   '00000000-0000-4000-8000-000002010002', '00000000-0000-4000-8000-000001010001',
   5.0, 'Heat level exactly right.', '2026-01-10 19:45:00+00');

-- ── Media (placeholder URLs, one per photographed review) ───────
INSERT INTO media (id, review_id, media_url, media_type, created_at) VALUES
  ('00000000-0000-4000-8000-000004010001', '00000000-0000-4000-8000-000003010001',
   'https://media.example.com/seed/reviews/ramen-0001.jpg', 'image',
   '2026-01-08 18:01:00+00'),
  ('00000000-0000-4000-8000-000004010002', '00000000-0000-4000-8000-000003010003',
   'https://media.example.com/seed/reviews/miso-0001.jpg', 'image',
   '2026-01-10 19:46:00+00');

-- ── Flavor profiles (review_count matches seeded reviews) ───────
INSERT INTO flavor_profiles (user_id, spice, acid, umami, sweet, texture, review_count, last_updated_at) VALUES
  ('user_seed_demo_0001', 0.33, 0.55, 0.78, 0.28, 0.50, 2, '2026-01-09 13:15:00+00'),
  ('user_seed_demo_0002', 0.62, 0.48, 0.72, 0.25, 0.52, 1, '2026-01-10 19:45:00+00');

-- ── Flavor audit logs (one entry per seeded review) ─────────────
INSERT INTO flavor_audit_logs (id, user_id, review_id, delta_spice, delta_acid, delta_umami, delta_sweet, delta_texture, new_spice, new_acid, new_umami, new_sweet, new_texture, created_at) VALUES
  ('00000000-0000-4000-8000-000005010001', 'user_seed_demo_0001',
   '00000000-0000-4000-8000-000003010001',
   -0.010, 0.010, 0.060, -0.010, 0.030, 0.34, 0.51, 0.76, 0.29, 0.48,
   '2026-01-08 18:00:00+00'),
  ('00000000-0000-4000-8000-000005010002', 'user_seed_demo_0001',
   '00000000-0000-4000-8000-000003010002',
   -0.010, 0.040, 0.020, -0.010, 0.020, 0.33, 0.55, 0.78, 0.28, 0.50,
   '2026-01-09 13:15:00+00'),
  ('00000000-0000-4000-8000-000005010003', 'user_seed_demo_0002',
   '00000000-0000-4000-8000-000003010003',
   0.120, -0.020, 0.020, -0.050, 0.070, 0.62, 0.48, 0.72, 0.25, 0.52,
   '2026-01-10 19:45:00+00');
