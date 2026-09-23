import { z } from 'zod';
import type { Application } from 'express';

interface AppKitWithLakebase {
  lakebase: {
    query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  };
  server: {
    extend(fn: (app: Application) => void): void;
  };
}

const DDL = [
  `CREATE SCHEMA IF NOT EXISTS app`,
  `CREATE TABLE IF NOT EXISTS app.accepted_recommendations (
    id SERIAL PRIMARY KEY,
    store_id TEXT NOT NULL,
    store_name TEXT NOT NULL,
    recommendation_id TEXT NOT NULL,
    title TEXT NOT NULL,
    rationale TEXT NOT NULL,
    projected_lift_pct NUMERIC(6, 2) NOT NULL,
    estimated_weekly_eur NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'accepted',
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS app.shelf_photos (
    id SERIAL PRIMARY KEY,
    store_id TEXT NOT NULL,
    store_name TEXT NOT NULL,
    caption TEXT,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    image_data TEXT NOT NULL,
    analysis_json JSONB,
    danone_sos_pct NUMERIC(5, 2),
    compliance_pct NUMERIC(5, 2),
    oos_count INT DEFAULT 0,
    competitor_eye_level INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS app.shelf_simulations (
    id SERIAL PRIMARY KEY,
    store_id TEXT NOT NULL,
    store_name TEXT NOT NULL,
    layout_json JSONB NOT NULL,
    projected_lift_pct NUMERIC(6, 2) NOT NULL,
    estimated_weekly_eur NUMERIC(12, 2) NOT NULL,
    oos_lift_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
    eye_level_lift_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
    promo_lift_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cross_merch_lift_eur NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
];

const AcceptBody = z.object({
  store_id: z.string().min(1),
  store_name: z.string().min(1),
  recommendation_id: z.string().min(1),
  title: z.string().min(1),
  rationale: z.string().min(1),
  projected_lift_pct: z.number(),
  estimated_weekly_eur: z.number(),
});

const PhotoBody = z.object({
  store_id: z.string().min(1),
  store_name: z.string().min(1),
  caption: z.string().optional(),
  mime_type: z.string().default('image/jpeg'),
  image_data: z.string().min(1),
  analysis_json: z.record(z.string(), z.unknown()).optional(),
  danone_sos_pct: z.number().optional(),
  compliance_pct: z.number().optional(),
  oos_count: z.number().optional(),
  competitor_eye_level: z.number().optional(),
});

const SimulationBody = z.object({
  store_id: z.string().min(1),
  store_name: z.string().min(1),
  layout_json: z.array(z.record(z.string(), z.unknown())),
  projected_lift_pct: z.number(),
  estimated_weekly_eur: z.number(),
  oos_lift_eur: z.number(),
  eye_level_lift_eur: z.number(),
  promo_lift_eur: z.number(),
  cross_merch_lift_eur: z.number(),
  notes: z.string().optional(),
});

const PLACEHOLDER_SVG = (label: string, accent: string) =>
  `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e8eef5"/><stop offset="100%" stop-color="#d5dde8"/></linearGradient></defs>
      <rect width="640" height="400" fill="url(#g)"/>
      <rect x="40" y="40" width="560" height="80" rx="6" fill="${accent}" opacity="0.85"/>
      <rect x="40" y="140" width="560" height="80" rx="6" fill="#94a3b8" opacity="0.55"/>
      <rect x="40" y="240" width="560" height="80" rx="6" fill="#64748b" opacity="0.45"/>
      <text x="320" y="370" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#334155">${label}</text>
    </svg>`
  ).toString('base64')}`;

async function seedDemoPhotos(appkit: AppKitWithLakebase) {
  const { rows } = await appkit.lakebase.query(`SELECT COUNT(*)::int AS c FROM app.shelf_photos`);
  if (Number(rows[0]?.c) > 0) return;

  const seeds = [
    {
      store_id: 'FR-PAR-001',
      store_name: 'Carrefour Hyper Porte de Versailles',
      caption: 'Visit −14 days · baseline before competitor push',
      days_ago: 14,
      sos: 58,
      compliance: 74,
      oos: 1,
      competitor: 1,
      accent: '#3b82f6',
    },
    {
      store_id: 'FR-PAR-001',
      store_name: 'Carrefour Hyper Porte de Versailles',
      caption: 'Visit −7 days · Yoplait took eye-level facing',
      days_ago: 7,
      sos: 52,
      compliance: 66,
      oos: 2,
      competitor: 2,
      accent: '#f59e0b',
    },
    {
      store_id: 'FR-PAR-005',
      store_name: 'Auchan Express Nation',
      caption: 'Visit −3 days · multiple OOS voids',
      days_ago: 3,
      sos: 44,
      compliance: 51,
      oos: 4,
      competitor: 2,
      accent: '#ef4444',
    },
    {
      store_id: 'FR-PAR-007',
      store_name: 'Carrefour Market République',
      caption: 'Visit −5 days · premium SKUs below knee level',
      days_ago: 5,
      sos: 55,
      compliance: 68,
      oos: 0,
      competitor: 1,
      accent: '#8b5cf6',
    },
  ];

  for (const s of seeds) {
    const dataUrl = PLACEHOLDER_SVG(s.caption, s.accent);
    await appkit.lakebase.query(
      `INSERT INTO app.shelf_photos
         (store_id, store_name, caption, mime_type, image_data, analysis_json,
          danone_sos_pct, compliance_pct, oos_count, competitor_eye_level, created_at)
       VALUES ($1,$2,$3,'image/svg+xml',$4,$5::jsonb,$6,$7,$8,$9, NOW() - ($10 || ' days')::interval)`,
      [
        s.store_id,
        s.store_name,
        s.caption,
        dataUrl,
        JSON.stringify({ seeded: true, note: 'Historical demo photo' }),
        s.sos,
        s.compliance,
        s.oos,
        s.competitor,
        String(s.days_ago),
      ]
    );
  }
  console.log('[lakebase] Seeded demo shelf photo history');
}

export async function setupLakebaseRoutes(appkit: AppKitWithLakebase) {
  try {
    for (const stmt of DDL) {
      await appkit.lakebase.query(stmt);
    }
    await seedDemoPhotos(appkit);
    console.log('[lakebase] Schema ready (recommendations, photos, simulations)');
  } catch (err) {
    console.warn('[lakebase] Database setup failed:', (err as Error).message);
  }

  appkit.server.extend((app) => {
    app.get('/api/recommendations', async (_req, res) => {
      try {
        const result = await appkit.lakebase.query(
          `SELECT id, store_id, store_name, recommendation_id, title, rationale,
                  projected_lift_pct, estimated_weekly_eur, status, accepted_at
           FROM app.accepted_recommendations
           ORDER BY accepted_at DESC
           LIMIT 50`
        );
        res.json(result.rows);
      } catch (err) {
        console.error('Failed to list recommendations:', err);
        res.status(500).json({ error: 'Failed to list recommendations' });
      }
    });

    app.post('/api/recommendations', async (req, res) => {
      try {
        const parsed = AcceptBody.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid recommendation payload' });
          return;
        }
        const r = parsed.data;
        const result = await appkit.lakebase.query(
          `INSERT INTO app.accepted_recommendations
             (store_id, store_name, recommendation_id, title, rationale, projected_lift_pct, estimated_weekly_eur)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id, store_id, store_name, recommendation_id, title, rationale,
                     projected_lift_pct, estimated_weekly_eur, status, accepted_at`,
          [
            r.store_id,
            r.store_name,
            r.recommendation_id,
            r.title,
            r.rationale,
            r.projected_lift_pct,
            r.estimated_weekly_eur,
          ]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error('Failed to accept recommendation:', err);
        res.status(500).json({ error: 'Failed to accept recommendation' });
      }
    });

    app.get('/api/photos', async (req, res) => {
      try {
        const storeId = typeof req.query.store_id === 'string' ? req.query.store_id : null;
        const result = storeId
          ? await appkit.lakebase.query(
              `SELECT id, store_id, store_name, caption, mime_type, image_data, analysis_json,
                      danone_sos_pct, compliance_pct, oos_count, competitor_eye_level, created_at
               FROM app.shelf_photos
               WHERE store_id = $1
               ORDER BY created_at DESC
               LIMIT 30`,
              [storeId]
            )
          : await appkit.lakebase.query(
              `SELECT id, store_id, store_name, caption, mime_type, image_data, analysis_json,
                      danone_sos_pct, compliance_pct, oos_count, competitor_eye_level, created_at
               FROM app.shelf_photos
               ORDER BY created_at DESC
               LIMIT 50`
            );
        res.json(result.rows);
      } catch (err) {
        console.error('Failed to list photos:', err);
        res.status(500).json({ error: 'Failed to list photos' });
      }
    });

    app.post('/api/photos', async (req, res) => {
      try {
        const parsed = PhotoBody.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid photo payload' });
          return;
        }
        const p = parsed.data;
        // Cap payload size for Lakebase demo (~1.5MB text)
        if (p.image_data.length > 1_800_000) {
          res.status(413).json({ error: 'Image too large for demo storage; use a smaller photo' });
          return;
        }
        const result = await appkit.lakebase.query(
          `INSERT INTO app.shelf_photos
             (store_id, store_name, caption, mime_type, image_data, analysis_json,
              danone_sos_pct, compliance_pct, oos_count, competitor_eye_level)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)
           RETURNING id, store_id, store_name, caption, mime_type, image_data, analysis_json,
                     danone_sos_pct, compliance_pct, oos_count, competitor_eye_level, created_at`,
          [
            p.store_id,
            p.store_name,
            p.caption ?? 'New shelf photo',
            p.mime_type,
            p.image_data,
            JSON.stringify(p.analysis_json ?? {}),
            p.danone_sos_pct ?? null,
            p.compliance_pct ?? null,
            p.oos_count ?? 0,
            p.competitor_eye_level ?? 0,
          ]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error('Failed to save photo:', err);
        res.status(500).json({ error: 'Failed to save photo' });
      }
    });

    app.post('/api/simulations', async (req, res) => {
      try {
        const parsed = SimulationBody.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: 'Invalid simulation payload' });
          return;
        }
        const s = parsed.data;
        const result = await appkit.lakebase.query(
          `INSERT INTO app.shelf_simulations
             (store_id, store_name, layout_json, projected_lift_pct, estimated_weekly_eur,
              oos_lift_eur, eye_level_lift_eur, promo_lift_eur, cross_merch_lift_eur, notes)
           VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10)
           RETURNING id, store_id, store_name, projected_lift_pct, estimated_weekly_eur,
                     oos_lift_eur, eye_level_lift_eur, promo_lift_eur, cross_merch_lift_eur, notes, created_at`,
          [
            s.store_id,
            s.store_name,
            JSON.stringify(s.layout_json),
            s.projected_lift_pct,
            s.estimated_weekly_eur,
            s.oos_lift_eur,
            s.eye_level_lift_eur,
            s.promo_lift_eur,
            s.cross_merch_lift_eur,
            s.notes ?? null,
          ]
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        console.error('Failed to save simulation:', err);
        res.status(500).json({ error: 'Failed to save simulation' });
      }
    });
  });
}
