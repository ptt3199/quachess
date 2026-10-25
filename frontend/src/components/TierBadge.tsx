import { Crown } from 'lucide-react';

export type TierKey = 'WOOD' | 'BRONZE' | 'SILVER' | 'GOLD' | 'MASTER';

const tierStyles: Record<TierKey, { label: string; className: string }> = {
  WOOD: { label: 'Wood', className: 'bg-stone-500/15 text-stone-300 border-stone-500/30' },
  BRONZE: { label: 'Bronze', className: 'bg-amber-700/20 text-amber-400 border-amber-700/40' },
  SILVER: { label: 'Silver', className: 'bg-slate-400/15 text-slate-300 border-slate-400/30' },
  GOLD: { label: 'Gold', className: 'bg-brass-500/15 text-brass-300 border-brass-500/40' },
  MASTER: { label: 'Master', className: 'bg-violet-500/15 text-violet-300 border-violet-500/40' },
};

export function tierLabel(tier: string): string {
  return tierStyles[tier as TierKey]?.label ?? tier;
}

export function TierBadge({ tier, className }: { tier: string; className?: string }) {
  const style = tierStyles[tier as TierKey] ?? tierStyles.WOOD;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${style.className} ${className || ''}`.trim()}
    >
      {tier === 'MASTER' && <Crown className="w-2.5 h-2.5" aria-hidden="true" />}
      {style.label}
    </span>
  );
}
