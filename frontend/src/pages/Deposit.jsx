import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { transactionAPI, accountAPI } from '../api';

export default function Deposit() {
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
    setLoading(true);
    try {
      const res = await transactionAPI.deposit(amt);
      setBalance(res.data.data.balance);
      toast.success(res.data.message);
      setAmount('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="page-header">
        <h1>Deposit Money</h1>
        <p>Add funds to your account</p>
      </div>

      {balance !== null && (
        <div className="alert alert-info mb-4">
          Current Balance: <strong>₹{Number(balance).toLocaleString('en-IN')}</strong>
        </div>
      )}

      <div className="card">
        <div className="card-header">Deposit Funds</div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                className="form-control"
                type="number"
                placeholder="Enter amount"
                min={1}
                max={1000000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="form-hint">Maximum deposit: ₹10,00,000 per transaction</div>
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Deposit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
