import type { GameType } from '../types';

interface RatingCategorySelectorProps {
  selectedCategory: GameType;
  onSelectCategory: (category: GameType) => void;
}

export const RatingCategorySelector: React.FC<RatingCategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const categories: { type: GameType; label: string; icon: string }[] = [
    { type: 'RAPID', label: 'Rapid', icon: '⏱️' },
    { type: 'BLITZ', label: 'Blitz', icon: '⚡' },
    { type: 'CLASSICAL', label: 'Classical', icon: '♟️' },
  ];

  return (
    <div className="bg-slate-200 p-1 rounded-xl grid grid-cols-3 gap-1 shadow-inner">
      {categories.map((cat) => (
        <button
          key={cat.type}
          onClick={() => onSelectCategory(cat.type)}
          className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition min-h-0 ${
            selectedCategory === cat.type
              ? 'bg-white text-blue-600 shadow-sm font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
        </button>
      ))}
    </div>
  );
};
