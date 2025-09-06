-- One-time script to backfill total_decisions_made in user_markets table
-- This counts existing decisions and updates the cached counts

UPDATE user_markets 
SET total_decisions_made = COALESCE(decision_counts.count, 0),
    updated_at = NOW()
FROM (
    SELECT 
        upd.market_key,
        um.user_id,
        COUNT(*) as count
    FROM user_property_decisions upd
    INNER JOIN user_markets um ON upd.market_key = um.market_key AND upd.user_id = um.user_id
    GROUP BY upd.market_key, um.user_id
) AS decision_counts
WHERE user_markets.market_key = decision_counts.market_key 
AND user_markets.user_id = decision_counts.user_id;

-- Verify the results
SELECT 
    market_key,
    market_name,
    total_decisions_made,
    (SELECT COUNT(*) FROM user_property_decisions WHERE market_key = um.market_key AND user_id = um.user_id) as actual_count
FROM user_markets um
WHERE total_decisions_made > 0
ORDER BY total_decisions_made DESC;