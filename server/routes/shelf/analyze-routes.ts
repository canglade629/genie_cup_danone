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
  image_data: z.string().startsWith('data:image/').max(120_000).optional(),
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

const DETECTION_PROMPT = `You are annotating a French supermarket yogurt fridge for a Danone sales-rep tool.

Return only JSON, no markdown:
{"detections":[{"label":"Activia","manufacturer":"Danone","brand":"Activia","x":40,"y":12,"w":160,"h":130,"score":0.9}]}

Hard rules:
- label and brand MUST be the brand printed on the pack (Activia, Oikos, Actimel, Danette, Yoplait, Panier, Yaos, Müller, Ski, La Laitière, etc.).
- NEVER use generic words such as "product", "yogurt", "item", "SKU", or "facing".
- One box per contiguous block of the SAME brand on the SAME shelf row. Do not merge two brands into one box.
- manufacturer is exactly one of: Danone, Yoplait, Nestlé, Empty.
- Danone-owned: Activia, Actimel, Oikos, Danette, Danonino, Alpro, Taillefine, Danone Nature.
- Müller is a competitor; if it is the only fit, use manufacturer Yoplait.
- Empty gaps / missing facings: label "OOS void", manufacturer Empty, brand "—".
- Coordinates are integers 0–1000 for the full image, origin top-left. x/y = box top-left, w/h = size.
- At most 20 boxes. Prefer fewer precise boxes over many unlabeled ones.`;

function extractJson(content: string) {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Vision model did not return a JSON object');
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

const GENERIC_LABEL = /^(product|item|yogurt|yoghurt|sku|facing|unlabeled|unknown|pack|goods)$/i;

function manufacturerFromText(value: string): ShelfDetection['manufacturer'] | null {
  const normalized = value.toLowerCase().replace(/é/g, 'e').replace(/ü/g, 'u').replace(/ö/g, 'o');
  if (/(empty|void|oos|gap)/.test(normalized)) return 'Empty';
  if (/(activia|actimel|oikos|danette|danonino|alpro|taillefine|danone)/.test(normalized)) return 'Danone';
  if (/(nestle|ski|laitiere|lc1)/.test(normalized)) return 'Nestlé';
  if (/(yoplait|yop|panier|yaos|muller|skyr)/.test(normalized)) return 'Yoplait';
  return null;
}

function normalizeManufacturer(manufacturer: string, brand: string, label: string): ShelfDetection['manufacturer'] {
  return (
    manufacturerFromText(manufacturer) ??
    manufacturerFromText(brand) ??
    manufacturerFromText(label) ??
    'Yoplait'
  );
}

function normalizeLabel(label: string, brand: string, manufacturer: ShelfDetection['manufacturer']) {
  const trimmedLabel = label.trim();
  const trimmedBrand = brand.trim();
  if (manufacturer === 'Empty') return 'OOS void';
  if (GENERIC_LABEL.test(trimmedLabel) || !trimmedLabel) {
    if (trimmedBrand && !GENERIC_LABEL.test(trimmedBrand)) return trimmedBrand;
    return manufacturer;
  }
  return trimmedLabel;
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
      max_tokens: 3_000,
      temperature: 0,
    },
  });
  const response = ModelResponse.parse(rawResponse);
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error('Vision model returned an empty response');

  const parsed = DetectionResponse.parse(extractJson(content));
  return parsed.detections
    .filter((item) => item.w > 0 && item.h > 0)
    .map((item, index) => {
      const manufacturer = normalizeManufacturer(item.manufacturer, item.brand, item.label);
      const label = normalizeLabel(item.label, item.brand, manufacturer);
      return {
        id: `fmapi-${index + 1}`,
        label,
        manufacturer,
        brand: GENERIC_LABEL.test(item.brand) ? label : item.brand || label,
        x: clampCoordinate(item.x),
        y: clampCoordinate(item.y),
        w: clampCoordinate(Math.min(item.w, 1000 - item.x)),
        h: clampCoordinate(Math.min(item.h, 1000 - item.y)),
        score: item.score,
      };
    });
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
