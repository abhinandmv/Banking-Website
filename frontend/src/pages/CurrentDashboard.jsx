import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { currentAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const TYPE_META = {
  DEPOSIT: { label: 'Deposit', cls: 'txn-credit', sign: '+' },
  WITHDRAW: { label: 'Withdraw', cls: 'txn-debit', sign: '-' },
  TRANSFER: { label: 'Transfer', cls: 'txn-debit', sign: '-' },
  RECEIVE: { label: 'Received', cls: 'txn-credit', sign: '+' },
  GST_PAYMENT: { label: 'GST', cls: 'txn-debit', sign: '-' },
  CHARGE: { label: 'Charge', cls: 'txn-debit', sign: '-' },
};

function fmt(n) { return Number(n).toLocaleString('en-IN'); }

export default function CurrentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    currentAPI.getDashboard()
      .then((r) => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await currentAPI.downloadStatement();
      toast.success('Statement sent to your registered email.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send statement');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="spinner-wrapper"><div className="spinner" /></div>;
  if (!data) return <div className="alert alert-error">Failed to load dashboard.</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Welcome, {user?.name}</h1>
        <p>Current Account Dashboard</p>
      </div>

      {data.alerts?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {data.alerts.map((a, i) => (
            <div key={i} className={`alert alert-${a.type === 'warning' ? 'warning' : 'info'}`}>{a.message}</div>
          ))}
        </div>
      )}

      <div className="balance-card" style={{ marginBottom: 20 }}>
        <div className="balance-label">Available Balance</div>
        <div className="balance-amount">
          {showBalance ? `₹${fmt(data.balance)}` : '₹ ••••••'}
          <button onClick={() => setShowBalance(!showBalance)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', marginLeft: 12, fontSize: 16, cursor: 'pointer' }}>
            {showBalance ? '🙈' : '👁'}
          </button>
        </div>
        <div className="balance-acno">Account: {data.account?.acno} &nbsp;|&nbsp; CURRENT ACCOUNT</div>
      </div>

      <div className="quick-actions" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        <Link to="/deposit" className="quick-action-btn"><span className="quick-action-icon">↓</span> Deposit</Link>
        <Link to="/withdraw" className="quick-action-btn"><span className="quick-action-icon">↑</span> Withdraw</Link>
        <Link to="/transfer" className="quick-action-btn"><span className="quick-action-icon">⇄</span> Transfer</Link>
        <Link to="/current/gst" className="quick-action-btn"><span className="quick-action-icon">₹</span> GST</Link>
        <button className="quick-action-btn" onClick={handleDownload} disabled={downloading}>
          <span className="quick-action-icon">⬇</span> {downloading ? '...' : 'Statement'}
        </button>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">Monthly Summary</div>
          <div className="card-body">
            {Object.keys(data.income_data || {}).length === 0 ? (
              <div className="text-muted text-sm">No data available.</div>
            ) : (
              <table>
                <thead>
                  <tr><th>Month</th><th style={{ textAlign: 'right' }}>Income</th><th style={{ textAlign: 'right' }}>Expense</th></tr>
                </thead>
                <tbody>
                  {Object.keys({ ...data.income_data, ...data.expense_data }).map((month) => (
                    <tr key={month}>
                      <td>{month}</td>
                      <td className="txn-credit font-mono" style={{ textAlign: 'right' }}>₹{fmt(data.income_data?.[month] || 0)}</td>
                      <td className="txn-debit font-mono" style={{ textAlign: 'right' }}>₹{fmt(data.expense_data?.[month] || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">Exclusive Offers</div>
          <div className="card-body">
            {data.offers?.map((offer, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < data.offers.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                {offer}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          Recent Transactions
          <Link to="/transactions" className="btn btn-outline btn-sm">View All</Link>
        </div>
        <div className="table-wrapper">
          {data.transactions?.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No transactions yet.</div>
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
                {data.transactions?.map((t) => {
                  const m = TYPE_META[t.transaction_type] || { label: t.transaction_type, cls: '', sign: '' };
                  return (
                    <tr key={t.id}>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(t.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
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
