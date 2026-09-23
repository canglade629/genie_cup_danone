SELECT
  s.signal_id,
  s.store_id,
  st.store_name,
  st.city,
  s.source_name,
  s.signal_type,
  s.signal_summary,
  s.valid_from,
  s.valid_to,
  s.signal_score,
  s.demand_theme,
  s.recommended_action,
  s.expected_impact,
  s.urgency
FROM serverless_stable_6hzlm4_catalog.shelf_optimizer.external_signals s
JOIN serverless_stable_6hzlm4_catalog.shelf_optimizer.stores st
  ON s.store_id = st.store_id
ORDER BY s.signal_score DESC;
