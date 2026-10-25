import { Castle, Timer, Zap } from 'lucide-react';
import type { GameType } from '../types';
import { SegmentedControl } from './ui/SegmentedControl';

export const gameTypeOptions: Array<{ value: GameType; label: string; icon?: React.ReactNode }> = [
  { value: 'RAPID', label: 'Rapid', icon: <Zap className="w-3.5 h-3.5" /> },
  { value: 'BLITZ', label: 'Blitz', icon: <Timer className="w-3.5 h-3.5" /> },
  { value: 'CLASSICAL', label: 'Classical', icon: <Castle className="w-3.5 h-3.5" /> },
];

interface CategoryTabsProps {
  selectedCategory: GameType;
  onSelectCategory: (category: GameType) => void;
  className?: string;
}

export function CategoryTabs({ selectedCategory, onSelectCategory, className }: CategoryTabsProps) {
  return (
    <SegmentedControl
      ariaLabel="Game category"
      options={gameTypeOptions}
      value={selectedCategory}
      onChange={onSelectCategory}
      className={`w-full ${className || ''}`.trim()}
    />
  );
}
