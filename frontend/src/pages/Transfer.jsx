import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { transactionAPI, accountAPI } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Transfer() {
  const { user } = useAuth();
  const [toAcno, setToAcno] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    accountAPI.getBalance().then((r) => setBalance(r.data.data.balance)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!toAcno || toAcno.length !== 10) { toast.error('Enter a valid 10-digit account number'); return; }
    if (toAcno === user?.acno) { toast.error('Cannot transfer to your own account'); return; }
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await transactionAPI.transfer(toAcno, amt);
      setBalance(res.data.data.balance);
      setResult({ success: true, message: res.data.message, recipient: res.data.data.recipient });
      setAmount('');
      setToAcno('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="page-header">
        <h1>Transfer Money</h1>
        <p>Transfer funds to another account</p>
      </div>

      {balance !== null && (
        <div className="alert alert-info mb-4">
          Available Balance: <strong>₹{Number(balance).toLocaleString('en-IN')}</strong>
        </div>
      )}

      {result?.success && (
        <div className="alert alert-success mb-4">{result.message}</div>
      )}

      <div className="card">
        <div className="card-header">Fund Transfer</div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Your Account Number</label>
            <input className="form-control" type="text" value={user?.acno || ''} disabled />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Recipient Account Number</label>
              <input
                className="form-control"
                type="text"
                placeholder="10-digit account number"
                maxLength={10}
                value={toAcno}
                onChange={(e) => setToAcno(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                className="form-control"
                type="number"
                placeholder="Enter amount"
                min={1}
                max={200000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="form-hint">Maximum transfer: ₹2,00,000 per transaction</div>
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Transfer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
