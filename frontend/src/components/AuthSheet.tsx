import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/Toast';
import { BottomSheet } from './ui/BottomSheet';
import { Button } from './ui/Button';
import { FormField, fieldControlClass } from './ui/FormField';
import { StatusMessage } from './ui/StatusMessage';
import { GoogleButton } from './GoogleButton';

interface AuthSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthSheet({ isOpen, onClose }: AuthSheetProps) {
  const { refreshPlayer, refreshAdmin } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSuccess = async (label: string) => {
    await refreshPlayer();
    toast(label, 'success');
    setError('');
    setUsername('');
    setPassword('');
    setName('');
    setDisplayName('');
    onClose();
  };

  // Google flow shows its own welcome toast; may also grant the admin session
  const handleGoogleSuccess = async () => {
    await Promise.all([refreshPlayer(), refreshAdmin()]);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await api.playerLogin({ username, password });
        await handleSuccess(`Welcome back, ${username}!`);
      } else {
        // Signup now logs the player in server-side
        await api.playerSignUp({
          username,
          password,
          name: name || username,
          display_name: displayName || name || username,
        });
        await handleSuccess(`Welcome to the club, ${displayName || name || username}!`);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setError('');
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={mode === 'login' ? 'Sign in' : 'Create account'}>
      <div className="space-y-4">
        {mode === 'login' && (
          <>
            <GoogleButton onSuccess={handleGoogleSuccess} />
            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="flex-1 h-px bg-line" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                or with username
              </span>
              <span className="flex-1 h-px bg-line" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete={mode === 'login' ? 'on' : 'off'}>
          {/* Mode switch */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-night-850 border border-line rounded-xl" role="tablist" aria-label="Authentication mode">
            {(
              [
                { id: 'login', label: 'Sign in' },
                { id: 'signup', label: 'Register' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mode === tab.id}
                onClick={() => switchMode(tab.id)}
                className={`h-9 rounded-lg text-xs font-bold transition ${
                  mode === tab.id ? 'bg-night-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && <StatusMessage type="error" message={error} />}

          <FormField id="auth-username" label="Username" required>
            <input
              id="auth-username"
              name="username"
              type="text"
              required
              autoComplete="username"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. minh"
              className={fieldControlClass}
            />
          </FormField>

          <FormField id="auth-password" label="Password" required>
            <input
              id="auth-password"
              name="password"
              type="password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={fieldControlClass}
            />
          </FormField>

          {mode === 'signup' && (
            <>
              <FormField id="auth-name" label="Full name" required>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyen Van A"
                  className={fieldControlClass}
                />
              </FormField>

              <FormField
                id="auth-display-name"
                label="Display name"
                required
                hint="How your name shows up on the leaderboard."
              >
                <input
                  id="auth-display-name"
                  name="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Minh A"
                  className={fieldControlClass}
                />
              </FormField>
            </>
          )}

          <Button type="submit" fullWidth size="lg" loading={loading}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
        </form>
      </div>
    </BottomSheet>
  );
}
