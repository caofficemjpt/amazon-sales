import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth, type UserRole } from '../context/AuthContext';
import { Lock, User, AlertCircle } from 'lucide-react';
import './LoginPage.css';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: dbError } = await supabase
        .from('dashboard_users')
        .select('username, role')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError('Invalid username or password.');
      } else {
        login(data.username, data.role as UserRole);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Database authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-circle">
            <Lock size={32} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2>Access Portal</h2>
          <p>Please enter your credentials to view the dashboard</p>
        </div>

        {error && (
          <div className="login-error-alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field-group">
            <label className="label" htmlFor="username-input">
              Username
            </label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">
                <User size={18} />
              </span>
              <input
                id="username-input"
                type="text"
                className="input login-input"
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="login-field-group">
            <label className="label" htmlFor="password-input">
              Password
            </label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">
                <Lock size={18} />
              </span>
              <input
                id="password-input"
                type="password"
                className="input login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}
