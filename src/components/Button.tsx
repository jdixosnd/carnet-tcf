import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'small' | 'danger' | 'link' | 'chip';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent font-bold text-[16px] px-6 py-[14px] rounded-[10px] hover:brightness-110',
  secondary: 'border border-line-strong text-ink text-[16px] px-5 py-[13px] rounded-[10px] hover:bg-hover',
  dark: 'bg-ink text-on-ink font-bold text-[16px] px-8 py-[14px] rounded-[10px] hover:opacity-90',
  small: 'border border-line-strong text-ink text-[14px] px-[14px] py-[9px] rounded-[8px] hover:bg-hover',
  danger: 'border border-forgot-solid text-forgot-text text-[14px] px-[14px] py-[9px] rounded-[8px] hover:bg-forgot-bg',
  link: 'text-accent text-[15px] underline-offset-4 hover:underline hover:text-accent-strong',
  chip: 'border border-line-strong text-ink text-[15px] px-4 py-2 rounded-full hover:bg-hover inline-flex items-center gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }>(
  ({ variant = 'secondary', className, type = 'button', onMouseDown, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      // Chips (Listen, Replay…) sit next to keyboard-driven cards: a mouse click must not move focus,
      // or Space/Enter would press the chip instead of turning the card.
      onMouseDown={e => { if (variant === 'chip') e.preventDefault(); onMouseDown?.(e); }}
      className={cn('press cursor-pointer disabled:cursor-not-allowed disabled:opacity-45', VARIANTS[variant], className)}
      {...rest}
    />
  ),
);
Button.displayName = 'Button';
