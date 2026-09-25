-- Drafts (in-progress logs not yet published as reviews) --
CREATE TABLE drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dish_name TEXT,
    venue_name TEXT,
    city TEXT,
    cuisine TEXT,
    is_restaurant BOOLEAN DEFAULT true,
    sensory_notes TEXT,
    rating FLOAT CHECK (rating >= 1 AND rating <= 5),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;