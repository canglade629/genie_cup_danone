-- @param store_id STRING
SELECT
  store_id,
  shelf_row,
  shelf_col,
  sku_name,
  manufacturer,
  brand,
  promo_tag_required,
  margin_eur,
  shelf_zone
FROM serverless_stable_6hzlm4_catalog.shelf_optimizer.planogram_slots
WHERE store_id = :store_id
ORDER BY shelf_row, shelf_col;
