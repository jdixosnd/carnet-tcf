import { Minus, Plus } from 'lucide-react';

/** − value + control (handoff Settings): 1px line-strong border, radius 8, divided cells. */
export function Stepper({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange(v: number): void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  const btn = 'press grid place-items-center px-3 py-[7px] text-ink-2 hover:bg-hover disabled:opacity-40';
  return (
    <div role="group" aria-label={label} className="flex items-stretch overflow-hidden rounded-[8px] border border-line-strong">
      <button type="button" aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => set(value - step)} className={btn}>
        <Minus size={14} strokeWidth={1.75} />
      </button>
      <output aria-live="polite" className="tnum grid min-w-[46px] place-items-center border-x border-line-strong px-3.5 text-[15px] font-bold">{value}</output>
      <button type="button" aria-label={`More: ${label}`} disabled={value >= max} onClick={() => set(value + step)} className={btn}>
        <Plus size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
