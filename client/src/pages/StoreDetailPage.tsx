import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DonutChart,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Label,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { sql } from '@databricks/appkit-ui/js';
import { ArrowLeft, Camera, CheckCircle2, GripVertical, Sparkles, Upload, Zap } from 'lucide-react';

type StoreRow = {
  store_id: string;
  store_name: string;
  city: string;
  format: string;
  retailer: string;
  priority_score: number;
  priority_tier: string;
  situation_summary: string;
  danone_sos_pct: number;
  compliance_pct: number;
  weekly_sales_eur: number;
};

type PlanogramSlot = {
  store_id: string;
  shelf_row: number;
  shelf_col: number;
  sku_name: string;
  manufacturer: string;
  brand: string;
  promo_tag_required: boolean;
  margin_eur: number;
  shelf_zone: string;
};

type ShelfPhoto = {
  id: number;
  store_id: string;
  store_name: string;
  caption: string | null;
  image_data: string;
  danone_sos_pct: number | null;
  compliance_pct: number | null;
  oos_count: number | null;
  competitor_eye_level: number | null;
  created_at: string;
};

type ExternalSignal = {
  signal_id: string;
  source_name: string;
  signal_type: string;
  signal_summary: string;
  signal_score: number;
  demand_theme: string;
  recommended_action: string;
  expected_impact: string;
  urgency: string;
  valid_to: string;
};

type ShelfAnalysis = {
  store_id: string;
  compliance_score: number;
  danone_share_pct: number;
  competitor_share_pct: number;
  oos_count: number;
  missing_promo_tags: number;
  competitor_eye_level: number;
  alerts: string[];
  detections: Array<{
    id: string;
    label: string;
    manufacturer: string;
    issue?: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  next_best_action: {
    recommendation_id: string;
    title: string;
    rationale: string;
    projected_lift_pct: number;
    estimated_weekly_eur: number;
    strategy_code: string;
  };
  note: string;
};

type ShelfCell = PlanogramSlot & { key: string };

type BusinessImpact = {
  oos_lift_eur: number;
  eye_level_lift_eur: number;
  promo_lift_eur: number;
  cross_merch_lift_eur: number;
  total_eur: number;
  projected_lift_pct: number;
  recommendations: string[];
};

function computeImpact(layout: ShelfCell[], weeklySales: number): BusinessImpact {
  const oos = layout.filter((c) => c.manufacturer === 'Empty').length;
  const eyeCompetitors = layout.filter(
    (c) => c.shelf_zone === 'eye' && c.manufacturer !== 'Danone' && c.manufacturer !== 'Empty'
  ).length;
  const highMarginLow = layout.filter(
    (c) => c.manufacturer === 'Danone' && Number(c.margin_eur) >= 0.38 && c.shelf_zone === 'low'
  ).length;
  const missingPromo = layout.filter((c) => c.promo_tag_required && c.manufacturer === 'Danone').length;
  // Treat "promo not verified" when Danone promo-required SKUs sit next to empty or competitor in eye
  const promoRisk = layout.filter(
    (c) => c.promo_tag_required && c.shelf_zone === 'eye' && c.manufacturer !== 'Danone'
  ).length;

  const oosRate = Math.min(0.04, oos * 0.012);
  const eyeRate = Math.min(0.15, (eyeCompetitors + highMarginLow) * 0.05);
  const promoRate = Math.min(0.05, (missingPromo > 0 || promoRisk > 0 ? 0.03 : 0) + promoRisk * 0.01);
  const crossRate = layout.some((c) => c.brand === 'Oikos' && c.shelf_zone === 'eye') ? 0.02 : 0.005;

  const oos_lift_eur = Math.round(weeklySales * oosRate);
  const eye_level_lift_eur = Math.round(weeklySales * eyeRate * 0.35); // SKU-scoped
  const promo_lift_eur = Math.round(weeklySales * promoRate);
  const cross_merch_lift_eur = Math.round(weeklySales * crossRate);
  const total_eur = oos_lift_eur + eye_level_lift_eur + promo_lift_eur + cross_merch_lift_eur;
  const projected_lift_pct = weeklySales > 0 ? Math.round((1000 * total_eur) / weeklySales) / 10 : 0;

  const recommendations: string[] = [];
  if (oos > 0) {
    recommendations.push(
      `Restock ${oos} empty facing(s) from the backroom → ~2–4% total sales lift (€${oos_lift_eur}/wk at risk).`
    );
  }
  if (eyeCompetitors > 0 || highMarginLow > 0) {
    recommendations.push(
      `Move high-margin Danone (e.g. Oikos HP) into the 1.2–1.6m eye-level zone → 10–15% SKU lift (€${eye_level_lift_eur}/wk).`
    );
  }
  if (missingPromo > 0 || promoRisk > 0) {
    recommendations.push(
      `Verify promotional tags / end-cap paid by Danone → immediate trade-spend ROI recovery (€${promo_lift_eur}/wk).`
    );
  }
  recommendations.push(
    `Pair dairy next to granola / fresh berries where possible → basket-size uplift (€${cross_merch_lift_eur}/wk).`
  );

  return {
    oos_lift_eur,
    eye_level_lift_eur,
    promo_lift_eur,
    cross_merch_lift_eur,
    total_eur,
    projected_lift_pct,
    recommendations,
  };
}

function manufacturerTone(m: string) {
  if (m === 'Danone') return 'border-success bg-success/10';
  if (m === 'Empty') return 'border-destructive bg-destructive/10 border-dashed';
  return 'border-warning bg-warning/10';
}

export function StoreDetailPage() {
  const { storeId = '' } = useParams();
  const params = useMemo(() => ({ store_id: sql.string(storeId) }), [storeId]);

  const { data: storeRows, loading: storeLoading, error: storeError } = useAnalyticsQuery('store_detail', params);
  const { data: planogram, loading: planLoading } = useAnalyticsQuery('planogram_by_store', params);
  const { data: sos } = useAnalyticsQuery('sos_by_store', params);
  const { data: signalRows, loading: signalsLoading } = useAnalyticsQuery('store_signals', params);

  const store = (storeRows?.[0] ?? null) as StoreRow | null;
  const signals = (signalRows ?? []) as ExternalSignal[];

  const [photos, setPhotos] = useState<ShelfPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [photosError, setPhotosError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<ShelfAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [layout, setLayout] = useState<ShelfCell[]>([]);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [savedSim, setSavedSim] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!planogram) return;
    setLayout(
      (planogram as PlanogramSlot[]).map((s) => ({
        ...s,
        key: `${s.shelf_row}-${s.shelf_col}`,
      }))
    );
  }, [planogram]);

  const loadPhotos = useCallback(async () => {
    if (!storeId) return;
    setPhotosLoading(true);
    setPhotosError(null);
    try {
      const res = await fetch(`/api/photos?store_id=${encodeURIComponent(storeId)}`);
      if (!res.ok) throw new Error('Failed to load photo history');
      setPhotos((await res.json()) as ShelfPhoto[]);
    } catch (err) {
      setPhotosError((err as Error).message);
    } finally {
      setPhotosLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  const weeklySales = Number(store?.weekly_sales_eur ?? 5000);
  const impact = useMemo(() => computeImpact(layout, weeklySales), [layout, weeklySales]);

  const rows = useMemo(() => {
    const maxRow = layout.reduce((m, c) => Math.max(m, Number(c.shelf_row)), 1);
    const maxCol = layout.reduce((m, c) => Math.max(m, Number(c.shelf_col)), 1);
    return { maxRow, maxCol };
  }, [layout]);

  const swapCells = (aKey: string, bKey: string) => {
    setSavedSim(false);
    setLayout((prev) => {
      const a = prev.find((c) => c.key === aKey);
      const b = prev.find((c) => c.key === bKey);
      if (!a || !b || aKey === bKey) return prev;
      return prev.map((c) => {
        if (c.key === aKey) {
          return {
            ...c,
            sku_name: b.sku_name,
            manufacturer: b.manufacturer,
            brand: b.brand,
            promo_tag_required: b.promo_tag_required,
            margin_eur: b.margin_eur,
          };
        }
        if (c.key === bKey) {
          return {
            ...c,
            sku_name: a.sku_name,
            manufacturer: a.manufacturer,
            brand: a.brand,
            promo_tag_required: a.promo_tag_required,
            margin_eur: a.margin_eur,
          };
        }
        return c;
      });
    });
  };

  const applyRecommendedLayout = () => {
    setSavedSim(false);
    setLayout((prev) => {
      const next = prev.map((c) => ({ ...c }));
      const eyeSlots = next.filter((c) => c.shelf_zone === 'eye');
      const lowHighMargin = next
        .filter((c) => c.manufacturer === 'Danone' && Number(c.margin_eur) >= 0.38)
        .sort((a, b) => Number(b.margin_eur) - Number(a.margin_eur));
      const eyeCompetitors = eyeSlots.filter((c) => c.manufacturer !== 'Danone' && c.manufacturer !== 'Empty');

      for (let i = 0; i < Math.min(lowHighMargin.length, eyeCompetitors.length); i++) {
        const from = lowHighMargin[i];
        const to = eyeCompetitors[i];
        const fi = next.findIndex((c) => c.key === from.key);
        const ti = next.findIndex((c) => c.key === to.key);
        if (fi < 0 || ti < 0) continue;
        const a = next[fi];
        const b = next[ti];
        next[fi] = {
          ...a,
          sku_name: b.sku_name,
          manufacturer: b.manufacturer,
          brand: b.brand,
          promo_tag_required: b.promo_tag_required,
          margin_eur: b.margin_eur,
        };
        next[ti] = {
          ...b,
          sku_name: a.sku_name,
          manufacturer: a.manufacturer,
          brand: a.brand,
          promo_tag_required: a.promo_tag_required,
          margin_eur: a.margin_eur,
        };
      }

      // Fill first OOS with a note as "restocked" Danone placeholder
      const oosIdx = next.findIndex((c) => c.manufacturer === 'Empty');
      if (oosIdx >= 0) {
        next[oosIdx] = {
          ...next[oosIdx],
          sku_name: 'Oikos HP (restock)',
          manufacturer: 'Danone',
          brand: 'Oikos',
          promo_tag_required: true,
          margin_eur: 0.42,
        };
      }
      return next;
    });
  };

  const runAnalysis = async (imageData?: string, mimeType?: string) => {
    if (!store) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/shelf/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: store.store_id }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const json = (await res.json()) as ShelfAnalysis;
      setAnalysis(json);

      if (imageData) {
        setUploading(true);
        await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: store.store_id,
            store_name: store.store_name,
            caption: 'New shelf photo · auto-analyzed',
            mime_type: mimeType ?? 'image/jpeg',
            image_data: imageData,
            analysis_json: json,
            danone_sos_pct: json.danone_share_pct,
            compliance_pct: json.compliance_score,
            oos_count: json.oos_count,
            competitor_eye_level: json.competitor_eye_level,
          }),
        });
        await loadPhotos();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
      setUploading(false);
    }
  };

  const onFile = (file: File | null) => {
    if (!file || !store) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        void runAnalysis(reader.result, file.type || 'image/jpeg');
      }
    };
    reader.readAsDataURL(file);
  };

  const saveSimulation = async () => {
    if (!store) return;
    const res = await fetch('/api/simulations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id: store.store_id,
        store_name: store.store_name,
        layout_json: layout,
        projected_lift_pct: impact.projected_lift_pct,
        estimated_weekly_eur: impact.total_eur,
        oos_lift_eur: impact.oos_lift_eur,
        eye_level_lift_eur: impact.eye_level_lift_eur,
        promo_lift_eur: impact.promo_lift_eur,
        cross_merch_lift_eur: impact.cross_merch_lift_eur,
        notes: impact.recommendations.join(' '),
      }),
    });
    if (res.ok) setSavedSim(true);
  };

  const acceptNba = async () => {
    if (!store || !analysis) return;
    const nba = analysis.next_best_action;
    const res = await fetch('/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id: store.store_id,
        store_name: store.store_name,
        recommendation_id: nba.recommendation_id,
        title: nba.title,
        rationale: nba.rationale,
        projected_lift_pct: nba.projected_lift_pct,
        estimated_weekly_eur: nba.estimated_weekly_eur,
      }),
    });
    if (res.ok) setAccepted(true);
  };

  if (storeLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (storeError || !store) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Store not found</AlertTitle>
        <AlertDescription>{storeError ?? 'Unknown store id'}</AlertDescription>
      </Alert>
    );
  }

  const sosPct = Math.round(Number(store.danone_sos_pct) * 100);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-col gap-3">
        <Link
          to="/map"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Paris map
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-foreground">{store.store_name}</h2>
              <Badge variant={store.priority_tier === 'critical' ? 'destructive' : 'secondary'}>
                {store.priority_tier} · {store.priority_score}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {store.city} · {store.retailer} · {store.format}
            </p>
            <p className="text-sm text-foreground max-w-3xl">{store.situation_summary}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Danone SoS</p>
              <p className="font-semibold">{sosPct}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Compliance</p>
              <p className="font-semibold">{Math.round(Number(store.compliance_pct))}%</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Weekly dairy €</p>
              <p className="font-semibold">€{weeklySales.toLocaleString('fr-FR')}</p>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Local demand signals
          </CardTitle>
          <CardDescription>External context used by the priority agent and assortment recommendation.</CardDescription>
        </CardHeader>
        <CardContent>
          {signalsLoading && <Skeleton className="h-24 w-full" />}
          {!signalsLoading && signals.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No active external signal for this store; priority is based on shelf and sales data.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {signals.map((signal) => (
              <div key={signal.signal_id} className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{signal.source_name}</Badge>
                  <Badge variant={signal.urgency === 'High' ? 'destructive' : 'secondary'}>
                    score {signal.signal_score}
                  </Badge>
                </div>
                <p className="text-sm text-foreground">{signal.signal_summary}</p>
                <div className="rounded bg-primary/10 p-2">
                  <p className="text-xs font-medium text-primary">Agent shelf action</p>
                  <p className="text-xs text-foreground">{signal.recommended_action}</p>
                </div>
                <p className="text-xs text-muted-foreground">{signal.expected_impact}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="photos">
        <TabsList>
          <TabsTrigger value="photos">Photos &amp; analysis</TabsTrigger>
          <TabsTrigger value="sandbox">Virtual shelf</TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Capture / upload shelf photo</CardTitle>
              <CardDescription>Stored in Lakebase with analysis metadata · evolution vs past visits</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="space-y-2 flex-1">
                <Label htmlFor="photo">Shelf image</Label>
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                  onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <Button variant="outline" className="gap-2" disabled={analyzing} onClick={() => void runAnalysis()}>
                <Camera className="h-4 w-4" />
                {analyzing ? 'Analyzing…' : 'Analyze without new upload'}
              </Button>
            </CardContent>
          </Card>

          {uploading && <p className="text-sm text-muted-foreground">Saving photo to Lakebase…</p>}

          {analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Vision annotations</CardTitle>
                  <CardDescription>{analysis.note}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative w-full aspect-[16/10] rounded-md border bg-muted overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-muted to-background" />
                    {analysis.detections.map((d) => (
                      <div
                        key={d.id}
                        className={`absolute border-2 rounded-sm ${
                          d.issue ? 'border-destructive' : 'border-success'
                        } bg-background/10`}
                        style={{
                          left: `${d.x * 100}%`,
                          top: `${d.y * 100}%`,
                          width: `${d.w * 100}%`,
                          height: `${d.h * 100}%`,
                        }}
                      >
                        <span className="absolute top-0 left-0 text-[10px] px-1 bg-background/90 truncate max-w-full">
                          {d.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {analysis.alerts.map((a) => (
                      <Alert key={a}>
                        <AlertTitle>Alert</AlertTitle>
                        <AlertDescription>{a}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Observed SoS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DonutChart
                      data={[
                        { segment: 'Danone', share_pct: analysis.danone_share_pct },
                        { segment: 'Competitor', share_pct: analysis.competitor_share_pct },
                      ]}
                      xKey="segment"
                      yKey="share_pct"
                      height={200}
                      colorPalette="categorical"
                    />
                    {sos && sos.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Planogram target: {sos.map((r) => `${r.segment} ${r.share_pct}%`).join(' · ')}
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-primary/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Next best action
                    </CardTitle>
                    <CardDescription>
                      +{analysis.next_best_action.projected_lift_pct}% · €
                      {analysis.next_best_action.estimated_weekly_eur.toLocaleString('fr-FR')}/wk
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{analysis.next_best_action.rationale}</p>
                    {accepted ? (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" /> Saved to Lakebase
                      </div>
                    ) : (
                      <Button onClick={() => void acceptNba()} className="w-full">
                        Accept recommendation
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Photo history (evolution)</CardTitle>
              <CardDescription>Past visits for this store · Lakebase app.shelf_photos</CardDescription>
            </CardHeader>
            <CardContent>
              {photosLoading && <Skeleton className="h-40 w-full" />}
              {photosError && (
                <Alert variant="destructive">
                  <AlertTitle>Photo history unavailable</AlertTitle>
                  <AlertDescription>{photosError}</AlertDescription>
                </Alert>
              )}
              {!photosLoading && photos.length === 0 && (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No photos yet</EmptyTitle>
                    <EmptyDescription>Upload a shelf photo to start the timeline.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {photos.map((p) => (
                  <div key={p.id} className="rounded-md border overflow-hidden">
                    <img src={p.image_data} alt={p.caption ?? 'Shelf'} className="w-full h-36 object-cover bg-muted" />
                    <div className="p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString('fr-FR')}</p>
                      <p className="text-sm font-medium line-clamp-2">{p.caption}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {p.danone_sos_pct != null && <span>SoS {Number(p.danone_sos_pct)}%</span>}
                        {p.compliance_pct != null && <span>Compliance {Number(p.compliance_pct)}%</span>}
                        {p.oos_count != null && <span>OOS {p.oos_count}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sandbox" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Virtual shelf sandbox</CardTitle>
                  <CardDescription>
                    Drag facings to simulate placement. Eye / mid / low zones map to strike-zone logic.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={applyRecommendedLayout}>
                    Apply AI layout
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {planLoading && <Skeleton className="h-64 w-full" />}
                {!planLoading && layout.length === 0 && (
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>No planogram for this store</EmptyTitle>
                      <EmptyDescription>Add slots in shelf_optimizer.planogram_slots</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
                {Array.from({ length: rows.maxRow }, (_, ri) => ri + 1).map((row) => {
                  const zone = layout.find((c) => Number(c.shelf_row) === row)?.shelf_zone ?? 'mid';
                  return (
                    <div key={row} className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Row {row} · {zone === 'eye' ? 'Eye-level (1.2–1.6m)' : zone === 'low' ? 'Low / knee' : 'Mid'}
                      </p>
                      <div
                        className="grid gap-2"
                        style={{ gridTemplateColumns: `repeat(${rows.maxCol}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: rows.maxCol }, (_, ci) => ci + 1).map((col) => {
                          const cell = layout.find((c) => Number(c.shelf_row) === row && Number(c.shelf_col) === col);
                          if (!cell) return <div key={`${row}-${col}`} className="h-20 rounded border border-dashed" />;
                          return (
                            <div
                              key={cell.key}
                              draggable
                              onDragStart={() => setDragKey(cell.key)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => {
                                if (dragKey) swapCells(dragKey, cell.key);
                                setDragKey(null);
                              }}
                              className={`h-24 rounded-md border-2 p-2 cursor-grab active:cursor-grabbing ${manufacturerTone(cell.manufacturer)}`}
                            >
                              <div className="flex items-start gap-1">
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{cell.sku_name}</p>
                                  <p className="text-[10px] text-muted-foreground">{cell.brand}</p>
                                  {cell.manufacturer !== 'Empty' && (
                                    <p className="text-[10px] text-muted-foreground">
                                      €{Number(cell.margin_eur).toFixed(2)} margin
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-primary/30">
              <CardHeader>
                <CardTitle>Business value analysis</CardTitle>
                <CardDescription>Live impact of your virtual moves · weekly €</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {signals[0] && (
                  <div className="rounded-md border border-primary/30 bg-primary/10 p-3">
                    <p className="text-xs font-medium text-primary">External demand overlay</p>
                    <p className="text-sm text-foreground mt-1">{signals[0].signal_summary}</p>
                    <p className="text-xs text-muted-foreground mt-1">{signals[0].recommended_action}</p>
                  </div>
                )}
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs text-muted-foreground">Projected weekly upside</p>
                  <p className="text-3xl font-semibold text-success">€{impact.total_eur.toLocaleString('fr-FR')}</p>
                  <p className="text-sm text-muted-foreground">
                    ≈ +{impact.projected_lift_pct}% of store dairy weekly sales
                  </p>
                </div>

                <ImpactLine
                  title="OOS reduction (2–4%)"
                  body="Alert empty slots → restock before leaving"
                  value={impact.oos_lift_eur}
                />
                <ImpactLine
                  title="Eye-level is buy-level (10–15% SKU)"
                  body="Premium yogurts into the 1.2–1.6m strike zone"
                  value={impact.eye_level_lift_eur}
                />
                <ImpactLine
                  title="Trade spend compliance"
                  body="Verify paid promo tags & end-caps"
                  value={impact.promo_lift_eur}
                />
                <ImpactLine
                  title="Cross-merchandising"
                  body="Dairy next to granola / berries"
                  value={impact.cross_merch_lift_eur}
                />

                <div className="space-y-2 pt-2 border-t">
                  <p className="text-sm font-medium">Visual recommendations</p>
                  <ul className="space-y-2">
                    {impact.recommendations.map((r) => (
                      <li key={r} className="text-xs text-muted-foreground leading-relaxed">
                        • {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {savedSim ? (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" /> Simulation saved to Lakebase
                  </div>
                ) : (
                  <Button className="w-full gap-2" onClick={() => void saveSimulation()}>
                    <Upload className="h-4 w-4" />
                    Save simulation
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ImpactLine({ title, body, value }: { title: string; body: string; value: number }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
      <p className="font-semibold whitespace-nowrap text-foreground">€{value.toLocaleString('fr-FR')}</p>
    </div>
  );
}
