-- @param store_id STRING
SELECT
  CASE
    WHEN manufacturer = 'Danone' THEN 'Danone'
    ELSE 'Competitor'
  END AS segment,
  COUNT(*) AS facings,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS share_pct
FROM serverless_stable_6hzlm4_catalog.shelf_optimizer.planogram_slots
WHERE store_id = :store_id
GROUP BY 1
ORDER BY segment;
