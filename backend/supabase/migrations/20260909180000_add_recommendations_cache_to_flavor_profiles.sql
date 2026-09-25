ALTER TABLE flavor_profiles ADD COLUMN cached_recommendations TEXT;
ALTER TABLE flavor_profiles ADD COLUMN recommendations_stale BOOLEAN DEFAULT TRUE;
