import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import type { AdminStatus } from './types';
import { api } from './api/client';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { RankingsPage } from './pages/RankingsPage';
import { MatchesPage } from './pages/MatchesPage';
import { SchedulePage } from './pages/SchedulePage';
import { PlayerDetailPage } from './pages/PlayerDetailPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

export function App() {
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial admin auth status
    api
      .getAdminStatus()
      .then((status) => setAdminStatus(status))
      .catch(() => setAdminStatus({ authenticated: false, username: null }));
  }, []);

  const handleSelectPlayer = (idOrName: number | string) => {
    navigate(`/players/${idOrName}`);
  };

  const renderAdminRoute = () => (
    adminStatus?.authenticated ? (
      <AdminDashboardPage
        onLogout={() => setAdminStatus({ authenticated: false, username: null })}
      />
    ) : (
      <AdminLoginPage
        onLoginSuccess={(status) => {
          setAdminStatus(status);
        }}
      />
    )
  );

  const renderPlayerDetailRoute = () => (
    <PlayerDetailPage
      adminStatus={adminStatus}
      onSelectPlayer={handleSelectPlayer}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header adminStatus={adminStatus} />

      <main className="flex-1 max-w-md w-full mx-auto px-4 pb-24">
        <Routes>
          {/* Rankings / Leaderboard */}
          <Route path="/" element={<RankingsPage onSelectPlayer={handleSelectPlayer} />} />

          {/* Matches History */}
          <Route path="/matches" element={<MatchesPage onSelectPlayer={handleSelectPlayer} />} />
          <Route path="/matches/" element={<MatchesPage onSelectPlayer={handleSelectPlayer} />} />

          {/* Schedule & Direct Result Entry */}
          <Route
            path="/schedule"
            element={
              <SchedulePage
                adminStatus={adminStatus}
                onSelectPlayer={handleSelectPlayer}
              />
            }
          />
          <Route
            path="/schedule/"
            element={
              <SchedulePage
                adminStatus={adminStatus}
                onSelectPlayer={handleSelectPlayer}
              />
            }
          />

          {/* Player Profiles (/players/hio, /players/1) */}
          <Route path="/players/:id" element={renderPlayerDetailRoute()} />
          <Route path="/players/:id/" element={renderPlayerDetailRoute()} />
          <Route path="/users/:id" element={renderPlayerDetailRoute()} />
          <Route path="/users/:id/" element={renderPlayerDetailRoute()} />

          {/* Admin Dashboard / Login */}
          <Route path="/admin" element={renderAdminRoute()} />
          <Route path="/admin/" element={renderAdminRoute()} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <MobileNav />
    </div>
  );
}

export default App;
