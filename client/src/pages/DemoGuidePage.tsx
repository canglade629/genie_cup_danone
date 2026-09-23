import { Link } from 'react-router';
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@databricks/appkit-ui/react';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Euro,
  Images,
  MapPinned,
  Move,
  Presentation,
  Sparkles,
  Zap,
} from 'lucide-react';

const steps = [
  {
    number: 1,
    duration: '45 sec',
    title: 'Start with the Paris priority map',
    path: '/',
    action: 'Show the ranked visit queue, then open Carrefour Porte de Versailles.',
    say: 'The rep starts the day knowing where to go—not just which stores exist. Priority combines shelf compliance, OOS risk, share of shelf, sales value, and local demand signals.',
    value: 'Focuses field time on the stores with the largest recoverable revenue and reduces low-value visits.',
    icon: MapPinned,
  },
  {
    number: 2,
    duration: '60 sec',
    title: 'Explain external demand signals',
    path: '/signals',
    action: 'Filter to “Fitness & Strava” and open a high-scoring signal.',
    say: 'A spike in nearby running and cycling activity is a leading indicator for high-protein and hydration demand. The system converts that signal into a concrete shelf action.',
    value:
      'Demand-aligned assortment can unlock 10–15% lift on relocated high-protein SKUs and prevent event-driven OOS.',
    icon: Zap,
  },
  {
    number: 3,
    duration: '45 sec',
    title: 'Open the store briefing',
    path: '/stores/FR-PAR-001',
    action: 'Point to the situation summary, active local signals, SoS, compliance, and weekly sales.',
    say: 'Before entering the store, the rep gets a concise explanation of what changed, why the store matters, and what action is most likely to pay back.',
    value: 'Shortens preparation time and turns fragmented data into a repeatable, evidence-based visit plan.',
    icon: Sparkles,
  },
  {
    number: 4,
    duration: '90 sec',
    title: 'Upload and analyze a shelf photo',
    path: '/stores/FR-PAR-001',
    action: 'Upload a photo—or click “Analyze without new upload”—and review the red boxes and alerts.',
    say: 'The vision layer detects Danone and competitors, empty facings, wrong placement, missing promo tags, and competitors occupying eye-level.',
    value: 'Restocking OOS voids can recover 2–4% of total sales; promo verification protects paid trade-spend ROI.',
    icon: Camera,
  },
  {
    number: 5,
    duration: '30 sec',
    title: 'Show photo history and evolution',
    path: '/stores/FR-PAR-001',
    action: 'Scroll to the photo timeline and compare SoS, compliance, and OOS across visits.',
    say: 'Every visit becomes evidence. Reps and managers can prove whether execution improved and whether a recommendation was sustained.',
    value: 'Creates a closed feedback loop, supports retailer conversations, and reduces repeat compliance failures.',
    icon: Images,
  },
  {
    number: 6,
    duration: '90 sec',
    title: 'Simulate the recommended shelf',
    path: '/stores/FR-PAR-001',
    action: 'Open “Virtual shelf,” drag products, then click “Apply AI layout.”',
    say: 'The rep can test changes before negotiating with the store: move Oikos to eye-level, replace low-margin competitor facings, fill OOS slots, and improve cross-merchandising.',
    value: 'Eye-level placement can lift relocated SKUs 10–15%; cross-merchandising increases basket size.',
    icon: Move,
  },
  {
    number: 7,
    duration: '30 sec',
    title: 'Close with euros and accountability',
    path: '/actions',
    action: 'Save the simulation, accept the next-best action, then open the Accepted actions page.',
    say: 'The business-value panel updates live, while Lakebase records the decision, projected lift, and rep action for follow-up.',
    value: 'Connects recommendations to weekly euro upside and creates an auditable execution pipeline.',
    icon: Euro,
  },
] as const;

export function DemoGuidePage() {
  const totalMinutes = Math.round(steps.reduce((total, step) => total + Number.parseInt(step.duration, 10), 0) / 60);

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <div className="rounded-lg border bg-primary/10 p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="secondary">Hackathon demo script · ≈ {totalMinutes} minutes</Badge>
            <h2 className="text-3xl font-semibold text-foreground">Shelf Optimizer walkthrough</h2>
            <p className="text-sm text-muted-foreground max-w-3xl">
              Follow this sequence to tell one clear story: prioritize the right store, understand local demand,
              diagnose the shelf, simulate a better layout, and quantify the value.
            </p>
          </div>
          <Link
            to="/map"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Start the demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ValueHeadline value="2–4%" label="total sales recovery" detail="from faster OOS detection and restocking" />
        <ValueHeadline
          value="10–15%"
          label="relocated SKU lift"
          detail="from premium products in the eye-level strike zone"
        />
        <ValueHeadline
          value="€ tracked"
          label="per accepted action"
          detail="with Lakebase history and accountable follow-up"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="h-5 w-5" />
            Presenter flow
          </CardTitle>
          <CardDescription>
            Each step includes where to click, what to say, and the business outcome to emphasize.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="rounded-lg border p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex items-start gap-3 lg:w-64 shrink-0">
                    <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      {step.number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <Badge variant="outline">{step.duration}</Badge>
                      </div>
                      <h3 className="font-semibold text-foreground mt-1">{step.title}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 text-sm">
                    <GuideBlock label="Do" body={step.action} />
                    <GuideBlock label="Say" body={step.say} />
                    <GuideBlock label="Business value" body={step.value} value />
                  </div>

                  <Link
                    to={step.path}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline whitespace-nowrap self-start"
                  >
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Closing pitch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-foreground">
            “This is not only computer vision. It is a field-sales decision system: it identifies the highest-value
            store, explains the demand context, recommends the best shelf action, predicts the euro impact, and records
            whether the action happened.”
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ClosingPoint text="Scale fixed-camera imagery through Delta Lake and batch inference." />
            <ClosingPoint text="Localize recommendations using store POS, events, mobility, and weather." />
            <ClosingPoint text="Track accepted actions and outcomes in Lakebase for continuous learning." />
            <ClosingPoint text="Share category insights with retailers to strengthen Category Captain positioning." />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ValueHeadline({ value, label, detail }: { value: string; label: string; detail: string }) {
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

function GuideBlock({ label, body, value }: { label: string; body: string; value?: boolean }) {
  return (
    <div className={value ? 'rounded-md bg-success/10 p-3' : 'rounded-md bg-muted p-3'}>
      <p className={`text-xs font-medium uppercase tracking-wide ${value ? 'text-success' : 'text-muted-foreground'}`}>
        {label}
      </p>
      <p className="text-foreground mt-1 leading-relaxed">{body}</p>
    </div>
  );
}

function ClosingPoint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border p-3">
      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
      <span className="text-muted-foreground">{text}</span>
    </div>
  );
}
