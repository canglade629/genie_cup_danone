CREATE OR REFRESH MATERIALIZED VIEW sku_lift_assumptions
COMMENT 'Synthetic commercial lift assumptions used by the recommendation simulator'
AS
SELECT *
FROM VALUES
  ('cross_merch', 'Place next to complementary category', 0.04),
  ('eye_level_move', 'Move high-margin SKU to 1.2–1.6m strike zone', 0.12),
  ('oos_restock', 'Restock empty facing before leaving store', 0.03),
  ('promo_compliance', 'Recover paid promotional display', 0.05)
AS assumptions(
  strategy_code,
  strategy_label,
  estimated_lift_pct
);
