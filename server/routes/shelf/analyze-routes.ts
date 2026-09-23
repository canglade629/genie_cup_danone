import { z } from 'zod';
import type { Application } from 'express';

interface AppKitWithServer {
  server: {
    extend(fn: (app: Application) => void): void;
  };
}

export type DetectionIssue = 'oos' | 'wrong_placement' | 'missing_promo_tag' | 'competitor_eye_level';

export interface ShelfDetection {
  id: string;
  label: string;
  manufacturer: 'Danone' | 'Yoplait' | 'Nestlé' | 'Empty';
  brand: string;
  x: number;
  y: number;
  w: number;
  h: number;
  issue?: DetectionIssue;
  shelf_zone?: 'eye' | 'mid' | 'low';
  margin_eur?: number;
}

export interface NextBestAction {
  recommendation_id: string;
  title: string;
  rationale: string;
  projected_lift_pct: number;
  estimated_weekly_eur: number;
  strategy_code: string;
}

export interface ShelfAnalysisResult {
  store_id: string;
  compliance_score: number;
  danone_share_pct: number;
  competitor_share_pct: number;
  oos_count: number;
  missing_promo_tags: number;
  competitor_eye_level: number;
  alerts: string[];
  detections: ShelfDetection[];
  next_best_action: NextBestAction;
  analyzed_at: string;
  note: string;
}

const AnalyzeBody = z.object({
  store_id: z.string().min(1),
});

function analyzeStore(storeId: string): ShelfAnalysisResult {
  const critical = storeId === 'FR-PAR-005' || storeId === 'FR-PAR-001';
  const baseDetections: ShelfDetection[] = [
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

  if (critical) {
    baseDetections.push({
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

  const occupied = baseDetections.filter((d) => d.manufacturer !== 'Empty');
  const danone = occupied.filter((d) => d.manufacturer === 'Danone').length;
  const competitor = occupied.length - danone;
  const total = occupied.length || 1;
  const oos_count = baseDetections.filter((d) => d.issue === 'oos').length;
  const missing_promo_tags = baseDetections.filter((d) => d.issue === 'missing_promo_tag').length;
  const competitor_eye_level = baseDetections.filter((d) => d.issue === 'competitor_eye_level').length;
  const issueCount = baseDetections.filter((d) => d.issue).length;
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
    detections: baseDetections,
    next_best_action: {
      recommendation_id: `nba-${storeId}-oikos-eyelevel`,
      title: 'Move High-Protein Oikos to eye-level',
      rationale:
        'Moving High-Protein Oikos to eye-level replaces a low-margin competitor and projects a +12% weekly sales lift. Accept recommendation?',
      projected_lift_pct: 12,
      estimated_weekly_eur: critical ? 2140 : 1840,
      strategy_code: 'eye_level_move',
    },
    analyzed_at: new Date().toISOString(),
    note: 'Demo vision pipeline — swap for Model Serving (multimodal LLM / YOLO) in production.',
  };
}

export function setupShelfRoutes(appkit: AppKitWithServer) {
  appkit.server.extend((app) => {
    app.post('/api/shelf/analyze', async (req, res) => {
      try {
        const parsed = AnalyzeBody.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'store_id is required' });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
        res.json(analyzeStore(parsed.data.store_id));
      } catch (err) {
        console.error('Shelf analysis failed:', err);
        res.status(500).json({ error: 'Shelf analysis failed' });
      }
    });
  });
}
