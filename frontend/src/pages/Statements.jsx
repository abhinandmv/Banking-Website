import { useState, useEffect } from 'react';
// jsPDF is loaded lazily on first download to keep the initial bundle small
import { transactionAPI, accountAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TYPE_LABEL = {
  DEPOSIT: 'Deposit', WITHDRAW: 'Withdrawal', TRANSFER: 'Transfer',
  RECEIVE: 'Received', PAYMENT: 'Payment', REDEEM: 'Redeem',
  GST_PAYMENT: 'GST Payment', CHARGE: 'Charge',
};

function fmt(n) { return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function Statements() {
  const { user } = useAuth();
  const [allTxns, setAllTxns] = useState([]);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(today);

  useEffect(() => {
    Promise.all([transactionAPI.getHistory(100), accountAPI.getDetails()])
      .then(([txnRes, accRes]) => {
        setAllTxns(txnRes.data.data.transactions);
        setAccount(accRes.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = allTxns.filter((t) => {
    if (!t.timestamp) return false;
    const d = t.timestamp.split('T')[0];
    return d >= fromDate && d <= toDate;
  });

  const totals = filtered.reduce(
    (acc, t) => {
      const credit = ['DEPOSIT', 'RECEIVE', 'REDEEM'].includes(t.transaction_type);
      if (credit) acc.credits += Math.abs(t.amount);
      else acc.debits += Math.abs(t.amount);
      return acc;
    },
    { credits: 0, debits: 0 }
  );

  const generatePDF = async () => {
    if (filtered.length === 0) { toast.error('No transactions in the selected date range.'); return; }
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // ── Header ──
      doc.setFillColor(26, 39, 68); // navy
      doc.rect(0, 0, 210, 32, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('YourBank', 14, 13);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Account Statement', 14, 20);
      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 27);

      // ── Account Info box ──
      doc.setFillColor(244, 246, 249);
      doc.rect(0, 34, 210, 30, 'F');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('ACCOUNT HOLDER', 14, 42);
      doc.text('ACCOUNT NUMBER', 80, 42);
      doc.text('ACCOUNT TYPE', 140, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(account?.name || user?.name || '', 14, 49);
      doc.text(account?.acno || user?.acno || '', 80, 49);
      doc.text((account?.account_type || user?.account_type || ''), 140, 49);
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Statement Period: ${fromDate} to ${toDate}`, 14, 57);

      // ── Summary boxes ──
      const boxY = 68;
      const boxes = [
        { label: 'Total Credits', value: `+Rs.${fmt(totals.credits)}`, color: [22, 163, 74] },
        { label: 'Total Debits',  value: `-Rs.${fmt(totals.debits)}`,  color: [220, 38, 38] },
        { label: 'Transactions',  value: `${filtered.length}`,          color: [26, 39, 68] },
        { label: 'Closing Balance', value: `Rs.${fmt(filtered.length > 0 ? filtered[filtered.length - 1].balance_after : (account?.balance || 0))}`, color: [26, 39, 68] },
      ];

      boxes.forEach((b, i) => {
        const x = 14 + i * 46;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, boxY, 43, 18, 2, 2, 'FD');
        doc.setTextColor(b.color[0], b.color[1], b.color[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(b.value, x + 3, boxY + 10);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(b.label, x + 3, boxY + 15);
      });

      // ── Transaction table ──
      const CREDIT_TYPES = ['DEPOSIT', 'RECEIVE', 'REDEEM'];
      const rows = filtered.map((t) => {
        const isCredit = CREDIT_TYPES.includes(t.transaction_type);
        const date = t.timestamp ? new Date(t.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
        const time = t.timestamp ? new Date(t.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
        return [
          `${date}\n${time}`,
          TYPE_LABEL[t.transaction_type] || t.transaction_type,
          t.description || '—',
          isCredit ? `+Rs.${fmt(Math.abs(t.amount))}` : '',
          !isCredit ? `-Rs.${fmt(Math.abs(t.amount))}` : '',
          `Rs.${fmt(t.balance_after)}`,
        ];
      });

      autoTable(doc, {
        startY: boxY + 24,
        head: [['Date & Time', 'Type', 'Description', 'Credit (Rs.)', 'Debit (Rs.)', 'Balance (Rs.)']],
        body: rows,
        theme: 'grid',
        headStyles: {
          fillColor: [26, 39, 68],
          textColor: 255,
          fontSize: 7.5,
          fontStyle: 'bold',
          cellPadding: 3,
        },
        bodyStyles: { fontSize: 7.5, cellPadding: 2.5, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 22 },
          2: { cellWidth: 55 },
          3: { cellWidth: 28, halign: 'right', textColor: [22, 163, 74], fontStyle: 'bold' },
          4: { cellWidth: 28, halign: 'right', textColor: [220, 38, 38], fontStyle: 'bold' },
          5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const val = data.cell.raw;
            if (typeof val === 'string' && val.startsWith('+')) data.cell.styles.textColor = [22, 163, 74];
            if (typeof val === 'string' && val.startsWith('-')) data.cell.styles.textColor = [220, 38, 38];
          }
        },
      });

      // ── Footer ──
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageH = doc.internal.pageSize.getHeight();
        doc.setFillColor(244, 246, 249);
        doc.rect(0, pageH - 12, 210, 12, 'F');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text('This is a computer-generated statement and does not require a signature.', 14, pageH - 5);
        doc.text(`Page ${i} of ${pageCount}`, 196, pageH - 5, { align: 'right' });
      }

      const fileName = `YourBank_Statement_${account?.acno || user?.acno}_${fromDate}_to_${toDate}.pdf`;
      doc.save(fileName);
      toast.success('Statement downloaded successfully.');
    } catch (e) {
      toast.error('Failed to generate PDF. Please try again.');
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="spinner-wrapper"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <h1>Account Statements</h1>
        <p>Download your transaction statement as a PDF</p>
      </div>

      <div className="card mb-4">
        <div className="card-header">Select Period</div>
        <div className="card-body">
          <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From Date</label>
              <input className="form-control" type="date" value={fromDate}
                max={toDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To Date</label>
              <input className="form-control" type="date" value={toDate}
                min={fromDate} max={today} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          {/* Quick range buttons */}
          <div className="flex gap-2" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'This Month', fn: () => { setFromDate(firstOfMonth); setToDate(today); } },
              { label: 'Last 3 Months', fn: () => { const d = new Date(); d.setMonth(d.getMonth() - 3); setFromDate(d.toISOString().split('T')[0]); setToDate(today); } },
              { label: 'Last 6 Months', fn: () => { const d = new Date(); d.setMonth(d.getMonth() - 6); setFromDate(d.toISOString().split('T')[0]); setToDate(today); } },
              { label: 'This Year', fn: () => { setFromDate(`${new Date().getFullYear()}-01-01`); setToDate(today); } },
            ].map((r) => (
              <button key={r.label} className="btn btn-outline btn-sm" onClick={r.fn}>{r.label}</button>
            ))}
          </div>

          <button className="btn btn-primary" onClick={generatePDF} disabled={generating}>
            {generating ? 'Generating...' : '⬇ Download PDF Statement'}
          </button>
        </div>
      </div>

      {/* Preview table */}
      <div className="card">
        <div className="card-header">
          <span>Preview — {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
          <div className="flex gap-3 text-sm">
            <span className="txn-credit">+₹{fmt(totals.credits)}</span>
            <span className="txn-debit">−₹{fmt(totals.debits)}</span>
          </div>
        </div>
        <div className="table-wrapper">
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              No transactions found in the selected date range.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ textAlign: 'right' }}>Balance (₹)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const isCredit = ['DEPOSIT', 'RECEIVE', 'REDEEM'].includes(t.transaction_type);
                  return (
                    <tr key={t.id}>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                        {new Date(t.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>{TYPE_LABEL[t.transaction_type] || t.transaction_type}</td>
                      <td className="text-muted">{t.description || '—'}</td>
                      <td className={`font-mono ${isCredit ? 'txn-credit' : 'txn-debit'}`} style={{ textAlign: 'right' }}>
                        {isCredit ? '+' : '−'}₹{fmt(Math.abs(t.amount))}
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
