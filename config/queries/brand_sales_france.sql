SELECT
  platform_brand AS brand,
  ROUND(SUM(value_sales_1000), 1) AS value_sales_k_eur,
  ROUND(SUM(incremental_value_1000), 1) AS incremental_value_k_eur
FROM serverless_stable_6hzlm4_catalog.sellout.sellout_sales
WHERE country = 'France'
  AND period_short = 'MAT'
  AND manufacturer = 'Danone'
  AND business = 'DAIRY'
GROUP BY platform_brand
ORDER BY value_sales_k_eur DESC
LIMIT 10;
