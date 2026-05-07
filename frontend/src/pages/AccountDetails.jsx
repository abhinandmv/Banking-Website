import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { accountAPI } from '../api';
import { useAuth } from '../context/AuthContext';

function mask(str, keep = 4) {
  if (!str) return '—';
  return str.slice(0, keep) + '****' + str.slice(-2);
}

export default function AccountDetails() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showClose, setShowClose] = useState(false);
  const [closePassword, setClosePassword] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    accountAPI.getDetails()
      .then((r) => setDetails(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const handleClose = async () => {
    if (!closePassword) { toast.error('Enter your password to confirm'); return; }
    setClosing(true);
    try {
      await accountAPI.closeAccount(closePassword);
      toast.success('Account closed successfully.');
      logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to close account');
    } finally {
      setClosing(false);
    }
  };

  if (loading) return <div className="spinner-wrapper"><div className="spinner" /></div>;
  if (!details) return <div className="alert alert-error">Failed to load account details.</div>;

  const rows = [
    { label: 'Account Number', value: <span className="font-mono">{details.acno}</span> },
    { label: 'Account Holder', value: details.name },
    { label: 'Account Type', value: <span className={`badge ${details.account_type === 'SAVINGS' ? 'badge-savings' : 'badge-current'}`}>{details.account_type}</span> },
    { label: 'Date of Birth', value: details.dob },
    { label: 'Phone Number', value: mask(details.phone, 3) },
    { label: 'Email Address', value: mask(details.email, 3) },
    { label: 'Address', value: details.address },
    { label: 'Opening Balance', value: `₹${Number(details.opening_balance).toLocaleString('en-IN')}` },
    { label: 'Current Balance', value: <strong>₹{Number(details.balance).toLocaleString('en-IN')}</strong> },
    { label: 'Reward Points', value: `${details.points || 0} pts` },
    { label: 'Account Opened', value: new Date(details.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) },
  ];

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="page-header">
        <h1>Account Details</h1>
        <p>Your personal and account information</p>
      </div>

      <div className="card mb-4">
        <div className="card-header">Account Information</div>
        <div className="card-body">
          {rows.map((r) => (
            <div className="info-row" key={r.label}>
              <div className="info-label">{r.label}</div>
              <div className="info-value">{r.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ color: 'var(--danger)' }}>Close Account</div>
        <div className="card-body">
          <div className="alert alert-warning">
            Closing your account is permanent. Ensure your balance is ₹0 before proceeding.
          </div>
          {!showClose ? (
            <button className="btn btn-danger" onClick={() => setShowClose(true)}>
              Request Account Closure
            </button>
          ) : (
            <div>
              <div className="form-group">
                <label className="form-label">Enter your password to confirm</label>
                <input className="form-control" type="password" placeholder="Account password"
                  value={closePassword} onChange={(e) => setClosePassword(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button className="btn btn-danger" onClick={handleClose} disabled={closing}>
                  {closing ? 'Closing...' : 'Confirm Close Account'}
                </button>
                <button className="btn btn-outline" onClick={() => { setShowClose(false); setClosePassword(''); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
