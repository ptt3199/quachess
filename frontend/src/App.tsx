import { useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ToastProvider } from './components/ui/Toast';
import { Header } from './components/Header';
import { TabBar } from './components/TabBar';
import { HomePage } from './pages/HomePage';
import { RankingsPage } from './pages/RankingsPage';
import { MatchesPage } from './pages/MatchesPage';
import { PlayerDetailPage } from './pages/PlayerDetailPage';
import { MePage } from './pages/MePage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';
import { AuthSheet } from './components/AuthSheet';
import { InboxSheet } from './components/InboxSheet';
import { RecordResultSheet } from './components/RecordResultSheet';

function AdminRoute() {
  const { isAdminAuthed, setAdminStatus } = useAuth();
  return isAdminAuthed ? (
    <AdminDashboardPage onLogout={() => setAdminStatus({ authenticated: false, username: null })} />
  ) : (
    <AdminLoginPage onLoginSuccess={setAdminStatus} />
  );
}

function UserRedirect() {
  const { id } = useParams();
  return <Navigate to={`/players/${id}`} replace />;
}

function AppShell() {
  const [authOpen, setAuthOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-brass-500 focus:text-night-900 focus:font-bold"
      >
        Skip to content
      </a>

      <Header onLoginClick={() => setAuthOpen(true)} onInboxClick={() => setInboxOpen(true)} />

      <main id="main-content" tabIndex={-1} className="flex-1 w-full max-w-md mx-auto px-4 pt-3 pb-28">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/players/:id" element={<PlayerDetailPage />} />
          <Route path="/me" element={<MePage />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/schedule" element={<Navigate to="/matches" replace />} />
          <Route path="/users/:id" element={<UserRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <TabBar onRecord={() => setRecordOpen(true)} />
      <PwaUpdatePrompt />

      <AuthSheet isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      <InboxSheet isOpen={inboxOpen} onClose={() => setInboxOpen(false)} />
      <RecordResultSheet isOpen={recordOpen} onClose={() => setRecordOpen(false)} onSignIn={() => setAuthOpen(true)} />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppShell />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;

