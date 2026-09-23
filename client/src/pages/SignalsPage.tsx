import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  useAnalyticsQuery,
} from '@databricks/appkit-ui/react';
import { Activity, CalendarDays, CloudSun, Dumbbell, Search, ShoppingBasket, Train, Users } from 'lucide-react';

type SignalRow = {
  signal_id: string;
  store_id: string;
  store_name: string;
  city: string;
  source_name: string;
  signal_type: string;
  signal_summary: string;
  valid_from: string;
  valid_to: string;
  signal_score: number;
  demand_theme: string;
  recommended_action: string;
  expected_impact: string;
  urgency: string;
};

const FILTERS = [
  ['all', 'All signals'],
  ['fitness_activity', 'Fitness & Strava'],
  ['sports_event', 'Sports events'],
  ['weather', 'Weather'],
  ['mobility', 'Mobility & footfall'],
  ['competitor', 'Competitor activity'],
  ['cross_merch', 'Basket affinities'],
  ['workplace', 'Office patterns'],
  ['consumer_interest', 'Search trends'],
  ['family', 'Family calendar'],
  ['tourism', 'Tourism'],
] as const;

export function SignalsPage() {
  const { data, loading, error } = useAnalyticsQuery('external_signals');
  const [filter, setFilter] = useState('all');
  const rows = useMemo(() => (data ?? []) as SignalRow[], [data]);
  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.signal_type === filter)),
    [filter, rows]
  );

  const proteinSignals = rows.filter((r) => r.demand_theme === 'high_protein').length;
  const highUrgency = rows.filter((r) => r.urgency === 'High').length;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">External demand signals</h2>
        <p className="text-sm text-muted-foreground">
          Local context that changes the right assortment: Strava activity, events, weather, transport footfall,
          competitor promotions, basket affinities, office occupancy, search trends, family calendars, and tourism.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Active signals" value={loading ? '…' : String(rows.length)} hint="Across Paris" />
        <SummaryCard
          label="High urgency"
          value={loading ? '…' : String(highUrgency)}
          hint="Act during next visit"
          tone="bad"
        />
        <SummaryCard
          label="Protein demand"
          value={loading ? '…' : String(proteinSignals)}
          hint="Signals favoring Oikos HP"
        />
        <SummaryCard label="Signal families" value="10" hint="Demand, mobility & context" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How signals turn into shelf actions</CardTitle>
          <CardDescription>
            The priority agent combines these signals with SoS, OOS, compliance, sales, and photo history—never as a
            standalone rule.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Scenario
            icon={<Dumbbell className="h-4 w-4" />}
            title="Fitness intensity"
            body="Strava routes, gyms, races → more high-protein and hydration facings."
          />
          <Scenario
            icon={<CloudSun className="h-4 w-4" />}
            title="Weather"
            body="Heat waves → chilled water and drinkable yogurt; cold snaps → family formats."
          />
          <Scenario
            icon={<Train className="h-4 w-4" />}
            title="Mobility"
            body="RATP footfall and office occupancy → single-serve, grab-and-go availability."
          />
          <Scenario
            icon={<ShoppingBasket className="h-4 w-4" />}
            title="Basket affinities"
            body="Granola and berry growth → cross-merch Oikos / Activia to lift basket size."
          />
          <Scenario
            icon={<Search className="h-4 w-4" />}
            title="Local intent"
            body="Search and delivery trends → adapt claims, assortment, and space allocation."
          />
          <Scenario
            icon={<CalendarDays className="h-4 w-4" />}
            title="Local calendar"
            body="School, sports, festivals → temporary stock and display recommendations."
          />
          <Scenario
            icon={<Users className="h-4 w-4" />}
            title="Audience shifts"
            body="Tourists, commuters, families → choose recognizable, portable, or multipack SKUs."
          />
          <Scenario
            icon={<Activity className="h-4 w-4" />}
            title="Competitor pressure"
            body="Coupons and campaigns → defend eye-level and verify paid promotional execution."
          />
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-2 w-full sm:max-w-xs">
          <Label htmlFor="signal-filter">Explore signal type</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger id="signal-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTERS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} signal{filtered.length === 1 ? '' : 's'} shown · freshest first by score
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Signals unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((signal) => (
          <Link key={signal.signal_id} to={`/stores/${signal.store_id}`}>
            <Card className="h-full hover:bg-muted/40 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{signal.store_name}</CardTitle>
                    <CardDescription>
                      {signal.source_name} · valid through {formatDate(signal.valid_to)}
                    </CardDescription>
                  </div>
                  <Badge variant={signal.urgency === 'High' ? 'destructive' : 'secondary'}>{signal.signal_score}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Signal</p>
                  <p className="text-sm text-foreground">{signal.signal_summary}</p>
                </div>
                <div className="rounded-md bg-primary/10 p-3">
                  <p className="text-xs font-medium text-primary">Recommended shelf action</p>
                  <p className="text-sm text-foreground">{signal.recommended_action}</p>
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <Badge variant="outline">{humanize(signal.demand_theme)}</Badge>
                  <span>{signal.expected_impact}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString('fr-FR');
}

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: 'bad' }) {
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

function Scenario({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-md border p-3 space-y-1.5">
      <div className="flex items-center gap-2 text-foreground">
        {icon}
        <p className="text-sm font-medium">{title}</p>
      </div>
      <p className="text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
