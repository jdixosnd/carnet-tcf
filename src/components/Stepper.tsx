import { Minus, Plus } from 'lucide-react';

export function Stepper({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange(v: number): void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div role="group" aria-label={label} className="flex items-center rounded-[8px] border border-line-strong">
      <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => set(value - step)}
        className="press grid h-9 w-9 place-items-center text-ink-2 hover:bg-hover disabled:opacity-40">
        <Minus size={16} strokeWidth={1.75} />
      </button>
      <output aria-live="polite" className="tnum min-w-[44px] text-center text-[15px] font-bold">{value}</output>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => set(value + step)}
        className="press grid h-9 w-9 place-items-center text-ink-2 hover:bg-hover disabled:opacity-40">
        <Plus size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}
