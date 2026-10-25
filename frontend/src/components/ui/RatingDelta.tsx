import { formatRatingChange } from '../../utils/formatters';

interface RatingDeltaProps {
  value: number | null | undefined;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const sizeMap = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
} as const;

export function RatingDelta({ value, size = 'sm', className }: RatingDeltaProps) {
  if (value === null || value === undefined) return null;
  const tone =
    value > 0 ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : 'text-slate-500';
  return (
    <span className={`font-mono font-bold tabular ${sizeMap[size]} ${tone} ${className || ''}`.trim()}>
      {formatRatingChange(value)}
    </span>
  );
}
