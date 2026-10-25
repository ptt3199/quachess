import type { PropsWithChildren } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  labelClassName?: string;
}

export const fieldControlClass =
  'w-full px-3 py-2.5 text-sm rounded-xl bg-night-850 border border-line-strong text-slate-100 placeholder:text-slate-500 transition-colors focus:ring-2 focus:ring-brass-500/50 focus:border-brass-500 focus:outline-none';

export function FormField({
  id,
  label,
  required,
  hint,
  error,
  labelClassName,
  children,
}: PropsWithChildren<FormFieldProps>) {
  return (
    <div>
      <label
        htmlFor={id}
        className={
          labelClassName ||
          'block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5'
        }
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-slate-500 text-[11px]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-rose-400 text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
