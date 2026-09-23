import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { Alert, AlertDescription, AlertTitle, Badge, GenieChat, Skeleton } from '@databricks/appkit-ui/react';
import { MessageSquareText, ShieldCheck, X } from 'lucide-react';

type Identity = {
  user: string;
  executionMode: 'on_behalf_of' | 'local';
};

type Suggestion = {
  label: string;
  prompt: string;
};

function getSuggestions(pathname: string): Suggestion[] {
  const storeMatch = pathname.match(/^\/stores\/([^/]+)/);
  if (storeMatch) {
    const storeId = decodeURIComponent(storeMatch[1]);
    return [
      { label: 'Summarize this store', prompt: `Summarize the current situation for store ${storeId}.` },
      {
        label: 'Recommend shelf actions',
        prompt: `What shelf actions should I prioritize for store ${storeId}, and why?`,
      },
      {
        label: 'Estimate revenue lift',
        prompt: `Estimate the weekly revenue lift from the best actions for store ${storeId}.`,
      },
    ];
  }

  const suggestionsByPath: Record<string, Suggestion[]> = {
    '/map': [
      { label: 'Prioritize store visits', prompt: 'Which stores should I visit first, and why?' },
      { label: 'Find compliance risks', prompt: 'Which stores have the biggest shelf compliance risks?' },
      { label: 'Compare revenue upside', prompt: 'Compare the estimated revenue upside across priority stores.' },
    ],
    '/signals': [
      { label: 'Show urgent signals', prompt: 'Which demand signals require action this week?' },
      { label: 'Match signals to stores', prompt: 'Which stores are most affected by current demand signals?' },
      { label: 'Recommend assortments', prompt: 'How should current signals change assortment and shelf placement?' },
    ],
    '/revenue': [
      { label: 'Explain revenue drivers', prompt: 'What are the largest shelf optimization revenue drivers?' },
      { label: 'Compare lift strategies', prompt: 'Compare the expected lift from each optimization strategy.' },
      { label: 'Find biggest opportunity', prompt: 'Where is the biggest near-term revenue opportunity?' },
    ],
    '/actions': [
      { label: 'Summarize accepted actions', prompt: 'Summarize the accepted recommendations and projected impact.' },
      { label: 'Group actions by store', prompt: 'Group accepted actions by store and rank their expected value.' },
      { label: 'Check decision patterns', prompt: 'What patterns do you see in the accepted actions?' },
    ],
  };

  return (
    suggestionsByPath[pathname] ?? [
      { label: 'Find priority stores', prompt: 'Which stores need attention first, and why?' },
      { label: 'Review demand signals', prompt: 'What demand signals should influence this week’s shelf actions?' },
      { label: 'Estimate revenue lift', prompt: 'Where can shelf optimization deliver the most revenue lift?' },
    ]
  );
}

function IdentityBadge() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [identityError, setIdentityError] = useState(false);

  useEffect(() => {
    const loadIdentity = async () => {
      try {
        const response = await fetch('/api/whoami');
        if (!response.ok) throw new Error('Identity request failed');
        setIdentity((await response.json()) as Identity);
      } catch {
        setIdentityError(true);
      }
    };

    void loadIdentity();
  }, []);

  if (identity) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" />
        {identity.user} · {identity.executionMode === 'on_behalf_of' ? 'your access' : 'local mode'}
      </Badge>
    );
  }

  if (identityError) {
    return <Badge variant="secondary">Identity unavailable</Badge>;
  }

  return <Skeleton className="h-6 w-52" />;
}

export function GenieConversation({ compact = false, onClose }: { compact?: boolean; onClose?: () => void }) {
  const location = useLocation();
  const chatRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => getSuggestions(location.pathname), [location.pathname]);

  const applySuggestion = (prompt: string) => {
    const textarea = chatRef.current?.querySelector('textarea');
    if (!textarea) return;

    const setNativeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.bind(textarea);
    setNativeValue?.(prompt);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  };

  return (
    <div className={compact ? 'flex h-full min-h-0 flex-col' : 'mx-auto w-full max-w-6xl space-y-4'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className={`flex items-center gap-2 font-semibold text-foreground ${compact ? 'text-lg' : 'text-2xl'}`}>
            <MessageSquareText className={compact ? 'h-5 w-5 text-primary' : 'h-6 w-6 text-primary'} />
            Ask Shelf Optimizer
          </h2>
          <p className="text-sm text-muted-foreground">
            Explore store priorities, shelf compliance, demand signals, and estimated revenue lift.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <IdentityBadge />
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close Genie conversation"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <Alert className={compact ? 'mt-3' : undefined}>
        <AlertTitle>AI-generated analysis — verify before acting</AlertTitle>
        <AlertDescription>
          Genie runs with your Databricks access in the deployed app. Open the generated SQL on each answer to inspect
          the tables, filters, and calculations used.
        </AlertDescription>
      </Alert>

      <div className={compact ? 'mt-3' : undefined}>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Suggested for this page</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => applySuggestion(suggestion.prompt)}
              className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={chatRef}
        className={
          compact
            ? 'mt-3 min-h-0 flex-1 overflow-hidden rounded-md border'
            : 'h-[620px] min-h-[480px] overflow-hidden rounded-md border'
        }
      >
        <GenieChat
          alias="default"
          placeholder="Ask about stores, shelf share, signals, or revenue lift…"
          className="h-full"
        />
      </div>
    </div>
  );
}
