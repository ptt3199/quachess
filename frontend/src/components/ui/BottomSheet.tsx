import { useId } from 'react';
import type { PropsWithChildren } from 'react';
import { X } from 'lucide-react';
import { AccessibleDialog } from './AccessibleDialog';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Hide the title row (content provides its own header). */
  hideHeader?: boolean;
  maxWidthClass?: string;
  children: PropsWithChildren['children'];
}

/**
 * Mobile-first sheet: slides up from the bottom edge on phones,
 * renders as a centered dialog on larger screens.
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  hideHeader = false,
  maxWidthClass = 'max-w-md',
  children,
}: PropsWithChildren<BottomSheetProps>) {
  const titleId = useId();

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      labelledBy={titleId}
      align="bottom"
      panelClassName={`w-full ${maxWidthClass} mx-auto bg-night-800 border-t border-x border-line rounded-t-3xl shadow-sheet animate-slide-up outline-none sm:rounded-3xl sm:border`}
    >
      {!hideHeader && (
        <div className="pt-2 px-5">
          <div aria-hidden="true" className="mx-auto w-10 h-1 rounded-full bg-night-500 mb-3" />
          <div className="flex items-baseline justify-between gap-3 pb-3 border-b border-line">
            <h2 id={titleId} className="text-base font-bold text-white leading-tight">
              {title}
            </h2>
            <div className="flex items-center gap-2">
              {subtitle ? <span className="text-[11px] text-slate-500">{subtitle}</span> : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 grid place-items-center rounded-full text-slate-500 hover:text-white hover:bg-night-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 -mr-1.5"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
      <div className="pb-safe" />
    </AccessibleDialog>
  );
}
