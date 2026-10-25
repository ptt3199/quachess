import { AlertCircle, CheckCircle, Info } from 'lucide-react';

type StatusKind = 'success' | 'error' | 'info';

interface StatusMessageProps {
  type: StatusKind;
  message: string;
  className?: string;
}

const styleMap: Record<StatusKind, string> = {
  success: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/25',
  error: 'bg-rose-500/10 text-rose-300 border border-rose-500/25',
  info: 'bg-sky-500/10 text-sky-300 border border-sky-500/25',
};

const iconMap: Record<StatusKind, string> = {
  success: 'text-emerald-400',
  error: 'text-rose-400',
  info: 'text-sky-400',
};

export function StatusMessage({ type, message, className }: StatusMessageProps) {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 ${styleMap[type]} ${className || ''}`.trim()}
    >
      {type === 'success' ? (
        <CheckCircle className={`w-4 h-4 shrink-0 ${iconMap[type]}`} aria-hidden="true" />
      ) : type === 'error' ? (
        <AlertCircle className={`w-4 h-4 shrink-0 ${iconMap[type]}`} aria-hidden="true" />
      ) : (
        <Info className={`w-4 h-4 shrink-0 ${iconMap[type]}`} aria-hidden="true" />
      )}
      <span>{message}</span>
    </div>
  );
}
