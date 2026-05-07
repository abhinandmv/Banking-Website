import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { cardAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const TYPE_META = {
  WITHDRAW: { label: 'Withdraw', cls: 'txn-debit', sign: '-' },
  PAYMENT:  { label: 'Payment',  cls: 'txn-debit', sign: '-' },
  RECEIVE:  { label: 'Received', cls: 'txn-credit', sign: '+' },
  DEPOSIT:  { label: 'Deposit',  cls: 'txn-credit', sign: '+' },
  REDEEM:   { label: 'Redeem',   cls: 'txn-credit', sign: '+' },
};

function fmt(n) { return Number(n).toLocaleString('en-IN'); }

export default function DebitCardDetail() {
  const { id } = useParams();
  const { user, updateUser } = useAuth();
  const [card, setCard] = useState(null);
  const [txns, setTxns] = useState([]);
  const [tab, setTab] = useState('withdraw');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [wAmount, setWAmount] = useState('');
  const [wPw, setWPw] = useState('');
  const [pToAcno, setPToAcno] = useState('');
  const [pAmount, setPAmount] = useState('');
  const [pPw, setPPw] = useState('');
  const [rPoints, setRPoints] = useState('');
  const [cpOld, setCpOld] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpConfirm, setCpConfirm] = useState('');

  const load = () => {
    cardAPI.getCard(id)
      .then((r) => { setCard(r.data.data.card); setTxns(r.data.data.transactions); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await cardAPI.withdraw(id, parseInt(wAmount), wPw);
      toast.success('Withdrawal successful!');
      setWAmount(''); setWPw('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Withdrawal failed'); }
    finally { setSubmitting(false); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await cardAPI.payment(id, pToAcno, parseInt(pAmount), pPw);
      toast.success(res.data.message);
      if (updateUser) updateUser({ points: res.data.data.total_points });
      setPToAcno(''); setPAmount(''); setPPw('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Payment failed'); }
    finally { setSubmitting(false); }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await cardAPI.redeem(id, parseInt(rPoints));
      toast.success(res.data.message);
      if (updateUser) updateUser({ points: res.data.data.remaining_points });
      setRPoints('');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Redemption failed'); }
    finally { setSubmitting(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (cpNew !== cpConfirm) { toast.error('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      await cardAPI.changePassword(id, cpOld, cpNew);
      toast.success('Card password updated successfully.');
      setCpOld(''); setCpNew(''); setCpConfirm('');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update password'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="spinner-wrapper"><div className="spinner" /></div>;
  if (!card) return <div className="alert alert-error">Card not found.</div>;

  const TABS = [
    { key: 'withdraw', label: 'Withdraw' },
    { key: 'payment', label: 'Payment' },
    { key: 'redeem', label: 'Redeem Points' },
    { key: 'password', label: 'Change Password' },
  ];

  return (
    <div>
      <div className="page-header flex items-center gap-3">
        <Link to="/cards" className="btn btn-outline btn-sm">← Back</Link>
        <div>
          <h1>Debit Card</h1>
          <p className="text-muted text-sm">{card.masked_number} &nbsp;|&nbsp; Expires {card.expiry_date}</p>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="debit-card-visual">
          <div className="debit-card-bank">YOURBANK</div>
          <div className="debit-card-number">{card.masked_number}</div>
          <div className="debit-card-footer">
            <div className="debit-card-expiry">VALID THRU<span>{card.expiry_date}</span></div>
            <div className="debit-card-type">DEBIT</div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="section-title">Reward Points</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--navy)' }}>{user?.points || 0}</div>
            <div className="text-muted text-sm mt-2">= ₹{((user?.points || 0) * 0.25).toFixed(2)} cashback value</div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {TABS.map((t) => (
              <button key={t.key}
                className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {tab === 'withdraw' && (
            <form onSubmit={handleWithdraw}>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input className="form-control" type="number" placeholder="Enter amount" min={1} max={50000}
                  value={wAmount} onChange={(e) => setWAmount(e.target.value)} />
                <div className="form-hint">Max ₹50,000 per transaction</div>
              </div>
              <div className="form-group">
                <label className="form-label">Card Password</label>
                <input className="form-control" type="password" placeholder="Enter card password"
                  value={wPw} onChange={(e) => setWPw(e.target.value)} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Processing...' : 'Withdraw'}
              </button>
            </form>
          )}

          {tab === 'payment' && (
            <form onSubmit={handlePayment}>
              <div className="form-group">
                <label className="form-label">Recipient Account Number</label>
                <input className="form-control" type="text" placeholder="10-digit account number" maxLength={10}
                  value={pToAcno} onChange={(e) => setPToAcno(e.target.value.replace(/\D/g, '').slice(0, 10))} />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input className="form-control" type="number" placeholder="Enter amount" min={1}
                  value={pAmount} onChange={(e) => setPAmount(e.target.value)} />
                <div className="form-hint">Earn reward points: ₹100 = 1 point, ₹10,000+ = 170+ points</div>
              </div>
              <div className="form-group">
                <label className="form-label">Card Password</label>
                <input className="form-control" type="password" placeholder="Enter card password"
                  value={pPw} onChange={(e) => setPPw(e.target.value)} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Processing...' : 'Make Payment'}
              </button>
            </form>
          )}

          {tab === 'redeem' && (
            <form onSubmit={handleRedeem}>
              <div className="alert alert-info mb-3">
                You have <strong>{user?.points || 0} points</strong> = ₹{((user?.points || 0) * 0.25).toFixed(2)} cashback
              </div>
              <div className="form-group">
                <label className="form-label">Points to Redeem</label>
                <input className="form-control" type="number" placeholder="Enter points" min={4}
                  max={user?.points || 0}
                  value={rPoints} onChange={(e) => setRPoints(e.target.value)} />
                <div className="form-hint">1 point = ₹0.25 &nbsp;|&nbsp; Minimum 4 points (₹1)</div>
              </div>
              {rPoints > 0 && (
                <div className="alert alert-success">
                  You will receive: ₹{(parseInt(rPoints) * 0.25).toFixed(2)}
                </div>
              )}
              <button className="btn btn-success" type="submit" disabled={submitting}>
                {submitting ? 'Redeeming...' : 'Redeem Points'}
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Current Card Password</label>
                <input className="form-control" type="password" value={cpOld} onChange={(e) => setCpOld(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-control" type="password" value={cpNew} onChange={(e) => setCpNew(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-control" type="password" value={cpConfirm} onChange={(e) => setCpConfirm(e.target.value)} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">Recent Transactions</div>
        <div className="table-wrapper">
          {txns.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No transactions.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {txns.slice(0, 10).map((t) => {
                  const m = TYPE_META[t.transaction_type] || { label: t.transaction_type, cls: '', sign: '' };
                  return (
                    <tr key={t.id}>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(t.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td>{m.label}</td>
                      <td className="text-muted">{t.description || '—'}</td>
                      <td className={`${m.cls} font-mono`} style={{ textAlign: 'right' }}>
                        {m.sign}₹{fmt(Math.abs(t.amount))}
                      </td>
                      <td className="font-mono" style={{ textAlign: 'right' }}>₹{fmt(t.balance_after)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
