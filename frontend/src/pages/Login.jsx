import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [tab, setTab] = useState('SAVINGS');
  const [acno, setAcno] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acno.trim() || !password) { toast.error('Please enter account number and password'); return; }
    setLoading(true);
    try {
      const user = await login(acno.trim(), password, tab);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.account_type === 'CURRENT' ? '/current/dashboard' : '/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">YB</div>
          <div className="auth-logo-name">YourBank</div>
          <div className="auth-logo-sub">Secure Internet Banking</div>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'SAVINGS' ? ' active' : ''}`} onClick={() => setTab('SAVINGS')}>
            Savings Account
          </button>
          <button className={`auth-tab${tab === 'CURRENT' ? ' active' : ''}`} onClick={() => setTab('CURRENT')}>
            Current Account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Account Number</label>
            <input
              className="form-control"
              type="text"
              placeholder="Enter 10-digit account number"
              value={acno}
              onChange={(e) => setAcno(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              autoComplete="username"
            />
            <div className="form-hint">Your account number was sent to your registered email</div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-group">
              <input
                className="form-control"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className="input-group-btn" onClick={() => setShowPw(!showPw)}>
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-full mt-2" type="submit" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-3 text-sm">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        <hr style={{ margin: '20px 0', borderColor: 'var(--border)', borderTop: 'none' }} />

        <div className="text-center text-sm text-muted">
          Don't have an account?{' '}
          <Link to="/signup">Open Savings Account</Link>
          {' | '}
          <Link to="/current/apply">Current Account</Link>
        </div>
      </div>
    </div>
  );
}
