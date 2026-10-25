import { Link, useLocation } from 'react-router-dom';
import { History, House, Swords, Trophy, User } from 'lucide-react';
import type { ReactNode } from 'react';

interface TabBarProps {
  onRecord: () => void;
}

function TabLink({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-400/60 focus-visible:ring-inset rounded-lg ${
        active ? 'text-brass-400' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export function TabBar({ onRecord }: TabBarProps) {
  const { pathname } = useLocation();
  const activeHome = pathname === '/';
  const activeRankings = pathname.startsWith('/rankings');
  const activeMatches = pathname.startsWith('/matches');
  const activeMe = pathname.startsWith('/me');

  const iconClass = (active: boolean) => `w-5 h-5 ${active ? 'stroke-[2.4]' : ''}`;

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-night-850/95 backdrop-blur-md border-t border-line pb-safe"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-stretch">
        <TabLink to="/" label="Home" active={activeHome} icon={<House className={iconClass(activeHome)} />} />
        <TabLink
          to="/rankings"
          label="Rankings"
          active={activeRankings}
          icon={<Trophy className={iconClass(activeRankings)} />}
        />

        {/* Center FAB */}
        <div className="relative flex justify-center">
          <button
            type="button"
            onClick={onRecord}
            aria-label="Record a match result"
            className="absolute -top-7 w-14 h-14 rounded-full bg-brass-500 text-night-900 grid place-items-center border-4 border-night-900 shadow-fab transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
          >
            <Swords className="w-6 h-6" aria-hidden="true" />
          </button>
          <span className="self-end pb-1.5 text-[10px] font-bold text-brass-400">Record</span>
        </div>

        <TabLink
          to="/matches"
          label="Matches"
          active={activeMatches}
          icon={<History className={iconClass(activeMatches)} />}
        />
        <TabLink to="/me" label="Me" active={activeMe} icon={<User className={iconClass(activeMe)} />} />
      </div>
    </nav>
  );
}
