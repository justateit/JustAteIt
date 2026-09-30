-- Saved logs (dishes a user bookmarked to try, from any feed) --
--
-- Deliberately a snapshot rather than a FK to reviews: the bookmark keeps its own
-- copy of the dish details, so a saved dish survives the original log being
-- edited or deleted, and the same shape works for any feed the card appears in.
-- source_id records which card it came from, which is what keeps a user from
-- saving the same dish twice.
CREATE TABLE saved_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id TEXT NOT NULL,
    dish_name TEXT NOT NULL,
    venue_name TEXT,
    city TEXT,
    cuisine TEXT,
    rating FLOAT CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    image_url TEXT,
    tags TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT saved_logs_user_source_unique UNIQUE (user_id, source_id)
);

CREATE INDEX idx_saved_logs_user_id ON saved_logs(user_id);

ALTER TABLE saved_logs ENABLE ROW LEVEL SECURITY;
