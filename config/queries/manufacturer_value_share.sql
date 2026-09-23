-- @param country STRING
-- @param period_short STRING
SELECT
  manufacturer,
  ROUND(SUM(value_sales_1000), 1) AS value_sales_k_eur,
  ROUND(
    100.0 * SUM(value_sales_1000) / SUM(SUM(value_sales_1000)) OVER (),
    1
  ) AS value_share_pct
FROM serverless_stable_6hzlm4_catalog.sellout.sellout_sales
WHERE country = :country
  AND period_short = :period_short
  AND business = 'DAIRY'
GROUP BY manufacturer
ORDER BY value_sales_k_eur DESC
LIMIT 8;
