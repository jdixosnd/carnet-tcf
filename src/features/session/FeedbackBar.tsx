import { CornerDownLeft } from 'lucide-react';
import { Button } from '../../components/Button';
import { cn } from '../../lib/cn';

/** Result bar pinned to the bottom of the session screen. */
export function FeedbackBar({ ok, title, sub, onContinue }: { ok: boolean; title: string; sub: string; onContinue(): void }) {
  return (
    <div role="status" className={cn('flex items-center justify-between gap-6 border-t px-10 py-[22px] animate-[fade-in_150ms_ease-out]',
      ok ? 'border-knew-border bg-knew-bg' : 'border-forgot-border bg-forgot-bg')}>
      <div className="flex min-w-0 flex-col gap-1">
        <span className={cn('text-[18px] font-bold', ok ? 'text-knew-text' : 'text-forgot-text')}>{title}</span>
        <span className={cn('truncate text-[14px]', ok ? 'text-knew-sub' : 'text-forgot-sub')}>{sub}</span>
      </div>
      <Button variant="dark" autoFocus onClick={onContinue} className="flex shrink-0 items-center gap-2 px-[26px] py-[13px]">
        Continue <CornerDownLeft size={16} strokeWidth={1.75} />
      </Button>
    </div>
  );
}
