import { useState } from 'react';
import { Shield } from 'lucide-react';
import type { AdminStatus } from '../types';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FormField, fieldControlClass } from '../components/ui/FormField';
import { StatusMessage } from '../components/ui/StatusMessage';

interface AdminLoginPageProps {
  onLoginSuccess: (status: AdminStatus) => void;
}

export function AdminLoginPage({ onLoginSuccess }: AdminLoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const status = await api.adminLogin(username, password);
      onLoginSuccess(status);
    } catch (err: any) {
      setError(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-10 animate-fade-in">
      <Card className="p-6 max-w-sm mx-auto space-y-4">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-night-700 border border-line text-brass-400 grid place-items-center">
            <Shield className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-base font-bold text-white">Admin sign in</h1>
          <p className="text-xs text-slate-500">Manage players and matches.</p>
        </div>

        {error && <StatusMessage type="error" message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField id="admin-username" label="Username" required>
            <input
              id="admin-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={fieldControlClass}
            />
          </FormField>
          <FormField id="admin-password" label="Password" required>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldControlClass}
            />
          </FormField>
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
