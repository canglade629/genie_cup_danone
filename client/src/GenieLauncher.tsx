import { useState } from 'react';
import { useLocation } from 'react-router';
import { MessageSquareText } from 'lucide-react';
import { GenieConversation } from './GenieConversation';

export function GenieLauncher() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (location.pathname === '/ask') {
    return null;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[90] inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg hover:opacity-90"
        aria-label="Start Genie conversation"
      >
        <MessageSquareText className="h-4 w-4" />
        Start Genie conversation
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-[90] flex h-[min(640px,calc(100vh-6rem))] w-[min(440px,calc(100vw-2rem))] flex-col rounded-xl border bg-background p-4 shadow-2xl"
      role="dialog"
      aria-label="Genie conversation"
    >
      <GenieConversation compact onClose={() => setOpen(false)} />
    </div>
  );
}
