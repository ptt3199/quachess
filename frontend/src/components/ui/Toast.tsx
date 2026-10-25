import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

type ShowToast = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ShowToast>(() => {});

const icons: Record<ToastKind, ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />,
  error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />,
  info: <Info className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback<ShowToast>((message, kind = 'info') => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-3 inset-x-0 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2 bg-night-700 border border-line-strong rounded-full pl-3 pr-4 py-2.5 text-sm text-slate-100 shadow-lg animate-fade-in max-w-md"
          >
            {icons[toast.kind]}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
