-- Create property_reminders table for property note reminders
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS property_reminders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    property_id text NOT NULL,
    user_favorite_id uuid NOT NULL,
    reminder_text text NOT NULL,
    reminder_date date NOT NULL,
    original_note_text text,
    created_at timestamp with time zone DEFAULT now(),
    dismissed_at timestamp with time zone DEFAULT NULL,
    is_dismissed boolean DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_reminders_user_id ON property_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_property_reminders_property_id ON property_reminders(property_id);
CREATE INDEX IF NOT EXISTS idx_property_reminders_date ON property_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_property_reminders_active ON property_reminders(user_id, reminder_date, is_dismissed);

-- Add foreign key constraint to user_favorites (if the table exists)
-- ALTER TABLE property_reminders 
-- ADD CONSTRAINT fk_property_reminders_user_favorite 
-- FOREIGN KEY (user_favorite_id) REFERENCES user_favorites(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE property_reminders ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY IF NOT EXISTS "Users can view own reminders" ON property_reminders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own reminders" ON property_reminders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own reminders" ON property_reminders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete own reminders" ON property_reminders
    FOR DELETE USING (auth.uid() = user_id);