SELECT
  strategy_code,
  strategy_label,
  ROUND(estimated_lift_pct * 100, 1) AS estimated_lift_pct
FROM serverless_stable_6hzlm4_catalog.shelf_optimizer.sku_lift_assumptions
ORDER BY estimated_lift_pct DESC;
