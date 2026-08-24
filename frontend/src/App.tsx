import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import type { AdminStatus, PlayerStatus, Challenge } from './types';
import { api } from './api/client';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { RankingsPage } from './pages/RankingsPage';
import { MatchesPage } from './pages/MatchesPage';
import { SchedulePage } from './pages/SchedulePage';
import { PlayerDetailPage } from './pages/PlayerDetailPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { PlayerAuthModal } from './components/PlayerAuthModal';
import { ChallengesInbox } from './components/ChallengesInbox';

export function App() {
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [receivedChallenges, setReceivedChallenges] = useState<Challenge[]>([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial admin auth status
    api
      .getAdminStatus()
      .then((status) => setAdminStatus(status))
      .catch(() => setAdminStatus({ authenticated: false, username: null }));

    // Check initial player auth status
    api
      .getPlayerMe()
      .then((status) => setPlayerStatus(status))
      .catch(() => setPlayerStatus({ authenticated: false, player: null }));
  }, []);

  // Poll for received challenges (notification system)
  useEffect(() => {
    if (playerStatus?.authenticated) {
      const fetchCount = () => {
        api.getChallengesReceived()
          .then(setReceivedChallenges)
          .catch(() => {});
      };
      fetchCount();
      const interval = setInterval(fetchCount, 30000);
      return () => clearInterval(interval);
    } else {
      setReceivedChallenges([]);
    }
  }, [playerStatus]);

  const handleLogoutPlayer = async () => {
    try {
      await api.playerLogout();
      setPlayerStatus({ authenticated: false, player: null });
      navigate('/');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleSelectPlayer = (idOrName: number | string) => {
    navigate(`/players/${idOrName}`);
  };

  const handleRefreshMatches = () => {
    // Triggers matches update on active route if needed, or simple redirect/reload
    // Refreshing list matches in inbox
    api.getChallengesReceived().then(setReceivedChallenges).catch(() => {});
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
      playerStatus={playerStatus}
      onSelectPlayer={handleSelectPlayer}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Header
        adminStatus={adminStatus}
        playerStatus={playerStatus}
        onLogoutPlayer={handleLogoutPlayer}
        onLoginPlayerClick={() => setIsAuthModalOpen(true)}
        onInboxClick={() => setIsInboxOpen(true)}
        pendingCount={receivedChallenges.length}
      />

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
                playerStatus={playerStatus}
                onSelectPlayer={handleSelectPlayer}
              />
            }
          />
          <Route
            path="/schedule/"
            element={
              <SchedulePage
                adminStatus={adminStatus}
                playerStatus={playerStatus}
                onSelectPlayer={handleSelectPlayer}
              />
            }
          />

          {/* Player Profiles */}
          <Route path="/players/:id" element={renderPlayerDetailRoute()} />
          <Route path="/players/:id/" element={renderPlayerDetailRoute()} />
          <Route path="/users/:id" element={renderPlayerDetailRoute()} />
          <Route path="/users/:id/" element={renderPlayerDetailRoute()} />

          {/* Admin Dashboard */}
          <Route path="/admin" element={renderAdminRoute()} />
          <Route path="/admin/" element={renderAdminRoute()} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <MobileNav />
      <PwaUpdatePrompt />

      {/* Modals */}
      <PlayerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(status) => setPlayerStatus(status)}
      />

      <ChallengesInbox
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        onRefreshMatches={handleRefreshMatches}
      />
    </div>
  );
}

export default App;
