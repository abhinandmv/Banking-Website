import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../api';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: '', dob: '', phone: '', email: '', address: '',
    opening_balance: '', password: '', confirm_password: '',
  });
  const [errors, setErrors] = useState([]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      await authAPI.signup({ ...form, opening_balance: Number(form.opening_balance) });
      setDone(true);
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 420 }}>
          <div className="auth-logo">
            <div className="auth-logo-icon" style={{ background: 'var(--success)' }}>✓</div>
            <div className="auth-logo-name">Account Created!</div>
            <div className="auth-logo-sub">YourBank Savings Account</div>
          </div>
          <div className="alert alert-success">
            Your account has been created. Your <strong>Account Number</strong> and login details have been sent to your registered email address.
          </div>
          <div className="alert alert-info">
            Please check your inbox (and spam folder) for an email from YourBank. Your account number is required to login.
          </div>
          <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">YB</div>
          <div className="auth-logo-name">YourBank</div>
          <div className="auth-logo-sub">Open a Savings Account</div>
        </div>

        {errors.length > 0 && (
          <div className="alert alert-error">
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" type="text" placeholder="As per ID" value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input className="form-control" type="date" value={form.dob} onChange={set('dob')} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-control" type="text" placeholder="10 digits" maxLength={10}
                value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-control" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-control" rows={2} placeholder="Full residential address" value={form.address} onChange={set('address')} />
          </div>

          <div className="form-group">
            <label className="form-label">Opening Balance (₹)</label>
            <input className="form-control" type="number" placeholder="Minimum ₹500" min={500} value={form.opening_balance} onChange={set('opening_balance')} />
            <div className="form-hint">Minimum opening deposit is ₹500</div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-group">
                <input className="form-control" type={showPw ? 'text' : 'password'}
                  placeholder="Create password" value={form.password} onChange={set('password')} autoComplete="new-password" />
                <button type="button" className="input-group-btn" onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁'}</button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-control" type="password" placeholder="Repeat password" value={form.confirm_password} onChange={set('confirm_password')} autoComplete="new-password" />
            </div>
          </div>
          <div className="form-hint mb-3">Password: min 8 chars, uppercase, lowercase, digit, and one of @$!%*?&</div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-3 text-sm">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
