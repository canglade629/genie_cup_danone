import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Check, PlayCircle, X } from 'lucide-react';

type TourStep = {
  route: string;
  selector: string;
  eyebrow: string;
  title: string;
  explanation: string;
  businessValue: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    route: '/map',
    selector: '[data-tour="map-summary"]',
    eyebrow: 'Plan the day',
    title: 'Prioritize the stores that matter',
    explanation:
      'The Paris overview combines shelf compliance, Danone share of shelf, weekly sales, and execution risk into a clear visit priority.',
    businessValue:
      'Reps spend limited field time where revenue is most recoverable instead of treating every store equally.',
  },
  {
    route: '/map',
    selector: '[data-tour="signal-strip"]',
    eyebrow: 'Anticipate demand',
    title: 'Use external signals before demand appears in POS',
    explanation:
      'Strava activity, events, weather, mobility, search trends, and basket affinities explain why a local assortment should change.',
    businessValue:
      'Emerging fitness demand can justify more Oikos High Protein and hydration facings before the store runs out.',
  },
  {
    route: '/map',
    selector: '[data-tour="visit-queue"]',
    eyebrow: 'Choose the next visit',
    title: 'Turn data into a rep-ready briefing',
    explanation:
      'The visit queue summarizes the situation, urgency, share of shelf, compliance, and weekly value for every store.',
    businessValue: 'Shorter preparation and fewer low-value visits improve rep productivity and execution consistency.',
  },
  {
    route: '/stores/FR-PAR-001',
    selector: '[data-tour="store-header"]',
    eyebrow: 'Understand the store',
    title: 'Start each visit with one concise situation summary',
    explanation: 'The store brief explains what changed, why this location is important, and the commercial baseline.',
    businessValue: 'The rep enters the aisle with a fact-based objective instead of rebuilding context manually.',
  },
  {
    route: '/stores/FR-PAR-001',
    selector: '[data-tour="store-signals"]',
    eyebrow: 'Localize the recommendation',
    title: 'Connect neighborhood behavior to shelf actions',
    explanation:
      'Each active signal is translated into a concrete assortment or placement recommendation for this store.',
    businessValue:
      'Local signals make recommendations forward-looking and more relevant than a single national planogram.',
  },
  {
    route: '/stores/FR-PAR-001',
    selector: '[data-tour="photo-upload"]',
    eyebrow: 'Observe execution',
    title: 'Analyze a new shelf photo',
    explanation:
      'The rep can capture or upload a shelf image. Databricks FMAPI multimodal vision detects competitors, OOS voids, wrong placement, and missing promotional tags.',
    businessValue:
      'Faster OOS correction can recover 2–4% of total sales, while promo verification protects trade-spend ROI.',
  },
  {
    route: '/stores/FR-PAR-001',
    selector: '[data-tour="photo-history"]',
    eyebrow: 'Measure evolution',
    title: 'Compare shelf execution across visits',
    explanation: 'Photo history stores the image and its SoS, compliance, and OOS metrics in Lakebase.',
    businessValue:
      'A before/after record proves improvement, supports retailer conversations, and prevents recurring failures.',
  },
  {
    route: '/stores/FR-PAR-001?tab=sandbox',
    selector: '[data-tour="virtual-shelf"]',
    eyebrow: 'Test the change',
    title: 'Simulate a better shelf before negotiating',
    explanation:
      'Drag products between zones or apply the AI layout to move high-margin products to eye-level and fill empty facings.',
    businessValue: 'Premium SKUs moved into the 1.2–1.6m strike zone can gain 10–15% sales lift.',
  },
  {
    route: '/stores/FR-PAR-001?tab=sandbox',
    selector: '[data-tour="business-value"]',
    eyebrow: 'Quantify the outcome',
    title: 'See the weekly euro impact update live',
    explanation:
      'The value panel separates OOS recovery, eye-level placement, promotional compliance, and cross-merchandising gains.',
    businessValue: 'The rep can defend a shelf change with a commercial case—not only a visual preference.',
  },
  {
    route: '/actions',
    selector: '[data-tour="actions-summary"]',
    eyebrow: 'Close the loop',
    title: 'Track accepted recommendations',
    explanation:
      'Lakebase records the store, decision, expected lift, weekly value, and timestamp for every accepted action.',
    businessValue: 'Managers gain an auditable execution pipeline that can later be compared with realized POS lift.',
  },
];

type TargetRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

export function GuidedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const step = TOUR_STEPS[stepIndex];

  const finish = useCallback(() => {
    setActive(false);
    setTargetRect(null);
    window.localStorage.setItem('shelf-optimizer-tour-completed', '1');
    void navigate(location.pathname, { replace: true });
  }, [location.pathname, navigate]);

  const next = useCallback(() => {
    if (stepIndex === TOUR_STEPS.length - 1) {
      finish();
      return;
    }
    setTargetRect(null);
    setStepIndex((current) => current + 1);
  }, [finish, stepIndex]);

  const previous = useCallback(() => {
    if (stepIndex === 0) return;
    setTargetRect(null);
    setStepIndex((current) => current - 1);
  }, [stepIndex]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tour') === '1') {
      queueMicrotask(() => {
        setStepIndex(0);
        setActive(true);
      });
    }
  }, [location.search]);

  useEffect(() => {
    if (!active || !step) return;

    const expected = new URL(step.route, window.location.origin);
    if (location.pathname !== expected.pathname || location.search !== expected.search) {
      void navigate(`${expected.pathname}${expected.search}`, { replace: true });
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    const locate = () => {
      if (cancelled) return;
      const element = document.querySelector<HTMLElement>(step.selector);
      if (!element && attempts < 30) {
        attempts += 1;
        timer = window.setTimeout(locate, 120);
        return;
      }
      if (!element) return;

      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      timer = window.setTimeout(() => {
        if (cancelled) return;
        const rect = element.getBoundingClientRect();
        setTargetRect({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
        });
      }, 350);
    };

    locate();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [active, location.pathname, location.search, navigate, step]);

  useEffect(() => {
    if (!active) return;

    const update = () => {
      const element = document.querySelector<HTMLElement>(step.selector);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      setTargetRect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') previous();
    };

    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [active, finish, next, previous, step.selector]);

  const panelStyle = useMemo<CSSProperties>(() => {
    if (typeof window === 'undefined' || window.innerWidth < 640) {
      return { left: 12, right: 12, bottom: 12 };
    }
    if (!targetRect) {
      return {
        width: 390,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const width = 390;
    const left = Math.min(
      window.innerWidth - width - 16,
      Math.max(16, targetRect.left + targetRect.width / 2 - width / 2)
    );
    const roomBelow = window.innerHeight - targetRect.bottom;
    const top = roomBelow > 330 ? targetRect.bottom + 16 : Math.max(16, targetRect.top - 300);
    return { width, left, top };
  }, [targetRect]);

  function startTour() {
    setStepIndex(0);
    setTargetRect(null);
    setActive(true);
    void navigate('/map?tour=1', { replace: true });
  }

  if (!active || !step) {
    return (
      <button
        type="button"
        onClick={startTour}
        className="fixed bottom-5 left-5 z-[90] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg hover:opacity-90"
        aria-label="Start guided tour"
      >
        <PlayCircle className="h-4 w-4" />
        Guided tour
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none" aria-live="polite">
      {targetRect && (
        <div
          className="fixed rounded-lg border-2 border-primary transition-all duration-300"
          style={{
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.62), 0 0 0 4px rgb(255 255 255 / 0.25)',
          }}
        />
      )}
      {!targetRect && <div className="fixed inset-0 bg-black/60" />}

      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Guided tour step ${stepIndex + 1} of ${TOUR_STEPS.length}`}
        className="fixed pointer-events-auto rounded-xl border bg-background p-5 shadow-2xl"
        style={panelStyle}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">{step.eyebrow}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Step {stepIndex + 1} of {TOUR_STEPS.length}
            </p>
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close walkthrough"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-xl font-semibold text-foreground mt-3">{step.title}</h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{step.explanation}</p>

        <div className="rounded-md bg-success/10 p-3 mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-success">Business value</p>
          <p className="text-sm text-foreground mt-1">{step.businessValue}</p>
        </div>

        <div className="flex gap-1 mt-4" aria-hidden="true">
          {TOUR_STEPS.map((tourStep, index) => (
            <span
              key={tourStep.title}
              className={`h-1 flex-1 rounded-full ${index <= stepIndex ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 mt-5">
          <button type="button" onClick={finish} className="text-sm text-muted-foreground hover:text-foreground">
            Skip tour
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={previous}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm text-foreground disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
            >
              {stepIndex === TOUR_STEPS.length - 1 ? (
                <>
                  Finish <Check className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
