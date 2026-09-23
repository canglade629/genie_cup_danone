import { Navigate, useNavigate } from 'react-router';
import type { ReactNode } from 'react';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@databricks/appkit-ui/react';
import { ArrowRight, Camera, Database, Euro, MapPinned, Move, PlayCircle, Sparkles, Zap } from 'lucide-react';

const WELCOME_KEY = 'shelf-optimizer-welcome-seen';

export function FirstConnectionPage() {
  const hasSeenWelcome = window.localStorage.getItem(WELCOME_KEY) === '1';

  if (hasSeenWelcome) {
    return <Navigate to="/map" replace />;
  }

  return <LandingPage />;
}

export function LandingPage() {
  const navigate = useNavigate();

  const enter = (path: string) => {
    window.localStorage.setItem(WELCOME_KEY, '1');
    navigate(path);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <section className="relative overflow-hidden rounded-xl border bg-primary/10 px-6 py-10 md:px-10 md:py-14">
        <div className="relative z-10 max-w-3xl space-y-5">
          <Badge variant="secondary">AI-powered retail execution · Paris pilot</Badge>
          <div className="space-y-3">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              Turn every shelf photo into the next best sales action.
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl">
              Shelf Optimizer helps field reps prioritize stores, understand local demand, detect execution gaps,
              simulate a better shelf, and quantify the euro impact before leaving.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => enter('/demo')}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              <PlayCircle className="h-4 w-4" />
              Start guided walkthrough
            </button>
            <button
              type="button"
              onClick={() => enter('/map')}
              className="inline-flex items-center justify-center gap-2 rounded-md border bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Explore the Paris map
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Recommended for first-time users: the walkthrough takes about seven minutes and includes presenter notes.
          </p>
        </div>

        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10" />
        <div className="absolute right-20 -bottom-24 h-56 w-56 rounded-full bg-success/10" />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ValueCard
          value="2–4%"
          label="total sales recovery"
          detail="by detecting and restocking out-of-stock facings"
        />
        <ValueCard
          value="10–15%"
          label="lift on relocated SKUs"
          detail="by moving premium products into the eye-level strike zone"
        />
        <ValueCard
          value="Live €"
          label="business-value simulation"
          detail="for OOS, placement, trade spend, and cross-merchandising"
        />
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-2xl font-semibold text-foreground">One workflow, from signal to value</h3>
          <p className="text-sm text-muted-foreground">
            Each feature gives the rep an explanation, an action, and a measurable business outcome.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={<MapPinned className="h-5 w-5" />}
            title="Prioritize the right store"
            explanation="Rank Paris stores using SoS, compliance, OOS, weekly sales, and active demand signals."
            value="Spend field time where revenue is most recoverable."
          />
          <FeatureCard
            icon={<Zap className="h-5 w-5" />}
            title="Anticipate local demand"
            explanation="Use Strava, events, weather, mobility, search, and basket affinity signals."
            value="Put high-protein, hydration, or family formats where demand is emerging."
          />
          <FeatureCard
            icon={<Camera className="h-5 w-5" />}
            title="Analyze shelf execution"
            explanation="Detect competitors, OOS voids, wrong placement, and missing promotional tags."
            value="Recover lost sales and protect paid trade-spend execution."
          />
          <FeatureCard
            icon={<Database className="h-5 w-5" />}
            title="Track evolution"
            explanation="Store visit photos and analysis history in Lakebase for before/after comparison."
            value="Prove improvement and prevent recurring compliance failures."
          />
          <FeatureCard
            icon={<Move className="h-5 w-5" />}
            title="Simulate a better shelf"
            explanation="Drag products in a virtual planogram or apply the AI-recommended layout."
            value="Test eye-level, OOS, and cross-merch changes before negotiating."
          />
          <FeatureCard
            icon={<Euro className="h-5 w-5" />}
            title="Convert actions into euros"
            explanation="See weekly upside update as the shelf layout changes, then save the decision."
            value="Create an auditable link from recommendation to commercial impact."
          />
        </div>
      </section>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Built on Databricks
          </CardTitle>
          <CardDescription>
            One governed workflow across Delta Lake analytics, Databricks Apps, and Lakebase.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <ArchitecturePoint title="Delta Lake" body="Sales, planograms, stores, and external demand signals." />
          <ArchitecturePoint title="Databricks Apps" body="Rep-facing map, photo analysis, and shelf simulator." />
          <ArchitecturePoint title="Lakebase" body="Photo history, accepted actions, and saved simulations." />
        </CardContent>
      </Card>
    </div>
  );
}

function ValueCard({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <Card>
      <CardContent className="pt-5 space-y-1">
        <p className="text-3xl font-semibold text-success">{value}</p>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function FeatureCard({
  icon,
  title,
  explanation,
  value,
}: {
  icon: ReactNode;
  title: string;
  explanation: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="text-primary">{icon}</span>
          {title}
        </CardTitle>
        <CardDescription>{explanation}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md bg-success/10 p-3">
          <p className="text-xs font-medium text-success">Business value</p>
          <p className="text-sm text-foreground mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ArchitecturePoint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{body}</p>
    </div>
  );
}
