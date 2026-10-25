interface LoadingStateProps {
  label?: string;
  className?: string;
  spinnerClassName?: string;
  textClassName?: string;
}

export function LoadingState({
  label = 'Loading…',
  className,
  spinnerClassName,
  textClassName,
}: LoadingStateProps) {
  return (
    <div className={`p-8 text-center text-slate-400 space-y-2 ${className || ''}`.trim()} aria-live="polite">
      <div
        className={`animate-spin w-6 h-6 border-2 border-brass-500 border-t-transparent rounded-full mx-auto ${spinnerClassName || ''}`.trim()}
        aria-hidden="true"
      />
      <p className={`text-xs ${textClassName || ''}`.trim()}>{label}</p>
    </div>
  );
}
