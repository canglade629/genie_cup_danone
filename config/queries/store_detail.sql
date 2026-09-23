-- @param store_id STRING
SELECT
  store_id,
  store_name,
  city,
  format,
  retailer,
  lat,
  lng,
  priority_score,
  priority_tier,
  situation_summary,
  danone_sos_pct,
  compliance_pct,
  weekly_sales_eur
FROM serverless_stable_6hzlm4_catalog.shelf_optimizer.stores
WHERE store_id = :store_id
LIMIT 1;
