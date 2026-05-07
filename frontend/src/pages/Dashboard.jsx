import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { accountAPI, transactionAPI } from '../api';
import { useAuth } from '../context/AuthContext';

function fmt(n) { return Number(n).toLocaleString('en-IN'); }

const TXN_TYPE_LABEL = {
  DEPOSIT: { label: 'Deposit', cls: 'txn-credit', sign: '+' },
  WITHDRAW: { label: 'Withdrawal', cls: 'txn-debit', sign: '-' },
  TRANSFER: { label: 'Transfer', cls: 'txn-debit', sign: '-' },
  RECEIVE: { label: 'Received', cls: 'txn-credit', sign: '+' },
  PAYMENT: { label: 'Payment', cls: 'txn-debit', sign: '-' },
  REDEEM: { label: 'Redeem', cls: 'txn-credit', sign: '+' },
  CHARGE: { label: 'Charge', cls: 'txn-debit', sign: '-' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [txns, setTxns] = useState([]);
  const [showBalance, setShowBalance] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([accountAPI.getBalance(), transactionAPI.getHistory(5)])
      .then(([balRes, txnRes]) => {
        setBalance(balRes.data.data.balance);
        setTxns(txnRes.data.data.transactions);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner-wrapper"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Welcome, {user?.name}</h1>
        <p>Here's your account summary</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div className="balance-card">
          <div className="balance-label">Available Balance</div>
          <div className="balance-amount">
            {showBalance ? `₹${fmt(balance)}` : '₹ ••••••'}
            <button
              onClick={() => setShowBalance(!showBalance)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', marginLeft: 12, fontSize: 16, cursor: 'pointer' }}
            >
              {showBalance ? '🙈' : '👁'}
            </button>
          </div>
          <div className="balance-acno">Account: {user?.acno} &nbsp;|&nbsp; {user?.points || 0} Reward Points</div>
        </div>
      </div>

      <div className="quick-actions" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <Link to="/deposit" className="quick-action-btn">
          <span className="quick-action-icon">↓</span> Deposit
        </Link>
        <Link to="/withdraw" className="quick-action-btn">
          <span className="quick-action-icon">↑</span> Withdraw
        </Link>
        <Link to="/transfer" className="quick-action-btn">
          <span className="quick-action-icon">⇄</span> Transfer
        </Link>
        <Link to="/cards" className="quick-action-btn">
          <span className="quick-action-icon">▬</span> Cards
        </Link>
        <Link to="/transactions" className="quick-action-btn">
          <span className="quick-action-icon">≡</span> History
        </Link>
      </div>

      <div className="card">
        <div className="card-header">
          Recent Transactions
          <Link to="/transactions" className="btn btn-outline btn-sm">View All</Link>
        </div>
        <div className="table-wrapper">
          {txns.length === 0 ? (
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
                {txns.map((t) => {
                  const meta = TXN_TYPE_LABEL[t.transaction_type] || { label: t.transaction_type, cls: '', sign: '' };
                  return (
                    <tr key={t.id}>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(t.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>{meta.label}</td>
                      <td className="text-muted">{t.description || '—'}</td>
                      <td className={`${meta.cls} font-mono`} style={{ textAlign: 'right' }}>
                        {meta.sign}₹{fmt(Math.abs(t.amount))}
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
