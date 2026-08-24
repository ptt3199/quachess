import { Link } from 'react-router-dom';
import { Shield, ShieldAlert } from 'lucide-react';
import type { AdminStatus } from '../types';

interface HeaderProps {
  adminStatus: AdminStatus | null;
}

export const Header: React.FC<HeaderProps> = ({ adminStatus }) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center space-x-2 text-left focus:outline-none min-h-0"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
            ♔
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight">Quaveo Chess Club</h1>
            <p className="text-xs text-slate-400">Rating & Schedule</p>
          </div>
        </Link>

        <Link
          to="/admin"
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-semibold transition min-h-0 ${
            adminStatus?.authenticated
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {adminStatus?.authenticated ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Admin Mode</span>
            </>
          ) : (
            <>
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </>
          )}
        </Link>
      </div>
    </header>
  );
};
