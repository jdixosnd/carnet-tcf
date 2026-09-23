import { X } from 'lucide-react';
import { KeyCap } from '../../components/KeyCap';

export function TopBar({ pos, total, onEnd }: { pos: number; total: number; onEnd(): void }) {
  const done = Math.min(pos, total);
  return (
    <div className="flex items-center gap-6 px-10 py-5">
      <button type="button" onClick={onEnd} className="press flex items-center gap-1.5 text-[15px] text-ink-2 hover:text-ink">
        <X size={16} strokeWidth={1.75} /> End session <KeyCap className="ml-1">Esc</KeyCap>
      </button>
      <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-track" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${total ? (100 * done) / total : 0}%` }} />
      </div>
      <span className="tnum text-[15px] font-bold">{Math.min(done + 1, total)} / {total}</span>
    </div>
  );
}
