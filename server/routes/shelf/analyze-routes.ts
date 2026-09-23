import { getWorkspaceClient } from '@databricks/appkit';
import type { Application } from 'express';
import { z } from 'zod';
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

const ModelDetection = z.object({
  label: z.string().min(1),
  manufacturer: z.string(),
  brand: z.string().default('Unknown'),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  score: z.number().min(0).max(1).optional(),
});

const AnalyzeBody = z.object({
  store_id: z.string().min(1),
  image_data: z.string().startsWith('data:image/').max(90_000).optional(),
});

const ModelResponse = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string() }),
    }),
  ),
});

const DetectionResponse = z.object({
  detections: z.array(ModelDetection).max(30),
});

const DETECTION_PROMPT = `Analyze this retail yogurt shelf image. Return only valid JSON, with no markdown:
{"detections":[{"label":"product or empty-space description","manufacturer":"Danone|Yoplait|Nestlé|Empty","brand":"brand name","x":0,"y":0,"w":0,"h":0,"score":0.0}]}

Detect distinct product facings or grouped adjacent facings and conspicuous out-of-stock empty spaces. Use at most 20 boxes. Coordinates are integers from 0 to 1000 relative to the full image, with origin at top-left. x/y are the box's top-left and w/h its dimensions. Use "Danone" for Danone-owned brands such as Activia, Actimel, Danonino, Danette and Alpro. Use "Empty" only for genuine shelf voids. If uncertain between other manufacturers, choose the closest listed competitor.`;

function extractJson(content: string) {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Vision model did not return a JSON object');
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

function normalizeManufacturer(value: string): ShelfDetection['manufacturer'] {
  const normalized = value.toLowerCase();
  if (normalized.includes('danone')) return 'Danone';
  if (normalized.includes('yoplait')) return 'Yoplait';
  if (normalized.includes('nestl')) return 'Nestlé';
  if (normalized.includes('empty') || normalized.includes('void')) return 'Empty';
  return 'Yoplait';
}

function clampCoordinate(value: number) {
  return Math.min(1, Math.max(0, value / 1000));
}

async function detectShelf(imageData: string): Promise<ShelfDetection[]> {
  const endpointName = process.env.DATABRICKS_SERVING_ENDPOINT_NAME;
  if (!endpointName) throw new Error('DATABRICKS_SERVING_ENDPOINT_NAME is not configured');

  const client = getWorkspaceClient({});
  const rawResponse = await client.apiClient.request({
    path: `/serving-endpoints/${encodeURIComponent(endpointName)}/invocations`,
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    raw: false,
    payload: {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: DETECTION_PROMPT },
            { type: 'image_url', image_url: { url: imageData } },
          ],
        },
      ],
      max_tokens: 2_500,
      temperature: 0,
    },
  });
  const response = ModelResponse.parse(rawResponse);
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error('Vision model returned an empty response');

  const parsed = DetectionResponse.parse(extractJson(content));
  return parsed.detections
    .filter((item) => item.w > 0 && item.h > 0)
    .map((item, index) => ({
      id: `fmapi-${index + 1}`,
      label: item.label,
      manufacturer: normalizeManufacturer(item.manufacturer),
      brand: item.brand,
      x: clampCoordinate(item.x),
      y: clampCoordinate(item.y),
      w: clampCoordinate(Math.min(item.w, 1000 - item.x)),
      h: clampCoordinate(Math.min(item.h, 1000 - item.y)),
      score: item.score,
    }));
}

export function setupShelfRoutes(appkit: AppKitWithServer) {
  appkit.server.extend((app) => {
    app.post('/api/shelf/analyze', async (req, res) => {
      try {
        const parsed = AnalyzeBody.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'A valid store_id and image are required' });
          return;
        }
        const { store_id, image_data } = parsed.data;
        if (!image_data) {
          res.json(buildAnalysis(store_id, demoDetections(store_id), DEMO_NOTE));
          return;
        }

        const detections = await detectShelf(image_data);
        res.json(buildAnalysis(store_id, detections, VISION_NOTE));
      } catch (err) {
        console.error('Shelf analysis failed:', err);
        res.status(502).json({ error: 'The vision model could not analyze this shelf image' });
      }
    });
  });
}
