import * as S from '@radix-ui/react-switch';

export function Switch({ checked, onCheckedChange, label, id }: { checked: boolean; onCheckedChange(v: boolean): void; label: string; id?: string }) {
  return (
    <S.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className="relative h-[22px] w-10 shrink-0 cursor-pointer rounded-full bg-line-strong transition-colors duration-150 data-[state=checked]:bg-accent"
    >
      <S.Thumb className="block h-4 w-4 translate-x-[3px] rounded-full bg-white shadow-seg transition-transform duration-150 data-[state=checked]:translate-x-[21px]" />
    </S.Root>
  );
}
