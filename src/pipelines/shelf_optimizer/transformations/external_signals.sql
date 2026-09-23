CREATE OR REFRESH MATERIALIZED VIEW external_signals
COMMENT 'Synthetic local demand signals that explain store-level assortment opportunities'
AS
SELECT
  signal_id,
  store_id,
  source_name,
  signal_type,
  signal_summary,
  CAST(valid_from AS DATE) AS valid_from,
  CAST(valid_to AS DATE) AS valid_to,
  signal_score,
  demand_theme,
  recommended_action,
  expected_impact,
  urgency
FROM VALUES
  ('SIG-001', 'FR-PAR-001', 'Strava Metro', 'fitness_activity', 'Running & cycling activity +38% vs 4-week baseline within 1 km', '2026-09-22', '2026-10-06', 94, 'high_protein', 'Add 2 Oikos High Protein facings at eye-level; cross-merch with granola', '+10–15% lift on relocated protein SKUs', 'High'),
  ('SIG-002', 'FR-PAR-005', 'Strava Metro', 'fitness_activity', 'Evening run activity +51%; new running club meets 300m from store', '2026-09-21', '2026-10-20', 98, 'high_protein', 'Increase single-serve Oikos and Actimel availability before 18:00', '+12% high-protein SKU lift; reduce OOS risk', 'High'),
  ('SIG-003', 'FR-PAR-007', 'ClassPass / local gyms', 'fitness_activity', 'New gym opening and class bookings +27% in République catchment', '2026-09-20', '2026-10-31', 88, 'high_protein', 'Move Oikos HP from low shelf to eye-level; add recovery occasion signage', '10–15% lift on relocated SKUs', 'High'),
  ('SIG-004', 'FR-PAR-002', 'Météo-France', 'weather', 'Forecast 29°C heat spike for 4 days', '2026-09-24', '2026-09-28', 82, 'hydration', 'Increase chilled Volvic and drinkable yogurt facings; verify cold stock', '2–4% OOS recovery + heat-driven demand', 'Medium'),
  ('SIG-005', 'FR-PAR-004', 'Paris Events', 'sports_event', '10 km race finishing near Châtelet this weekend; 12k participants', '2026-09-26', '2026-09-27', 90, 'high_protein', 'Build temporary protein + hydration block; add impulse single-serves', 'Basket-size uplift via protein + hydration pairing', 'High'),
  ('SIG-006', 'FR-PAR-006', 'RATP footfall', 'mobility', 'Raspail exits +23% during morning commute after nearby line works', '2026-09-22', '2026-10-02', 76, 'on_the_go', 'Shift mix toward single-serve Actimel, Oikos cups, and water', 'More grab-and-go conversion; protect availability', 'Medium'),
  ('SIG-007', 'FR-PAR-003', 'Retail media / promo intel', 'competitor', 'Yoplait digital coupon campaign active within 2 km', '2026-09-19', '2026-10-05', 91, 'defense', 'Defend eye-level block; verify Activia promotional tags and end-cap', 'Trade-spend ROI recovery + share defense', 'High'),
  ('SIG-008', 'FR-PAR-008', 'Local basket panel', 'cross_merch', 'Granola sales +19% and fresh berries +14% in local baskets', '2026-09-15', '2026-10-15', 69, 'cross_merch', 'Place Oikos/Activia adjacent to granola or add aisle signposting', 'Basket-size uplift from complementary pairing', 'Medium'),
  ('SIG-009', 'FR-PAR-002', 'Office occupancy', 'workplace', 'Office attendance forecast +18% Tue–Thu in Opéra district', '2026-09-22', '2026-10-15', 71, 'on_the_go', 'Increase single-serve breakfast and lunch SKUs Tue–Thu', 'More weekday impulse conversion', 'Medium'),
  ('SIG-010', 'FR-PAR-001', 'Search trends', 'consumer_interest', '“high protein yogurt” searches +32% in Paris 15e', '2026-09-18', '2026-10-18', 86, 'high_protein', 'Expand Oikos HP assortment and attach protein claim shelf tags', 'Demand-aligned mix; 10–15% relocated SKU lift', 'High'),
  ('SIG-011', 'FR-PAR-003', 'School calendar', 'family', 'School reopening lifts family shopping missions in Bastille catchment', '2026-09-01', '2026-10-10', 62, 'family', 'Increase Activia multipacks; protect afternoon availability', 'Lower OOS and higher basket value', 'Medium'),
  ('SIG-012', 'FR-PAR-006', 'Tourism footfall', 'tourism', 'Hotel occupancy +16% near Montparnasse/Raspail corridor', '2026-09-20', '2026-10-05', 64, 'on_the_go', 'Increase recognizable brands and single-serve chilled formats', 'Grab-and-go basket uplift', 'Medium')
AS signals(
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
);
