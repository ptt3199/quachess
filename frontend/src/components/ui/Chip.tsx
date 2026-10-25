import type { PropsWithChildren } from 'react';

export type ChipVariant = 'neutral' | 'brand' | 'success' | 'danger' | 'info' | 'outline';

const variants: Record<ChipVariant, string> = {
  neutral: 'bg-night-700 text-slate-300',
  brand: 'bg-brass-500/15 text-brass-300 border border-brass-500/30',
  success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
  info: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
  outline: 'border border-line-strong text-slate-400',
};

interface ChipProps {
  variant?: ChipVariant;
  className?: string;
}

export function Chip({ variant = 'neutral', className, children }: PropsWithChildren<ChipProps>) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${variants[variant]} ${className || ''}`.trim()}
    >
      {children}
    </span>
  );
}
