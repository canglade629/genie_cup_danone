-- @param store_id STRING
SELECT
  signal_id,
  store_id,
  source_name,
  signal_type,
  signal_summary,
  valid_from,
  valid_to,
  signal_score,
  demand_theme,
  recommended_action,
  expected_impact,
  urgency
FROM serverless_stable_6hzlm4_catalog.shelf_optimizer.external_signals
WHERE store_id = :store_id
ORDER BY signal_score DESC;
