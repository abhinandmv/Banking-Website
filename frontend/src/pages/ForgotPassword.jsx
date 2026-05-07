import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ acno: '', email: '', new_password: '', confirm_password: '' });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPassword(form.acno, form.email, form.new_password, form.confirm_password);
      toast.success('Password updated successfully. Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password. Please try again.');
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
          <div className="auth-logo-sub">Reset your password</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Account Number</label>
            <input className="form-control" type="text" placeholder="10-digit account number"
              value={form.acno} onChange={(e) => setForm(f => ({ ...f, acno: e.target.value.replace(/\D/g, '').slice(0, 10) }))} maxLength={10} />
          </div>
          <div className="form-group">
            <label className="form-label">Registered Email</label>
            <input className="form-control" type="email" placeholder="Email linked to your account"
              value={form.email} onChange={set('email')} />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-control" type="password" placeholder="New password"
              value={form.new_password} onChange={set('new_password')} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="form-control" type="password" placeholder="Repeat new password"
              value={form.confirm_password} onChange={set('confirm_password')} />
          </div>
          <div className="form-hint mb-3">Password: min 8 chars, uppercase, lowercase, digit, and one of @$!%*?&</div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="text-center mt-3 text-sm">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
