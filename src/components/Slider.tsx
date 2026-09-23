import * as S from '@radix-ui/react-slider';

export function Slider({ value, min, max, step, onChange, label }: { value: number; min: number; max: number; step: number; onChange(v: number): void; label: string }) {
  return (
    <S.Root className="relative flex h-5 w-full touch-none items-center" value={[value]} min={min} max={max} step={step}
      onValueChange={v => onChange(Math.round(v[0] * 100) / 100)}>
      <S.Track className="relative h-1 grow rounded-full bg-line">
        <S.Range className="absolute h-full rounded-full bg-accent" />
      </S.Track>
      <S.Thumb aria-label={label} className="block h-4 w-4 rounded-full border-2 border-accent bg-surface" />
    </S.Root>
  );
}
