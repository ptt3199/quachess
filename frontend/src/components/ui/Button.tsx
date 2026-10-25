import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition select-none active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brass-500 text-night-900 hover:bg-brass-400 shadow-sm',
  secondary: 'bg-night-700 text-slate-200 border border-line-strong hover:bg-night-600 hover:text-white',
  ghost: 'text-slate-300 hover:bg-night-700 hover:text-white',
  danger: 'bg-rose-600 text-white hover:bg-rose-500',
  'danger-ghost': 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  children,
  ...rest
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      disabled={disabled || loading}
      className={[base, variants[variant], sizes[size], fullWidth ? 'w-full' : '', className || '']
        .join(' ')
        .trim()}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      ) : null}
      {children}
    </button>
  );
}
