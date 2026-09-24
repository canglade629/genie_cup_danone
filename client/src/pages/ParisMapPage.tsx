import { useState } from 'react';
import { Link } from 'react-router';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { ArrowUpRight, CircleAlert, Euro, MapPin, Navigation, Route, Sparkles, Store, Target, Zap } from 'lucide-react';

type StoreRow = {
  store_id: string;
  store_name: string;
  city: string;
  format: string;
  retailer: string;
  lat: number;
  lng: number;
  priority_score: number;
  priority_tier: string;
  situation_summary: string;
  danone_sos_pct: number;
  compliance_pct: number;
  weekly_sales_eur: number;
};

type SignalRow = {
  signal_id: string;
  store_id: string;
  store_name: string;
  source_name: string;
  signal_summary: string;
  signal_score: number;
  demand_theme: string;
  recommended_action: string;
  expected_impact: string;
};

/** Paris bounding box → % for pin placement */
const PARIS = { minLat: 48.815, maxLat: 48.905, minLng: 2.25, maxLng: 2.42 };

function toMapPos(lat: number, lng: number) {
  const x = ((lng - PARIS.minLng) / (PARIS.maxLng - PARIS.minLng)) * 100;
  const y = (1 - (lat - PARIS.minLat) / (PARIS.maxLat - PARIS.minLat)) * 100;
  return {
    left: `${Math.min(96, Math.max(4, x))}%`,
    top: `${Math.min(96, Math.max(4, y))}%`,
  };
}

export function ParisMapPage() {
  const { data, loading, error } = useAnalyticsQuery('stores');
  const { data: signalData, loading: signalsLoading } = useAnalyticsQuery('external_signals');
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const stores = (data ?? []) as StoreRow[];
  const signals = (signalData ?? []) as SignalRow[];
  const rankedStores = [...stores].sort((a, b) => Number(b.priority_score) - Number(a.priority_score));
  const critical = stores.filter((s) => s.priority_tier === 'critical' || s.priority_tier === 'high');

  return (
    <div className="space-y-5 w-full max-w-[1440px] mx-auto">
      <section className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/[0.09] via-background to-sky-50 px-5 py-5 md:px-7 md:py-6">
        <div className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[38px] border-primary/[0.04]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Navigation className="h-3.5 w-3.5" />
              Field command center
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Paris store network</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Turn shelf signals into a focused route. Priority combines compliance, out-of-stock risk, and share of
              shelf.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-7 gap-y-4 sm:grid-cols-4 lg:min-w-[620px]" data-tour="map-summary">
            <Metric icon={Store} label="Mapped" value={loading ? '—' : String(stores.length)} />
            <Metric icon={CircleAlert} label="Priority visits" value={loading ? '—' : String(critical.length)} alert />
            <Metric
              icon={Target}
              label="Avg. share"
              value={
                loading || stores.length === 0
                  ? '—'
                  : `${Math.round((100 * stores.reduce((a, s) => a + Number(s.danone_sos_pct), 0)) / stores.length)}%`
              }
            />
            <Metric
              icon={Euro}
              label="Weekly at stake"
              value={
                loading ? '—' : `${Math.round(stores.reduce((a, s) => a + Number(s.weekly_sales_eur), 0) / 1000)}k`
              }
            />
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load stores</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card className="overflow-hidden border-primary/10 shadow-sm">
          <CardHeader className="border-b bg-background/95 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  Live priority map
                </CardTitle>
                <CardDescription className="mt-1">Hover a location to connect it with the visit queue</CardDescription>
              </div>
              <div className="flex items-center gap-2 rounded-full border bg-muted/40 p-1 text-xs">
                <span className="rounded-full bg-background px-3 py-1.5 font-medium text-primary shadow-sm">
                  Priority
                </span>
                <span className="px-2.5 py-1.5 text-muted-foreground">All stores</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <Skeleton className="h-[560px] w-full rounded-none" />
            ) : (
              <div className="relative h-[520px] w-full overflow-hidden bg-[#edf1ec] md:h-[600px]">
                <ParisBackdrop />
                <div className="absolute left-4 top-4 z-20 rounded-xl border border-white/70 bg-white/90 p-3 shadow-lg shadow-slate-900/5 backdrop-blur">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Visit urgency
                  </p>
                  <div className="flex gap-3 text-[11px] text-foreground">
                    <LegendDot className="bg-destructive" label="Critical" />
                    <LegendDot className="bg-primary" label="High" />
                    <LegendDot className="bg-warning" label="Medium" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-[11px] font-medium text-muted-foreground shadow-lg backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Scores refreshed from latest shelf signals
                </div>
                {rankedStores.map((s, index) => {
                  const pos = toMapPos(Number(s.lat), Number(s.lng));
                  const isActive = activeStoreId === s.store_id;
                  const tooltipPosition =
                    Number(s.lng) < 2.29 ? 'left-0' : Number(s.lng) > 2.38 ? 'right-0' : 'left-1/2 -translate-x-1/2';
                  return (
                    <Link
                      key={s.store_id}
                      to={`/stores/${s.store_id}`}
                      className={`group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none ${
                        isActive ? 'z-30' : 'z-10'
                      }`}
                      style={pos}
                      title={`${s.store_name} · ${s.priority_tier}`}
                      onMouseEnter={() => setActiveStoreId(s.store_id)}
                      onMouseLeave={() => setActiveStoreId(null)}
                      onFocus={() => setActiveStoreId(s.store_id)}
                      onBlur={() => setActiveStoreId(null)}
                    >
                      {s.priority_tier === 'critical' && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-destructive/25" />
                      )}
                      <span
                        className={`relative flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(15,23,42,0.28)] transition-all duration-200 group-hover:-translate-y-1 group-hover:scale-110 group-focus:-translate-y-1 group-focus:scale-110 ${pinColor(
                          s.priority_tier
                        )} ${isActive ? 'ring-4 ring-white/70' : ''}`}
                      >
                        {index + 1}
                      </span>
                      <span
                        className={`pointer-events-none absolute bottom-11 w-56 rounded-xl border border-white/80 bg-white/95 p-3 text-left shadow-xl backdrop-blur transition-all ${tooltipPosition} ${
                          isActive
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100'
                        }`}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-foreground">{s.store_name}</span>
                          <span className="text-xs font-bold text-primary">{s.priority_score}</span>
                        </span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {s.format} · SoS {Math.round(Number(s.danone_sos_pct) * 100)}%
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/10 shadow-sm" data-tour="visit-queue">
          <CardHeader className="border-b bg-background py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Route className="h-4 w-4 text-primary" />
                  Today&apos;s visit queue
                </CardTitle>
                <CardDescription className="mt-1">Ranked by expected commercial impact</CardDescription>
              </div>
              <Badge variant="secondary">{rankedStores.length} stops</Badge>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] space-y-2 overflow-y-auto p-3">
            {loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            {!loading &&
              rankedStores.map((s, index) => (
                <Link
                  key={s.store_id}
                  to={`/stores/${s.store_id}`}
                  className={`group block rounded-xl border p-3.5 transition-all hover:border-primary/30 hover:bg-primary/[0.035] hover:shadow-sm ${
                    activeStoreId === s.store_id ? 'border-primary/30 bg-primary/[0.035] shadow-sm' : 'border-border/80'
                  }`}
                  onMouseEnter={() => setActiveStoreId(s.store_id)}
                  onMouseLeave={() => setActiveStoreId(null)}
                  onFocus={() => setActiveStoreId(s.store_id)}
                  onBlur={() => setActiveStoreId(null)}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${pinColor(
                        s.priority_tier
                      )}`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{s.store_name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {s.city} · {s.format}
                          </p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{s.situation_summary}</p>
                      <div className="mt-3 grid grid-cols-3 divide-x rounded-lg bg-muted/60 py-2 text-center">
                        <QueueMetric label="Score" value={String(s.priority_score)} strong />
                        <QueueMetric label="Share" value={`${Math.round(Number(s.danone_sos_pct) * 100)}%`} />
                        <QueueMetric label="Compliance" value={`${Math.round(Number(s.compliance_pct))}%`} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 shadow-sm" data-tour="signal-strip">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-primary" />
              Signals shaping this week
            </CardTitle>
            <CardDescription className="mt-1">
              External context already factored into the priority score
            </CardDescription>
          </div>
          <Link
            to="/signals"
            className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-primary hover:underline"
          >
            View signals <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {signalsLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
          {!signalsLoading &&
            signals.slice(0, 3).map((signal) => (
              <Link
                key={signal.signal_id}
                to={`/stores/${signal.store_id}`}
                className="group rounded-xl border border-border/80 p-4 transition-all hover:border-primary/30 hover:bg-primary/[0.025]"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{signal.source_name}</Badge>
                  <span className="text-xs font-bold text-destructive">+{signal.signal_score} signal</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{signal.store_name}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{signal.signal_summary}</p>
              </Link>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

function pinColor(tier: string) {
  if (tier === 'critical') return 'bg-destructive';
  if (tier === 'high') return 'bg-primary';
  if (tier === 'medium') return 'bg-warning';
  return 'bg-muted-foreground';
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${alert ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className={`text-xl font-semibold leading-none ${alert ? 'text-destructive' : 'text-foreground'}`}>
          {value}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function QueueMetric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span>
      <span className={`block text-xs font-semibold ${strong ? 'text-primary' : 'text-foreground'}`}>{value}</span>
      <span className="mt-0.5 block text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </span>
  );
}

function ParisBackdrop() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="minor-grid" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#dfe5df" strokeWidth="0.25" />
        </pattern>
        <filter id="river-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0.5" stdDeviation="0.5" floodColor="#5ca8d6" floodOpacity="0.2" />
        </filter>
      </defs>
      <rect width="100" height="100" fill="#f2f4ef" />
      <rect width="100" height="100" fill="url(#minor-grid)" opacity="0.7" />
      <g fill="#e1eadc" opacity="0.9">
        <path d="M0 0h23l5 17-9 11H0z" />
        <path d="M77 0h23v31l-13 3-8-15z" />
        <path d="M0 77l16-7 11 12-4 18H0z" />
        <path d="M76 78l24-6v28H70z" />
      </g>
      <g fill="none" stroke="#d1d7d1" strokeWidth="0.65">
        <path d="M5 12L93 88" />
        <path d="M13 91L84 5" />
        <path d="M0 39C27 34 69 36 100 27" />
        <path d="M0 74C30 66 64 76 100 54" />
        <path d="M29 0C34 28 27 57 39 100" />
        <path d="M68 0C62 29 70 63 61 100" />
      </g>
      <g fill="none" stroke="#ffffff" strokeWidth="1.25" opacity="0.95">
        <path d="M1 22C29 30 52 17 99 16" />
        <path d="M9 99C30 70 49 35 91 1" />
        <path d="M0 53C28 45 66 49 100 43" />
        <path d="M19 0C22 32 44 61 52 100" />
        <path d="M52 0C54 29 48 65 82 100" />
      </g>
      <path
        d="M -5 65 C 10 63, 17 54, 29 55 C 39 56, 39 64, 51 64 C 65 64, 70 73, 84 70 C 93 68, 97 61, 105 62"
        fill="none"
        stroke="#8bc5e6"
        strokeWidth="5"
        filter="url(#river-shadow)"
      />
      <path
        d="M -5 65 C 10 63, 17 54, 29 55 C 39 56, 39 64, 51 64 C 65 64, 70 73, 84 70 C 93 68, 97 61, 105 62"
        fill="none"
        stroke="#bce1f4"
        strokeWidth="2.8"
      />
      <g fill="#7b8580" fontSize="2.2" fontFamily="system-ui, sans-serif" letterSpacing="0.08">
        <text x="12" y="20">
          16E · PASSY
        </text>
        <text x="43" y="17">
          9E · OPÉRA
        </text>
        <text x="74" y="23">
          19E · BUTTES-CHAUMONT
        </text>
        <text x="22" y="44">
          7E · INVALIDES
        </text>
        <text x="49" y="46">
          4E · MARAIS
        </text>
        <text x="77" y="49">
          11E · BASTILLE
        </text>
        <text x="17" y="84">
          15E · VAUGIRARD
        </text>
        <text x="50" y="87">
          13E · GOBELINS
        </text>
        <text x="78" y="84">
          12E · REUILLY
        </text>
      </g>
      <g fill="#ffffff" stroke="#cfd6cf" strokeWidth="0.3">
        <circle cx="49" cy="50" r="2.2" />
        <circle cx="38" cy="38" r="1.5" />
        <circle cx="69" cy="41" r="1.5" />
      </g>
      <g fill="#7b8580" fontSize="1.65" fontFamily="system-ui, sans-serif">
        <text x="49" y="50.6" textAnchor="middle">
          PARIS
        </text>
        <text x="38" y="38.5" textAnchor="middle">
          OPÉRA
        </text>
        <text x="69" y="41.5" textAnchor="middle">
          NATION
        </text>
      </g>
      <text x="58" y="69" fill="#4b98c7" fontSize="1.7" fontStyle="italic" fontFamily="system-ui, sans-serif">
        La Seine
      </text>
    </svg>
  );
}
