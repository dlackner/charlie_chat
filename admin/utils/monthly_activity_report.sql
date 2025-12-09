-- Monthly Activity Report for User Analysis
-- 
-- This query provides a comprehensive overview of user activity and engagement
-- combining data from multiple sources to analyze user behavior patterns.
--
-- Data Sources:
-- - profiles: User information (email, user_class)
-- - auth.users: Authentication data (last_sign_in_at)
-- - user_activity_counts: Activity metrics (past 30 days only)
-- - user_favorites: Property favorites data (all time)
--
-- Metrics Included:
-- - Activity counts by type (searches, offers, LOIs, marketing letters, emails)
-- - Total activity count and last activity date (past 30 days)
-- - Manual vs algorithm-driven favorites counts (all time)
-- - Most recent sign-in timestamp
--
-- Use Cases:
-- - Monthly user engagement reports
-- - Identifying most/least active users
-- - Understanding user behavior patterns
-- - Analyzing effectiveness of recommendation algorithms vs manual curation
--
-- Results ordered by: Total activity (descending), User class, Email

WITH activity_summary AS (
  SELECT 
    user_id,
    SUM(CASE WHEN activity_type = 'property_searches' THEN count END) as property_searches,
    SUM(CASE WHEN activity_type = 'offers_created' THEN count END) as offers_created,
    SUM(CASE WHEN activity_type = 'lois_created' THEN count END) as lois_created,
    SUM(CASE WHEN activity_type = 'marketing_letters_created' THEN count END) as marketing_letters_created,
    SUM(CASE WHEN activity_type = 'emails_sent' THEN count END) as emails_sent,
    SUM(count) as total_activity,
    MAX(activity_date) as last_activity_date
  FROM user_activity_counts
  WHERE activity_date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY user_id
),
favorites_summary AS (
  SELECT 
    user_id,
    COUNT(CASE WHEN recommendation_type = 'manual' THEN 1 END) as manual_favorites,
    COUNT(CASE WHEN recommendation_type = 'algorithm' THEN 1 END) as algorithm_favorites,
    COUNT(id) as total_favorites
  FROM user_favorites
  GROUP BY user_id
)
SELECT 
  COALESCE(p.email, au.email) as email,
  COALESCE(p.user_class, 'no_profile') as user_class,
  au.last_sign_in_at,
  COALESCE(act.property_searches, 0) as property_searches,
  COALESCE(act.offers_created, 0) as offers_created,
  COALESCE(act.lois_created, 0) as lois_created,
  COALESCE(act.marketing_letters_created, 0) as marketing_letters_created,
  COALESCE(act.emails_sent, 0) as emails_sent,
  COALESCE(act.total_activity, 0) as total_activity,
  act.last_activity_date,
  COALESCE(fav.manual_favorites, 0) as manual_favorites,
  COALESCE(fav.algorithm_favorites, 0) as algorithm_favorites,
  COALESCE(fav.total_favorites, 0) as total_favorites
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
LEFT JOIN activity_summary act ON au.id = act.user_id
LEFT JOIN favorites_summary fav ON au.id = fav.user_id
ORDER BY total_activity DESC, user_class, email;