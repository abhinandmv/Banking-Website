import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { transactionAPI, accountAPI } from '../api';

export default function Withdraw() {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    accountAPI.getBalance().then((r) => setBalance(r.data.data.balance)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) { toast.error('Please enter a valid amount'); return; }
    if (amt > 50000) { toast.error('Maximum withdrawal is ₹50,000 per transaction'); return; }
    setLoading(true);
    try {
      const res = await transactionAPI.withdraw(amt);
      setBalance(res.data.data.balance);
      toast.success(res.data.message);
      setAmount('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="page-header">
        <h1>Withdraw Money</h1>
        <p>Withdraw funds from your account</p>
      </div>

      {balance !== null && (
        <div className="alert alert-info mb-4">
          Available Balance: <strong>₹{Number(balance).toLocaleString('en-IN')}</strong>
        </div>
      )}

      <div className="card">
        <div className="card-header">Withdrawal</div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                className="form-control"
                type="number"
                placeholder="Enter amount"
                min={1}
                max={50000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="form-hint">Maximum withdrawal: ₹50,000 per transaction</div>
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Withdraw'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
