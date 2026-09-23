import type {
  DetectionIssue,
  NextBestAction,
  ShelfAnalysisResult,
  ShelfDetection,
} from '../routes/shelf/analyze-routes';

export const DEMO_NOTE = 'No shelf image provided — upload a photo to run TensorFlow.js COCO-SSD.';
export const VISION_NOTE =
  'TensorFlow.js COCO-SSD detections on the selected photo. Production can swap in Model Serving (YOLO / multimodal).';
export const FALLBACK_NOTE = 'COCO-SSD unavailable; annotations come from color/grid analysis of the photo pixels.';

export function demoDetections(storeId: string): ShelfDetection[] {
  const detections: ShelfDetection[] = [
    {
      id: 'd1',
      label: 'Activia Nature',
      manufacturer: 'Danone',
      brand: 'Activia',
      x: 0.04,
      y: 0.08,
      w: 0.2,
      h: 0.22,
      issue: 'wrong_placement',
      shelf_zone: 'eye',
      margin_eur: 0.28,
    },
    {
      id: 'd2',
      label: 'Yoplait Skyr',
      manufacturer: 'Yoplait',
      brand: 'Yoplait',
      x: 0.28,
      y: 0.08,
      w: 0.22,
      h: 0.22,
      issue: 'competitor_eye_level',
      shelf_zone: 'eye',
      margin_eur: 0.22,
    },
    {
      id: 'd3',
      label: 'Oikos HP Natural',
      manufacturer: 'Danone',
      brand: 'Oikos',
      x: 0.54,
      y: 0.08,
      w: 0.2,
      h: 0.22,
      shelf_zone: 'eye',
      margin_eur: 0.42,
    },
    {
      id: 'd4',
      label: 'Nestlé Ski',
      manufacturer: 'Nestlé',
      brand: 'Ski',
      x: 0.78,
      y: 0.1,
      w: 0.18,
      h: 0.2,
      issue: 'missing_promo_tag',
      shelf_zone: 'eye',
      margin_eur: 0.15,
    },
    {
      id: 'd5',
      label: 'Actimel',
      manufacturer: 'Danone',
      brand: 'Actimel',
      x: 0.04,
      y: 0.4,
      w: 0.22,
      h: 0.24,
      shelf_zone: 'mid',
      margin_eur: 0.31,
    },
    {
      id: 'd6',
      label: 'OOS void',
      manufacturer: 'Empty',
      brand: '—',
      x: 0.3,
      y: 0.42,
      w: 0.2,
      h: 0.22,
      issue: 'oos',
      shelf_zone: 'mid',
      margin_eur: 0,
    },
    {
      id: 'd7',
      label: 'Volvic',
      manufacturer: 'Danone',
      brand: 'Volvic',
      x: 0.54,
      y: 0.4,
      w: 0.2,
      h: 0.24,
      shelf_zone: 'mid',
      margin_eur: 0.18,
    },
    {
      id: 'd8',
      label: 'Activia Fruits',
      manufacturer: 'Danone',
      brand: 'Activia',
      x: 0.78,
      y: 0.4,
      w: 0.18,
      h: 0.24,
      issue: 'missing_promo_tag',
      shelf_zone: 'mid',
      margin_eur: 0.26,
    },
    {
      id: 'd9',
      label: 'Oikos Triple Zero',
      manufacturer: 'Danone',
      brand: 'Oikos',
      x: 0.08,
      y: 0.72,
      w: 0.28,
      h: 0.22,
      shelf_zone: 'low',
      margin_eur: 0.38,
    },
    {
      id: 'd10',
      label: 'Yoplait Promo',
      manufacturer: 'Yoplait',
      brand: 'Yoplait',
      x: 0.42,
      y: 0.72,
      w: 0.24,
      h: 0.22,
      shelf_zone: 'low',
      margin_eur: 0.12,
    },
    {
      id: 'd11',
      label: 'Activia Drink',
      manufacturer: 'Danone',
      brand: 'Activia',
      x: 0.7,
      y: 0.72,
      w: 0.24,
      h: 0.22,
      shelf_zone: 'low',
      margin_eur: 0.29,
    },
  ];

  if (storeId === 'FR-PAR-005' || storeId === 'FR-PAR-001') {
    detections.push({
      id: 'd12',
      label: 'OOS void',
      manufacturer: 'Empty',
      brand: '—',
      x: 0.04,
      y: 0.72,
      w: 0.12,
      h: 0.2,
      issue: 'oos',
      shelf_zone: 'low',
      margin_eur: 0,
    });
  }

  return detections;
}

export function shelfZone(y: number, h: number): 'eye' | 'mid' | 'low' {
  const mid = y + h / 2;
  if (mid < 0.34) return 'eye';
  if (mid < 0.67) return 'mid';
  return 'low';
}

export function annotateIssues(detections: ShelfDetection[]): ShelfDetection[] {
  return detections.map((d) => {
    const zone = d.shelf_zone ?? shelfZone(d.y, d.h);
    let issue: DetectionIssue | undefined;
    if (d.manufacturer === 'Empty') issue = 'oos';
    else if (d.manufacturer !== 'Danone' && zone === 'eye') issue = 'competitor_eye_level';
    else if (d.manufacturer !== 'Danone' && zone === 'mid') issue = 'missing_promo_tag';
    else if (d.manufacturer === 'Danone' && d.brand === 'Oikos' && zone === 'low') issue = 'wrong_placement';
    return { ...d, shelf_zone: zone, issue };
  });
}

export function nextBestAction(storeId: string, detections: ShelfDetection[]): NextBestAction {
  const critical = storeId === 'FR-PAR-005' || storeId === 'FR-PAR-001';
  const oos = detections.filter((d) => d.issue === 'oos').length;
  const competitorEye = detections.filter((d) => d.issue === 'competitor_eye_level').length;

  if (oos > 0) {
    return {
      recommendation_id: `nba-${storeId}-restock`,
      title: 'Restock empty facings from the backroom',
      rationale: `${oos} out-of-stock facing(s) detected on the photo. Filling voids typically recovers 2–4% of weekly sales.`,
      projected_lift_pct: Math.min(4, oos * 1.5),
      estimated_weekly_eur: critical ? 980 : 720,
      strategy_code: 'restock_oos',
    };
  }

  if (competitorEye > 0) {
    return {
      recommendation_id: `nba-${storeId}-oikos-eyelevel`,
      title: 'Move High-Protein Oikos to eye-level',
      rationale:
        'Moving High-Protein Oikos to eye-level replaces a low-margin competitor and projects a +12% weekly sales lift. Accept recommendation?',
      projected_lift_pct: 12,
      estimated_weekly_eur: critical ? 2140 : 1840,
      strategy_code: 'eye_level_move',
    };
  }

  return {
    recommendation_id: `nba-${storeId}-promo`,
    title: 'Verify paid promo tags on competitor-adjacent facings',
    rationale:
      'Photo analysis found limited execution gaps. Confirm promotional tags so trade-spend is visible on shelf.',
    projected_lift_pct: 3,
    estimated_weekly_eur: 410,
    strategy_code: 'promo_tag',
  };
}

export function buildAnalysis(storeId: string, detections: ShelfDetection[], note: string): ShelfAnalysisResult {
  const annotated = annotateIssues(detections);
  const occupied = annotated.filter((d) => d.manufacturer !== 'Empty');
  const danone = occupied.filter((d) => d.manufacturer === 'Danone').length;
  const competitor = occupied.length - danone;
  const total = occupied.length || 1;
  const oos_count = annotated.filter((d) => d.issue === 'oos').length;
  const missing_promo_tags = annotated.filter((d) => d.issue === 'missing_promo_tag').length;
  const competitor_eye_level = annotated.filter((d) => d.issue === 'competitor_eye_level').length;
  const issueCount = annotated.filter((d) => d.issue).length;
  const compliance_score = Math.max(40, 100 - issueCount * 9);

  const alerts: string[] = [];
  if (oos_count > 0) {
    alerts.push(
      `${oos_count} out-of-stock facing(s) — restock from backroom before leaving (2–4% sales lift at risk).`
    );
  }
  if (competitor_eye_level > 0) {
    alerts.push(
      `${competitor_eye_level} competitor SKU(s) at eye-level — reclaim the 1.2–1.6m strike zone (+10–15% SKU lift).`
    );
  }
  if (missing_promo_tags > 0) {
    alerts.push(`${missing_promo_tags} missing promo tag(s) — trade-spend compliance gap.`);
  }

  return {
    store_id: storeId,
    compliance_score,
    danone_share_pct: Math.round((1000 * danone) / total) / 10,
    competitor_share_pct: Math.round((1000 * competitor) / total) / 10,
    oos_count,
    missing_promo_tags,
    competitor_eye_level,
    alerts,
    detections: annotated,
    next_best_action: nextBestAction(storeId, annotated),
    analyzed_at: new Date().toISOString(),
    note,
  };
}
