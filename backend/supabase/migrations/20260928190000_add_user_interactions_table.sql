-- User Interactions & Telemetry (Recommendation Signals) --
CREATE TABLE user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dish_id UUID REFERENCES dishes(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL,
    dwell_time_ms INTEGER DEFAULT 0,
    session_id TEXT,
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_dish_id ON user_interactions(dish_id);
CREATE INDEX idx_user_interactions_created_at ON user_interactions(created_at);

ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
