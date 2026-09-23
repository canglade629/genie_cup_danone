import { z } from 'zod';
import type { Application, Request } from 'express';
import { buildAnalysis, DEMO_NOTE, FALLBACK_NOTE, VISION_NOTE, demoDetections } from '../../vision/analyze-result';
import { decodeImagePayload, detectShelf } from '../../vision/detect-shelf';

interface VolumeHandle {
  asUser(req: Request): { download(filePath: string): Promise<unknown> };
  download(filePath: string): Promise<unknown>;
}

interface AppKitWithServer {
  server: {
    extend(fn: (app: Application) => void): void;
  };
  files?: (volumeKey: string) => VolumeHandle;
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

const AnalyzeBody = z.object({
  store_id: z.string().min(1),
  image_data: z.string().min(32).optional(),
  volume_path: z.string().min(1).optional(),
});

async function chunksToBuffer(contents: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(contents)) return contents;
  if (contents instanceof Uint8Array) return Buffer.from(contents);
  if (typeof contents === 'string') return Buffer.from(contents, 'base64');
  if (contents && typeof contents === 'object' && 'contents' in contents) {
    return chunksToBuffer((contents as { contents: unknown }).contents);
  }
  if (contents && typeof (contents as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function') {
    const chunks: Buffer[] = [];
    for await (const chunk of contents as AsyncIterable<unknown>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }
    return Buffer.concat(chunks);
  }
  throw new Error('Unsupported volume download payload');
}

async function loadVolumeImage(appkit: AppKitWithServer, req: Request, volumePath: string): Promise<Buffer> {
  if (!appkit.files) {
    throw new Error('Files plugin is not configured');
  }
  const volume = appkit.files('files');
  try {
    return await chunksToBuffer(await volume.asUser(req).download(volumePath));
  } catch (err) {
    console.warn('Volume download as user failed, retrying as service principal:', err);
    return chunksToBuffer(await volume.download(volumePath));
  }
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
        const { store_id, image_data, volume_path } = parsed.data;

        if (image_data && image_data.length > 1_800_000) {
          res.status(413).json({ error: 'Image too large for analysis; use a smaller photo' });
          return;
        }

        let image: Buffer | null = null;
        if (image_data) {
          image = decodeImagePayload(image_data);
        } else if (volume_path) {
          image = await loadVolumeImage(appkit, req, volume_path);
        }

        if (!image) {
          res.json(buildAnalysis(store_id, demoDetections(store_id), DEMO_NOTE));
          return;
        }

        const { detections, usedModel } = await detectShelf(image);
        res.json(buildAnalysis(store_id, detections, usedModel ? VISION_NOTE : FALLBACK_NOTE));
      } catch (err) {
        console.error('Shelf analysis failed:', err);
        res.status(500).json({ error: 'Shelf analysis failed' });
      }
    });
  });
}
