-- Task#1056: Add meal_type to reviews and drafts --
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS meal_type TEXT;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS meal_type TEXT;
