import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { cardAPI } from '../api';

export default function DebitCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadCards = () => {
    setLoading(true);
    cardAPI.getCards()
      .then((r) => setCards(r.data.data.cards))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCards(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await cardAPI.createCard();
      toast.success(res.data.message);
      loadCards();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create card');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="spinner-wrapper"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Debit Cards</h1>
          <p>Manage your debit cards (max 3 per account)</p>
        </div>
        {cards.length < 3 && (
          <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : '+ New Card'}
          </button>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-muted">
            <div style={{ fontSize: 32, marginBottom: 8 }}>▬</div>
            <div>No debit cards yet.</div>
            <button className="btn btn-primary mt-3" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Debit Card'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {cards.map((card) => (
            <div key={card.id}>
              <div className="debit-card-visual" style={{ marginBottom: 12 }}>
                <div className="debit-card-bank">YOURBANK</div>
                <div className="debit-card-number">{card.masked_number}</div>
                <div className="debit-card-footer">
                  <div className="debit-card-expiry">
                    VALID THRU<span>{card.expiry_date}</span>
                  </div>
                  <div className="debit-card-type">DEBIT</div>
                </div>
              </div>
              <Link to={`/cards/${card.id}`} className="btn btn-outline btn-sm w-full" style={{ display: 'flex', justifyContent: 'center' }}>
                Manage Card
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="alert alert-info mt-4">
        Card details (number, CVV) are sent to your registered email address for security. Contact support if you need to retrieve card information.
      </div>
    </div>
  );
}
