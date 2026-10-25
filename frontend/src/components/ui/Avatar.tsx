const sizeMap = {
  xs: 'w-6 h-6 text-[9px]',
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

interface AvatarProps {
  name: string;
  size?: keyof typeof sizeMap;
  className?: string;
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const h = hue(name);
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${sizeMap[size]} ${className || ''}`.trim()}
      style={{
        backgroundColor: `hsl(${h} 40% 22%)`,
        color: `hsl(${h} 75% 78%)`,
      }}
    >
      {initials(name)}
    </span>
  );
}
