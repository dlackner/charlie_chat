-- Migration 005: Update status labels to use -ing forms
-- Changes: Reviewed -> Reviewing, Communicated -> Communicating, Analyzed -> Analyzing
-- Note: This doesn't change the enum values, just the display labels in the frontend

-- Since the database stores enum values (REVIEWED, COMMUNICATED, ANALYZED)
-- and the frontend now displays them as (Reviewing, Communicating, Analyzing),
-- no database updates are actually needed.

-- However, if there are any views, stored procedures, or other places where
-- these labels are hardcoded, they should be updated here.

-- For reference, the affected enum values are:
-- REVIEWED (now displays as "Reviewing")  
-- COMMUNICATED (now displays as "Communicating")
-- ANALYZED (now displays as "Analyzing")

-- This migration serves as documentation of the label changes made in:
-- /app/my-properties/constants.ts

COMMENT ON SCHEMA public IS 'Migration 005 applied: Updated status display labels to use -ing forms';

-- Add a comment to track this migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 005: Status labels updated in frontend constants.ts';
    RAISE NOTICE 'REVIEWED -> "Reviewing", COMMUNICATED -> "Communicating", ANALYZED -> "Analyzing"';
    RAISE NOTICE 'No database schema changes required - enum values remain the same';
END $$;