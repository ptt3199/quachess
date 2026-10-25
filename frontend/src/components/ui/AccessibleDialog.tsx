import { useEffect, useRef } from 'react';
import type { PropsWithChildren } from 'react';

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  /** Position of the panel: centered dialog or bottom sheet. */
  align?: 'center' | 'bottom';
  /** Extra classes for the overlay container. */
  overlayClassName?: string;
  /** Classes for the panel itself. */
  panelClassName?: string;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function AccessibleDialog({
  isOpen,
  onClose,
  labelledBy,
  describedBy,
  align = 'center',
  overlayClassName,
  panelClassName,
  children,
}: PropsWithChildren<AccessibleDialogProps>) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const activeBeforeOpen = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [];
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      panelRef.current?.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const elements = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (elements.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      activeBeforeOpen?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const alignClasses =
    align === 'bottom' ? 'items-end sm:items-center justify-center' : 'items-center justify-center';

  return (
    <div
      className={`fixed inset-0 z-50 flex p-0 sm:p-4 bg-night-950/75 backdrop-blur-sm animate-backdrop-in ${alignClasses} ${overlayClassName || ''}`.trim()}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={panelClassName}
        style={{ overscrollBehavior: 'contain' }}
      >
        {children}
      </div>
    </div>
  );
}
