import { Link, useLocation } from 'react-router-dom';
import { Trophy, Swords, Calendar, Shield } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
      <div className="max-w-md mx-auto grid grid-cols-4 h-16">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center space-y-1 transition min-h-0 ${
            currentPath === '/'
              ? 'text-blue-600 font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Trophy className={`w-5 h-5 ${currentPath === '/' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px]">Rankings</span>
        </Link>

        <Link
          to="/matches"
          className={`flex flex-col items-center justify-center space-y-1 transition min-h-0 ${
            currentPath.startsWith('/matches')
              ? 'text-blue-600 font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Swords className={`w-5 h-5 ${currentPath.startsWith('/matches') ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px]">Matches</span>
        </Link>

        <Link
          to="/schedule"
          className={`flex flex-col items-center justify-center space-y-1 transition min-h-0 ${
            currentPath.startsWith('/schedule')
              ? 'text-blue-600 font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className={`w-5 h-5 ${currentPath.startsWith('/schedule') ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px]">Schedule</span>
        </Link>

        <Link
          to="/admin"
          className={`flex flex-col items-center justify-center space-y-1 transition min-h-0 ${
            currentPath.startsWith('/admin')
              ? 'text-blue-600 font-semibold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield className={`w-5 h-5 ${currentPath.startsWith('/admin') ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[11px]">Admin</span>
        </Link>
      </div>
    </nav>
  );
};
