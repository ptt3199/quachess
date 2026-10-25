import type { HTMLAttributes, PropsWithChildren } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...rest }: PropsWithChildren<CardProps>) {
  return (
    <div className={`bg-night-800 border border-line rounded-2xl ${className || ''}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between px-1">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{children}</h2>
      {action}
    </div>
  );
}
