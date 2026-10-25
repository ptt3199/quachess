import type { ReactNode } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * iOS-style segmented control for switching between a few options.
 * Semantically a group of toggle buttons (not tabs — use Tabs for panels).
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const height = size === 'sm' ? 'h-8' : 'h-10';
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex bg-night-850 border border-line rounded-xl p-1 ${className || ''}`.trim()}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`flex-1 ${height} px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 ${
              active ? 'bg-night-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {option.icon ? <span aria-hidden="true">{option.icon}</span> : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
