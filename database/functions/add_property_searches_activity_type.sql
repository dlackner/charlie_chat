-- Add property_searches to user_activity_counts table
-- This allows tracking of property searches for all users (especially core users)

-- Drop the existing constraint
ALTER TABLE public.user_activity_counts 
DROP CONSTRAINT user_activity_counts_activity_type_check;

-- Add the new constraint with property_searches included
ALTER TABLE public.user_activity_counts 
ADD CONSTRAINT user_activity_counts_activity_type_check 
CHECK (
  (activity_type)::text = ANY (
    ARRAY[
      'offers_created'::character varying,
      'lois_created'::character varying,
      'marketing_letters_created'::character varying,
      'emails_sent'::character varying,
      'property_searches'::character varying
    ]::text[]
  )
);