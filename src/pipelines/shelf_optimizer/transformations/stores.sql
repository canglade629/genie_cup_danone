CREATE OR REFRESH MATERIALIZED VIEW stores
COMMENT 'Synthetic Paris retail stores used by the Shelf Optimizer demo'
AS
SELECT *
FROM VALUES
  ('FR-PAR-001', 'Carrefour Hyper Porte de Versailles', 'Paris 15e', 'Hypermarket', 'Carrefour', 48.8322, 2.2870, 92, 'critical', '3 OOS voids + Yoplait owns eye-level. Restock and reclaim strike zone today.', 0.48, 61, 12400),
  ('FR-PAR-002', 'Monoprix Opéra', 'Paris 2e', 'Supermarket', 'Monoprix', 48.8710, 2.3320, 58, 'medium', 'SoS healthy but missing 2 promo tags on Activia end-cap.', 0.62, 78, 6800),
  ('FR-PAR-003', 'Franprix Bastille', 'Paris 11e', 'Convenience', 'Franprix', 48.8532, 2.3691, 81, 'high', 'Trade-spend risk: paid end-cap not deployed. Compliance score 54%.', 0.55, 54, 4100),
  ('FR-PAR-004', 'Carrefour City Châtelet', 'Paris 1er', 'Convenience', 'Carrefour', 48.8606, 2.3470, 28, 'low', 'Planogram largely compliant. Opportunity: cross-merch with granola.', 0.71, 88, 3200),
  ('FR-PAR-005', 'Auchan Express Nation', 'Paris 12e', 'Convenience', 'Auchan', 48.8484, 2.3960, 96, 'critical', 'Walk-away risk: 4 empty facings on Actimel/Oikos. Priority restock.', 0.41, 49, 3900),
  ('FR-PAR-006', 'Casino Raspail', 'Paris 6e', 'Supermarket', 'Casino', 48.8420, 2.3270, 64, 'medium', 'Competitor Nestlé gained 2 facings vs last visit. Defend Oikos block.', 0.57, 72, 5400),
  ('FR-PAR-007', 'Carrefour Market République', 'Paris 11e', 'Supermarket', 'Carrefour', 48.8675, 2.3631, 77, 'high', 'Premium yogurts below knee-level. Eye-level move projects +12% SKU lift.', 0.53, 66, 7100),
  ('FR-PAR-008', 'Monoprix Montparnasse', 'Paris 14e', 'Supermarket', 'Monoprix', 48.8422, 2.3219, 35, 'low', 'Stable store. Good SoS. Optional cross-merch with fresh berries.', 0.68, 91, 5600)
AS stores(
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
);
