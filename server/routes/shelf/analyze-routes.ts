import { z } from 'zod';
import type { Application } from 'express';
import { buildAnalysis, DEMO_NOTE, VISION_NOTE, demoDetections } from '../../vision/analyze-result';

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
  score?: number;
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

const DetectionBody = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  manufacturer: z.enum(['Danone', 'Yoplait', 'Nestlé', 'Empty']),
  brand: z.string(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().positive().max(1),
  h: z.number().positive().max(1),
  score: z.number().min(0).max(1).optional(),
  shelf_zone: z.enum(['eye', 'mid', 'low']).optional(),
  margin_eur: z.number().optional(),
});

const AnalyzeBody = z.object({
  store_id: z.string().min(1),
  detections: z.array(DetectionBody).max(40).optional(),
});

export function setupShelfRoutes(appkit: AppKitWithServer) {
  appkit.server.extend((app) => {
    app.post('/api/shelf/analyze', (req, res) => {
      try {
        const parsed = AnalyzeBody.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'store_id is required' });
          return;
        }
        const { store_id, detections } = parsed.data;
        if (!detections?.length) {
          res.json(buildAnalysis(store_id, demoDetections(store_id), DEMO_NOTE));
          return;
        }

        res.json(buildAnalysis(store_id, detections, VISION_NOTE));
      } catch (err) {
        console.error('Shelf analysis failed:', err);
        res.status(500).json({ error: 'Shelf analysis failed' });
      }
    });
  });
}
