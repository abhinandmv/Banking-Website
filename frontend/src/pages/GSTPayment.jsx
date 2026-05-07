import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { currentAPI, accountAPI } from '../api';

export default function GSTPayment() {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    accountAPI.getBalance().then((r) => setBalance(r.data.data.balance)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) { toast.error('Enter a valid GST amount'); return; }
    setLoading(true);
    try {
      const res = await currentAPI.gstPayment(amt);
      setBalance(res.data.data.balance);
      toast.success(res.data.message);
      setAmount('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'GST payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="page-header">
        <h1>GST / Tax Payments</h1>
        <p>Pay your GST and tax obligations directly</p>
      </div>

      {balance !== null && (
        <div className="alert alert-info mb-4">
          Available Balance: <strong>₹{Number(balance).toLocaleString('en-IN')}</strong>
        </div>
      )}

      <div className="card">
        <div className="card-header">GST Payment</div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">GST / Tax Amount (₹)</label>
              <input
                className="form-control"
                type="number"
                placeholder="Enter tax amount"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="form-hint">Amount will be debited from your current account balance</div>
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Pay GST'}
            </button>
          </form>
        </div>
      </div>

      <div className="alert alert-info mt-4">
        GST payment will be recorded as a transaction in your account history. Ensure you file returns separately on the GST portal.
      </div>
    </div>
  );
}
