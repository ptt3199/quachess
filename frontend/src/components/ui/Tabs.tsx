import { useMemo, useRef } from 'react';
import type { ReactNode } from 'react';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  ariaLabel: string;
  className?: string;
  tabClassName?: string;
  activeTabClassName?: string;
  inactiveTabClassName?: string;
  fullWidth?: boolean;
  idPrefix?: string;
}

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel,
  className,
  tabClassName,
  activeTabClassName,
  inactiveTabClassName,
  fullWidth = false,
  idPrefix = 'tab',
}: TabsProps<T>) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = useMemo(
    () => tabs.findIndex((tab) => tab.id === activeTab),
    [tabs, activeTab],
  );

  const moveFocus = (nextIndex: number) => {
    const total = tabs.length;
    const normalized = ((nextIndex % total) + total) % total;
    const nextTab = tabs[normalized];
    onChange(nextTab.id);
    tabRefs.current[normalized]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={className}
      onKeyDown={(event) => {
        if (activeIndex < 0) return;
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          moveFocus(activeIndex + 1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          moveFocus(activeIndex - 1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          moveFocus(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          moveFocus(tabs.length - 1);
        }
      }}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            id={`${idPrefix}-${tab.id}`}
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={[
              fullWidth ? 'flex-1' : '',
              tabClassName || '',
              isActive
                ? activeTabClassName || ''
                : inactiveTabClassName || '',
            ]
              .join(' ')
              .trim()}
          >
            {tab.icon ? <span aria-hidden="true">{tab.icon}</span> : null}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
