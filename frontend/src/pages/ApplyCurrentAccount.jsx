import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { currentAPI } from '../api';

const BUSINESS_TYPES = [
  'Business', 'Sole Proprietorship', 'Private Limited Company',
  'Public Limited Company', 'Trust', 'Association', 'Partnership', 'LLP',
];

const MIN_TURNOVER = {
  'Business': 1000000, 'Sole Proprietorship': 500000,
  'Private Limited Company': 2000000, 'Public Limited Company': 5000000,
  'Trust': 100000, 'Association': 100000, 'Partnership': 500000, 'LLP': 1000000,
};

export default function ApplyCurrentAccount() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', dob: '', business_type: '',
    company_name: '', turnover: '', start_date: '', account_type: 'regular',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      await currentAPI.apply({ ...form, turnover: Number(String(form.turnover).replace(/,/g, '')) });
      toast.success('Current account created! Check your email for login details.');
      navigate('/login');
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
      else toast.error(err.response?.data?.error || 'Application failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const minTurnover = MIN_TURNOVER[form.business_type];

  return (
    <div className="auth-page" style={{ alignItems: 'flex-start', paddingTop: 32 }}>
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">YB</div>
          <div className="auth-logo-name">YourBank</div>
          <div className="auth-logo-sub">Current Account Application</div>
        </div>

        <div className="grid-2 mb-4" style={{ gap: 12 }}>
          {['regular', 'premium'].map((type) => (
            <div key={type}
              className="card"
              style={{ cursor: 'pointer', border: form.account_type === type ? '2px solid var(--navy)' : '1px solid var(--border)', padding: 16 }}
              onClick={() => setForm((f) => ({ ...f, account_type: type }))}>
              <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize', marginBottom: 6 }}>{type}</div>
              <div className="text-sm text-muted">
                {type === 'regular' ? 'Min balance ₹50,000 | Turnover varies' : 'Min balance ₹35,00,000 | Turnover ₹4Cr+'}
              </div>
            </div>
          ))}
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
              <input className="form-control" type="text" placeholder="Authorised signatory" value={form.name} onChange={set('name')} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input className="form-control" type="date" value={form.dob} onChange={set('dob')} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" type="text" placeholder="10 digits" maxLength={10}
                value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={form.email} onChange={set('email')} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Business Type</label>
            <select className="form-control" value={form.business_type} onChange={set('business_type')}>
              <option value="">Select business type</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {form.business_type && (
              <div className="form-hint">Minimum annual turnover: ₹{(MIN_TURNOVER[form.business_type] || 0).toLocaleString('en-IN')}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Company / Organisation Name</label>
            <input className="form-control" type="text" value={form.company_name} onChange={set('company_name')} />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Annual Turnover (₹)</label>
              <input className="form-control" type="number" placeholder="Annual revenue" value={form.turnover} onChange={set('turnover')} />
            </div>
            <div className="form-group">
              <label className="form-label">Company Start Date</label>
              <input className="form-control" type="date" value={form.start_date} onChange={set('start_date')} />
            </div>
          </div>

          <button className="btn btn-primary btn-full mt-2" type="submit" disabled={loading}>
            {loading ? 'Submitting Application...' : 'Apply for Current Account'}
          </button>
        </form>

        <div className="text-center mt-3 text-sm">
          Already have an account? <Link to="/login">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
