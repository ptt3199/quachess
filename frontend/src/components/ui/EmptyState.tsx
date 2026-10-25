import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  className?: string;
}

export function EmptyState({ icon, title, hint, className }: EmptyStateProps) {
  return (
    <div className={`py-10 px-6 text-center ${className || ''}`.trim()}>
      {icon ? (
        <div className="mx-auto w-12 h-12 rounded-full bg-night-700 text-slate-400 flex items-center justify-center mb-3">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      {hint ? <p className="text-xs text-slate-500 mt-1">{hint}</p> : null}
    </div>
  );
}
