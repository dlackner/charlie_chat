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

SELECT 
  p.email,
  p.user_class,
  au.last_sign_in_at,
  COALESCE(SUM(CASE WHEN uac.activity_type = 'property_searches' THEN uac.count END), 0) as property_searches,
  COALESCE(SUM(CASE WHEN uac.activity_type = 'offers_created' THEN uac.count END), 0) as offers_created,
  COALESCE(SUM(CASE WHEN uac.activity_type = 'lois_created' THEN uac.count END), 0) as lois_created,
  COALESCE(SUM(CASE WHEN uac.activity_type = 'marketing_letters_created' THEN uac.count END), 0) as marketing_letters_created,
  COALESCE(SUM(CASE WHEN uac.activity_type = 'emails_sent' THEN uac.count END), 0) as emails_sent,
  COALESCE(SUM(uac.count), 0) as total_activity,
  MAX(uac.activity_date) as last_activity_date,
  COALESCE(COUNT(CASE WHEN uf.recommendation_type = 'manual' THEN 1 END), 0) as manual_favorites,
  COALESCE(COUNT(CASE WHEN uf.recommendation_type = 'algorithm' THEN 1 END), 0) as algorithm_favorites,
  COALESCE(COUNT(uf.id), 0) as total_favorites
FROM profiles p
LEFT JOIN auth.users au ON p.user_id = au.id
LEFT JOIN user_activity_counts uac ON p.user_id = uac.user_id
  AND uac.activity_date >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN user_favorites uf ON p.user_id = uf.user_id
GROUP BY p.user_id, p.email, p.user_class, au.last_sign_in_at
ORDER BY total_activity DESC, p.user_class, p.email;