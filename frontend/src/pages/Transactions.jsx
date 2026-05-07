import { useState, useEffect } from 'react';
import { transactionAPI } from '../api';

const TYPE_META = {
  DEPOSIT:  { label: 'Deposit',   cls: 'txn-credit', sign: '+' },
  WITHDRAW: { label: 'Withdraw',  cls: 'txn-debit',  sign: '-' },
  TRANSFER: { label: 'Transfer',  cls: 'txn-debit',  sign: '-' },
  RECEIVE:  { label: 'Received',  cls: 'txn-credit', sign: '+' },
  PAYMENT:  { label: 'Payment',   cls: 'txn-debit',  sign: '-' },
  REDEEM:   { label: 'Redeem',    cls: 'txn-credit', sign: '+' },
  GST_PAYMENT: { label: 'GST',   cls: 'txn-debit',  sign: '-' },
  CHARGE:   { label: 'Charge',    cls: 'txn-debit',  sign: '-' },
};

function fmt(n) { return Number(n).toLocaleString('en-IN'); }

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [limit, setLimit] = useState(20);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    transactionAPI.getHistory(100)
      .then((r) => setTxns(r.data.data.transactions))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? txns : txns.filter((t) => t.transaction_type === filter);
  const displayed = filtered.slice(0, limit);

  return (
    <div>
      <div className="page-header">
        <h1>Transaction History</h1>
        <p>All your account transactions</p>
      </div>

      <div className="card">
        <div className="card-header">
          <span>Transactions</span>
          <div className="flex gap-2">
            <select className="form-control" style={{ width: 'auto', padding: '4px 10px' }}
              value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="ALL">All Types</option>
              {Object.entries(TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select className="form-control" style={{ width: 'auto', padding: '4px 10px' }}
              value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              <option value={10}>Last 10</option>
              <option value={20}>Last 20</option>
              <option value={50}>Last 50</option>
              <option value={100}>Last 100</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="spinner-wrapper"><div className="spinner" /></div>
        ) : (
          <div className="table-wrapper">
            {displayed.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                No transactions found.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ textAlign: 'right' }}>Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((t, i) => {
                    const meta = TYPE_META[t.transaction_type] || { label: t.transaction_type, cls: '', sign: '' };
                    return (
                      <tr key={t.id}>
                        <td className="text-muted font-mono">{t.id}</td>
                        <td style={{ whiteSpace: 'nowrap' }} className="text-muted">
                          {new Date(t.timestamp).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td>
                          <span className={meta.cls} style={{ fontWeight: 500 }}>{meta.label}</span>
                        </td>
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
        )}
      </div>
    </div>
  );
}
