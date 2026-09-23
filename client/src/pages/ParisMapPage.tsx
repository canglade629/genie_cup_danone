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
import { MapPin, AlertTriangle, TrendingUp, Zap } from 'lucide-react';

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

function tierVariant(tier: string): 'destructive' | 'secondary' | 'outline' | 'default' {
  if (tier === 'critical') return 'destructive';
  if (tier === 'high') return 'default';
  if (tier === 'medium') return 'secondary';
  return 'outline';
}

export function ParisMapPage() {
  const { data, loading, error } = useAnalyticsQuery('stores');
  const { data: signalData, loading: signalsLoading } = useAnalyticsQuery('external_signals');
  const stores = (data ?? []) as StoreRow[];
  const signals = (signalData ?? []) as SignalRow[];
  const critical = stores.filter((s) => s.priority_tier === 'critical' || s.priority_tier === 'high');

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Paris store priority map</h2>
        <p className="text-sm text-muted-foreground">
          Agent routing view — ranked visit priorities from compliance, OOS risk, and share of shelf. Click a pin or row
          to open the store brief, photo history, and virtual shelf.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Could not load stores</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Stores on map"
          value={loading ? '…' : String(stores.length)}
          hint="Paris dairy aisle coverage"
        />
        <StatCard
          label="Priority visits"
          value={loading ? '…' : String(critical.length)}
          hint="Critical + high tier"
          tone="bad"
        />
        <StatCard
          label="Avg Danone SoS"
          value={
            loading || stores.length === 0
              ? '…'
              : `${Math.round((100 * stores.reduce((a, s) => a + Number(s.danone_sos_pct), 0)) / stores.length)}%`
          }
          hint="Across mapped stores"
        />
        <StatCard
          label="Weekly € at stake"
          value={
            loading
              ? '…'
              : `€${Math.round(stores.reduce((a, s) => a + Number(s.weekly_sales_eur), 0)).toLocaleString('fr-FR')}`
          }
          hint="Sum of store weekly dairy"
        />
      </div>

      <Card className="border-primary/30">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Signals changing this week&apos;s priorities
            </CardTitle>
            <CardDescription>
              External context layered into the agent score—click to open the affected store.
            </CardDescription>
          </div>
          <Link to="/signals" className="text-sm text-primary hover:underline whitespace-nowrap">
            Explore all
          </Link>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {signalsLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          {!signalsLoading &&
            signals.slice(0, 3).map((signal) => (
              <Link
                key={signal.signal_id}
                to={`/stores/${signal.store_id}`}
                className="rounded-md border p-3 hover:bg-muted/50 transition-colors space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">{signal.source_name}</Badge>
                  <span className="text-sm font-semibold text-destructive">{signal.signal_score}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{signal.store_name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{signal.signal_summary}</p>
                <p className="text-xs text-primary line-clamp-2">→ {signal.recommended_action}</p>
              </Link>
            ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Paris
            </CardTitle>
            <CardDescription>Pin color = priority tier · size scales with priority score</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[420px] w-full" />
            ) : (
              <div className="relative w-full h-[420px] rounded-lg border bg-muted overflow-hidden">
                <ParisBackdrop />
                {stores.map((s) => {
                  const pos = toMapPos(Number(s.lat), Number(s.lng));
                  const size = 14 + Math.min(18, Number(s.priority_score) / 8);
                  return (
                    <Link
                      key={s.store_id}
                      to={`/stores/${s.store_id}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
                      style={pos}
                      title={`${s.store_name} · ${s.priority_tier}`}
                    >
                      <span
                        className={`block rounded-full border-2 border-background shadow-md transition-transform group-hover:scale-125 ${pinColor(s.priority_tier)}`}
                        style={{ width: size, height: size }}
                      />
                      <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-background/95 px-1.5 py-0.5 text-[10px] font-medium text-foreground opacity-0 group-hover:opacity-100 shadow border">
                        {s.retailer} · {s.priority_score}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              <LegendDot className="bg-destructive" label="Critical" />
              <LegendDot className="bg-primary" label="High" />
              <LegendDot className="bg-warning" label="Medium" />
              <LegendDot className="bg-muted-foreground" label="Low" />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Visit queue
            </CardTitle>
            <CardDescription>Highest priority first — agent briefing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[460px] overflow-y-auto">
            {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            {!loading &&
              stores.map((s) => (
                <Link
                  key={s.store_id}
                  to={`/stores/${s.store_id}`}
                  className="block rounded-md border p-3 hover:bg-muted/60 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.store_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.city} · {s.format}
                      </p>
                    </div>
                    <Badge variant={tierVariant(s.priority_tier)}>{s.priority_tier}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{s.situation_summary}</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-foreground">SoS {Math.round(Number(s.danone_sos_pct) * 100)}%</span>
                    <span className="text-muted-foreground">Compliance {Math.round(Number(s.compliance_pct))}%</span>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />€{Number(s.weekly_sales_eur).toLocaleString('fr-FR')}/wk
                    </span>
                  </div>
                </Link>
              ))}
          </CardContent>
        </Card>
      </div>
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

function StatCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'bad' }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold ${tone === 'bad' ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function ParisBackdrop() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect width="100" height="100" className="fill-muted" />
      {/* Seine-ish curve */}
      <path
        d="M 8 62 C 22 58, 35 48, 48 52 C 62 56, 75 68, 92 64"
        fill="none"
        stroke="currentColor"
        className="text-primary/30"
        strokeWidth="2.5"
      />
      {/* Arrondissement-ish blocks */}
      {[
        [18, 28, 22, 18],
        [45, 22, 20, 16],
        [68, 30, 18, 14],
        [25, 55, 24, 20],
        [55, 58, 22, 18],
        [12, 72, 16, 12],
        [78, 70, 14, 14],
      ].map(([x, y, w, h], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width={w}
          height={h}
          rx="1.5"
          className="fill-background/70 stroke-border"
          strokeWidth="0.4"
        />
      ))}
      <text x="50" y="12" textAnchor="middle" className="fill-muted-foreground" fontSize="4">
        Paris · dairy aisle network
      </text>
      <text x="50" y="96" textAnchor="middle" className="fill-muted-foreground" fontSize="3">
        Demo map · pins linked to store briefs
      </text>
    </svg>
  );
}
