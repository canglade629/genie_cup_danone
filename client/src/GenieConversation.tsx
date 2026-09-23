import { useEffect, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  GenieChat,
  Skeleton,
} from '@databricks/appkit-ui/react';
import { MessageSquareText, ShieldCheck, X } from 'lucide-react';

type Identity = {
  user: string;
  executionMode: 'on_behalf_of' | 'local';
};

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

export function GenieConversation({
  compact = false,
  onClose,
}: {
  compact?: boolean;
  onClose?: () => void;
}) {
  return (
    <div className={compact ? 'flex h-full min-h-0 flex-col' : 'mx-auto w-full max-w-6xl space-y-4'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2
            className={`flex items-center gap-2 font-semibold text-foreground ${
              compact ? 'text-lg' : 'text-2xl'
            }`}
          >
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
          Genie runs with your Databricks access in the deployed app. Open the generated SQL on each
          answer to inspect the tables, filters, and calculations used.
        </AlertDescription>
      </Alert>

      <div
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
