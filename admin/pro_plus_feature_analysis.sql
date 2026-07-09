-- Pro & Plus User Feature Usage Analysis
--
-- Shows which features paid (pro/plus) users are actually using.
-- Run in Supabase SQL editor.
--
-- NOTE on search tracking: property_searches in user_activity_counts is unreliable.
-- saved_properties is a shared property data table keyed on property_id (no user_id).
-- user_favorites is the authoritative source for user-property engagement.
--
-- Tables used:
--   profiles             - user_class, email, created_at
--   user_activity_counts - offers/LOIs/letters/emails (tracked reliably via incrementActivityCount)
--   user_favorites       - manual vs algorithm favorites (all-time)
--   saved_searches       - buy box saved searches (all-time)
--   offer_scenarios      - offer creation (all-time)
--   submissions          - fund/LOI submissions (all-time)
--   chat_threads         - AI coach conversations (all-time)
--   chat_attachments     - AI coach file uploads (all-time)
--   user_markets         - market selections (all-time)

-- ============================================================
-- QUERY 1: Per-user feature usage summary (pro + plus)
-- ============================================================
WITH target_users AS (
  SELECT user_id, email, user_class, created_at
  FROM profiles
  WHERE user_class IN ('pro', 'plus')
    AND email NOT IN ('dlackner@hotmail.com', 'info@multifamilyinvestingacademy.com')
),

activity AS (
  SELECT
    user_id,
    SUM(CASE WHEN activity_type = 'offers_created'            THEN count ELSE 0 END) AS offers_created,
    SUM(CASE WHEN activity_type = 'lois_created'              THEN count ELSE 0 END) AS lois_created,
    SUM(CASE WHEN activity_type = 'marketing_letters_created' THEN count ELSE 0 END) AS marketing_letters,
    SUM(CASE WHEN activity_type = 'emails_sent'               THEN count ELSE 0 END) AS emails_sent,
    MAX(activity_date) AS last_active_date
  FROM user_activity_counts
  GROUP BY user_id
),

favorites AS (
  SELECT
    user_id,
    COUNT(*)                                                       AS total_favorites,
    COUNT(CASE WHEN recommendation_type = 'manual'    THEN 1 END) AS manual_favorites,
    COUNT(CASE WHEN recommendation_type = 'algorithm' THEN 1 END) AS algo_favorites
  FROM user_favorites
  GROUP BY user_id
),

buybox AS (
  SELECT user_id, COUNT(*) AS saved_searches
  FROM saved_searches
  GROUP BY user_id
),

offers AS (
  SELECT user_id, COUNT(*) AS offer_scenarios
  FROM offer_scenarios
  GROUP BY user_id
),

subs AS (
  SELECT user_id, COUNT(*) AS fund_submissions
  FROM submissions
  GROUP BY user_id
),

coach AS (
  SELECT user_id, COUNT(*) AS ai_coach_threads
  FROM chat_threads
  GROUP BY user_id
),

attachments AS (
  SELECT user_id, COUNT(*) AS ai_coach_uploads
  FROM chat_attachments
  GROUP BY user_id
),

markets AS (
  SELECT user_id, COUNT(*) AS markets_selected
  FROM user_markets
  GROUP BY user_id
)

SELECT
  u.email,
  u.user_class,
  DATE(u.created_at)                          AS member_since,
  -- Discover engagement (user_favorites is the authoritative user-property signal)
  COALESCE(f.total_favorites, 0)              AS total_favorites,
  COALESCE(f.manual_favorites, 0)             AS manual_favorites,
  COALESCE(f.algo_favorites, 0)               AS algo_rec_favorites,
  COALESCE(bb.saved_searches, 0)              AS buybox_saved_searches,
  COALESCE(m.markets_selected, 0)             AS markets_selected,
  -- Engage / Outreach (tracked via incrementActivityCount)
  COALESCE(o.offer_scenarios, 0)              AS offer_scenarios_created,
  COALESCE(a.lois_created, 0)                 AS lois_created,
  COALESCE(a.marketing_letters, 0)            AS marketing_letters_created,
  COALESCE(a.emails_sent, 0)                  AS emails_sent,
  -- Fund / Submissions
  COALESCE(su.fund_submissions, 0)            AS fund_submissions,
  -- AI Coach
  COALESCE(c.ai_coach_threads, 0)             AS ai_coach_threads,
  COALESCE(att.ai_coach_uploads, 0)           AS ai_coach_file_uploads,
  -- Last tracked activity date
  a.last_active_date
FROM target_users u
LEFT JOIN activity    a   ON u.user_id = a.user_id
LEFT JOIN favorites   f   ON u.user_id = f.user_id
LEFT JOIN buybox      bb  ON u.user_id = bb.user_id
LEFT JOIN offers      o   ON u.user_id = o.user_id
LEFT JOIN subs        su  ON u.user_id = su.user_id
LEFT JOIN coach       c   ON u.user_id = c.user_id
LEFT JOIN attachments att ON u.user_id = att.user_id
LEFT JOIN markets     m   ON u.user_id = m.user_id
ORDER BY u.user_class, COALESCE(a.last_active_date, '1970-01-01') DESC;


-- ============================================================
-- QUERY 2: Feature adoption rates by plan (% of users who used each feature)
-- ============================================================
WITH target_users AS (
  SELECT user_id, user_class
  FROM profiles
  WHERE user_class IN ('pro', 'plus')
    AND email NOT IN ('dlackner@hotmail.com', 'info@multifamilyinvestingacademy.com')
),

activity AS (
  SELECT user_id,
    MAX(CASE WHEN activity_type = 'offers_created'            THEN 1 ELSE 0 END) AS did_offer,
    MAX(CASE WHEN activity_type = 'lois_created'              THEN 1 ELSE 0 END) AS did_loi,
    MAX(CASE WHEN activity_type = 'marketing_letters_created' THEN 1 ELSE 0 END) AS did_letter,
    MAX(CASE WHEN activity_type = 'emails_sent'               THEN 1 ELSE 0 END) AS did_email
  FROM user_activity_counts
  GROUP BY user_id
),

favs AS (
  SELECT user_id, 1 AS did_favorite
  FROM user_favorites
  GROUP BY user_id
),

bb AS (
  SELECT user_id, 1 AS did_buybox
  FROM saved_searches
  GROUP BY user_id
),

ofs AS (
  SELECT user_id, 1 AS did_offer_scenario
  FROM offer_scenarios
  GROUP BY user_id
),

subs AS (
  SELECT user_id, 1 AS did_fund
  FROM submissions
  GROUP BY user_id
),

coach AS (
  SELECT user_id, 1 AS did_ai_coach
  FROM chat_threads
  GROUP BY user_id
),

att AS (
  SELECT user_id, 1 AS did_upload
  FROM chat_attachments
  GROUP BY user_id
),

markets AS (
  SELECT user_id, 1 AS did_market
  FROM user_markets
  GROUP BY user_id
),

combined AS (
  SELECT
    u.user_class,
    COUNT(DISTINCT u.user_id)                                                        AS total_users,
    COUNT(DISTINCT CASE WHEN COALESCE(f.did_favorite, 0)      = 1 THEN u.user_id END) AS favorited,
    COUNT(DISTINCT CASE WHEN COALESCE(b.did_buybox, 0)        = 1 THEN u.user_id END) AS used_buybox,
    COUNT(DISTINCT CASE WHEN COALESCE(m.did_market, 0)        = 1 THEN u.user_id END) AS selected_market,
    COUNT(DISTINCT CASE WHEN COALESCE(o.did_offer_scenario, 0)= 1 THEN u.user_id END) AS created_offer,
    COUNT(DISTINCT CASE WHEN COALESCE(a.did_loi, 0)           = 1 THEN u.user_id END) AS created_loi,
    COUNT(DISTINCT CASE WHEN COALESCE(a.did_letter, 0)        = 1 THEN u.user_id END) AS created_letter,
    COUNT(DISTINCT CASE WHEN COALESCE(a.did_email, 0)         = 1 THEN u.user_id END) AS sent_email,
    COUNT(DISTINCT CASE WHEN COALESCE(sb.did_fund, 0)         = 1 THEN u.user_id END) AS submitted_fund,
    COUNT(DISTINCT CASE WHEN COALESCE(c.did_ai_coach, 0)      = 1 THEN u.user_id END) AS used_ai_coach,
    COUNT(DISTINCT CASE WHEN COALESCE(at.did_upload, 0)       = 1 THEN u.user_id END) AS uploaded_to_coach
  FROM target_users u
  LEFT JOIN activity  a   ON u.user_id = a.user_id
  LEFT JOIN favs      f   ON u.user_id = f.user_id
  LEFT JOIN bb        b   ON u.user_id = b.user_id
  LEFT JOIN ofs       o   ON u.user_id = o.user_id
  LEFT JOIN subs      sb  ON u.user_id = sb.user_id
  LEFT JOIN coach     c   ON u.user_id = c.user_id
  LEFT JOIN att       at  ON u.user_id = at.user_id
  LEFT JOIN markets   m   ON u.user_id = m.user_id
  GROUP BY u.user_class
)

SELECT
  user_class,
  total_users,
  ROUND(100.0 * favorited         / NULLIF(total_users,0), 1) AS pct_favorited,
  ROUND(100.0 * used_buybox       / NULLIF(total_users,0), 1) AS pct_used_buybox,
  ROUND(100.0 * selected_market   / NULLIF(total_users,0), 1) AS pct_selected_market,
  ROUND(100.0 * created_offer     / NULLIF(total_users,0), 1) AS pct_created_offer,
  ROUND(100.0 * created_loi       / NULLIF(total_users,0), 1) AS pct_created_loi,
  ROUND(100.0 * created_letter    / NULLIF(total_users,0), 1) AS pct_created_letter,
  ROUND(100.0 * sent_email        / NULLIF(total_users,0), 1) AS pct_sent_email,
  ROUND(100.0 * submitted_fund    / NULLIF(total_users,0), 1) AS pct_submitted_fund,
  ROUND(100.0 * used_ai_coach     / NULLIF(total_users,0), 1) AS pct_used_ai_coach,
  ROUND(100.0 * uploaded_to_coach / NULLIF(total_users,0), 1) AS pct_uploaded_to_coach
FROM combined
ORDER BY user_class;


-- ============================================================
-- QUERY 3: Average activity depth per plan
-- ============================================================
WITH target_users AS (
  SELECT user_id, user_class
  FROM profiles
  WHERE user_class IN ('pro', 'plus')
    AND email NOT IN ('dlackner@hotmail.com', 'info@multifamilyinvestingacademy.com')
),

activity AS (
  SELECT user_id,
    SUM(CASE WHEN activity_type = 'offers_created'            THEN count ELSE 0 END) AS offers_created,
    SUM(CASE WHEN activity_type = 'lois_created'              THEN count ELSE 0 END) AS lois_created,
    SUM(CASE WHEN activity_type = 'marketing_letters_created' THEN count ELSE 0 END) AS marketing_letters,
    SUM(CASE WHEN activity_type = 'emails_sent'               THEN count ELSE 0 END) AS emails_sent
  FROM user_activity_counts
  GROUP BY user_id
),

favorites AS (
  SELECT user_id, COUNT(*) AS total_favorites
  FROM user_favorites GROUP BY user_id
),

buybox AS (
  SELECT user_id, COUNT(*) AS saved_searches
  FROM saved_searches GROUP BY user_id
),

coach AS (
  SELECT user_id, COUNT(*) AS ai_coach_threads
  FROM chat_threads GROUP BY user_id
)

SELECT
  u.user_class,
  COUNT(DISTINCT u.user_id)                                  AS total_users,
  ROUND(AVG(COALESCE(f.total_favorites, 0)), 1)              AS avg_favorites,
  ROUND(AVG(COALESCE(bb.saved_searches, 0)), 1)              AS avg_buybox_searches,
  ROUND(AVG(COALESCE(a.offers_created, 0)), 1)               AS avg_offers,
  ROUND(AVG(COALESCE(a.lois_created, 0)), 1)                 AS avg_lois,
  ROUND(AVG(COALESCE(a.marketing_letters, 0)), 1)            AS avg_marketing_letters,
  ROUND(AVG(COALESCE(a.emails_sent, 0)), 1)                  AS avg_emails,
  ROUND(AVG(COALESCE(c.ai_coach_threads, 0)), 1)             AS avg_coach_threads
FROM target_users u
LEFT JOIN activity   a  ON u.user_id = a.user_id
LEFT JOIN favorites  f  ON u.user_id = f.user_id
LEFT JOIN buybox     bb ON u.user_id = bb.user_id
LEFT JOIN coach      c  ON u.user_id = c.user_id
GROUP BY u.user_class
ORDER BY u.user_class;
