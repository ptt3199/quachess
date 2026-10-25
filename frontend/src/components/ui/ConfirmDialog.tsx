import { createContext, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AccessibleDialog } from './AccessibleDialog';
import { Button } from './Button';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const nextId = useRef(0);

  const confirm = useRef<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending((prev) => {
        prev?.resolve(false);
        return { options, resolve };
      });
    });
  }).current;

  const settle = (value: boolean) => {
    setPending((prev) => {
      prev?.resolve(value);
      return null;
    });
  };

  const titleId = `confirm-title-${nextId.current++}`;
  const open = pending !== null;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AccessibleDialog
        isOpen={open}
        onClose={() => settle(false)}
        labelledBy={titleId}
        overlayClassName="z-[70]"
        panelClassName="w-full max-w-xs mx-auto bg-night-800 border border-line rounded-2xl p-5 outline-none animate-pop"
      >
        {pending ? (
          <>
            <h2 id={titleId} className="text-sm font-bold text-white">
              {pending.options.title}
            </h2>
            {pending.options.message ? (
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{pending.options.message}</p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" fullWidth onClick={() => settle(false)}>
                {pending.options.cancelLabel ?? 'Cancel'}
              </Button>
              <Button
                variant={pending.options.danger ? 'danger' : 'primary'}
                size="sm"
                fullWidth
                onClick={() => settle(true)}
              >
                {pending.options.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </>
        ) : null}
      </AccessibleDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext);
}
