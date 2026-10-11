import React, { useEffect, useState } from 'react';
import { api, fmt, thisMonth, monthLabel } from '../api.js';
import { MonthPicker, Empty } from '../components.jsx';
import { TopCategoryBanner } from './Analytics.jsx';

const rs = (n) => 'Rs. ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); // default PDF fonts have no rupee glyph

export default function Reports({ tick, say }) {
  const [month, setMonth] = useState(thisMonth());
  const [r, setR] = useState(null);
  const [a, setA] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/reports/monthly?month=' + month).then(setR);
    api('/analytics/overview?month=' + month).then(setA);
  }, [month, tick]);

  async function csv() {
    const res = await api('/reports/export?month=' + month, { raw: true });
    const url = URL.createObjectURL(await res.blob());
    const el = document.createElement('a'); el.href = url; el.download = `spendwise-${month}.csv`; el.click();
    URL.revokeObjectURL(url); say('CSV downloaded');
  }

  async function pdf() {
    setBusy(true);
    try {
      const [{ jsPDF }, { default: autoTable }, txs] = await Promise.all([
        import('jspdf'), import('jspdf-autotable'),
        api(`/transactions?from=${month}-01&to=${month}-31&sort=date&order=asc`),
      ]);
      const doc = new jsPDF();
      const W = doc.internal.pageSize.getWidth();
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, W, 30, 'F');
      doc.setTextColor(255); doc.setFontSize(20); doc.text('SpendWise', 14, 14);
      doc.setFontSize(11); doc.text(`Financial report - ${monthLabel(month)}`, 14, 23);
      doc.setFontSize(9); doc.text('Generated ' + new Date().toLocaleDateString('en-IN'), W - 14, 23, { align: 'right' });
      doc.setTextColor(30);

      autoTable(doc, {
        startY: 38, theme: 'grid', head: [['Income', 'Expenses', 'Net savings', 'Transactions']],
        body: [[rs(r.income), rs(r.expense), rs(r.savings), String(r.count)]],
        headStyles: { fillColor: [37, 99, 235] }, styles: { fontSize: 11, halign: 'center' },
      });
      let y = doc.lastAutoTable.finalY + 8;
      if (a?.highest) {
        doc.setFontSize(11); doc.setFont(undefined, 'bold');
        doc.text(`Highest spending: ${a.highest.name} - ${rs(a.highest.value)} (${a.highest.pct}% of spending)`, 14, y);
        doc.setFont(undefined, 'normal'); y += 6;
      }
      const section = (title, head, body, extra = {}) => {
        if (!body.length) return;
        doc.setFontSize(13); doc.text(title, 14, y + 6);
        autoTable(doc, { startY: y + 9, head: [head], body, headStyles: { fillColor: [30, 41, 59] }, styles: { fontSize: 9 }, ...extra });
        y = doc.lastAutoTable.finalY + 8;
      };
      section('Spending by category', ['Category', 'Share', 'Amount'], (a?.byCategory || []).map((c) => [c.name, c.pct + '%', rs(c.value)]), { columnStyles: { 2: { halign: 'right' } } });
      section('Smart insights', ['Insight'], (a?.insights || []).map((i) => [`${i.title}: ${i.text}`.replace(/₹/g, 'Rs. ').replace(/→/g, 'to').replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ')]));
      section('Budget performance', ['Category', 'Spent', 'Budget', 'Used'], r.budgets.map((b) => [b.name, rs(b.spent), rs(b.amount), b.pct + '%']));
      section('All transactions', ['Date', 'Type', 'Category', 'Note', 'Amount'],
        txs.map((t) => [t.date, t.type, t.category, t.note || '', (t.type === 'income' ? '+' : '-') + rs(t.amount)]),
        { columnStyles: { 4: { halign: 'right' } }, didParseCell: (h) => { if (h.section === 'body' && h.column.index === 4) h.cell.styles.textColor = h.cell.raw.startsWith('+') ? [22, 163, 74] : [220, 38, 38]; } });

      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(120); doc.text(`Page ${i} of ${pages}`, W / 2, 290, { align: 'center' }); }
      doc.save(`spendwise-report-${month}.pdf`);
      say('PDF report downloaded');
    } catch (e) { say('Could not create PDF: ' + e.message, 'bad'); }
    setBusy(false);
  }

  if (!r) return <div className="muted">Loading report…</div>;
  return (
    <div className="page">
      <div className="row between wrap no-print">
        <h2>Expense report</h2>
        <div className="row wrap">
          <MonthPicker value={month} onChange={setMonth} />
          <button className="btn small" onClick={pdf} disabled={busy}>{busy ? 'Creating…' : '⬇ Download PDF'}</button>
          <button className="btn ghost small" onClick={csv}>⬇ CSV</button>
          <button className="btn ghost small" onClick={() => window.print()}>🖨 Print</button>
        </div>
      </div>
      <div className="card">
        <h3>Financial report - {monthLabel(month)}</h3>
        <div className="grid4">
          <div className="stat"><span className="stat-label">Income</span><b className="stat-value pos">{fmt(r.income)}</b></div>
          <div className="stat"><span className="stat-label">Expenses</span><b className="stat-value neg">{fmt(r.expense)}</b></div>
          <div className="stat"><span className="stat-label">Net savings</span><b className={'stat-value ' + (r.savings >= 0 ? 'pos' : 'neg')}>{fmt(r.savings)}</b></div>
          <div className="stat"><span className="stat-label">Transactions</span><b className="stat-value">{r.count}</b></div>
        </div>
      </div>
      {a?.highest && <TopCategoryBanner highest={a.highest} label={'in ' + monthLabel(month)} />}
      <div className="grid2">
        <div className="card">
          <h3>By category</h3>
          {r.byCategory.length === 0 ? <Empty text="No data for this month" /> : (
            <div className="table-wrap"><table><thead><tr><th>Category</th><th>Type</th><th>Txns</th><th>Total</th></tr></thead>
              <tbody>{r.byCategory.map((c, i) => <tr key={i}><td>{c.icon} {c.name}</td><td>{c.type}</td><td>{c.count}</td><td className={c.type === 'income' ? 'pos' : 'neg'}>{fmt(c.total)}</td></tr>)}</tbody></table></div>
          )}
        </div>
        <div className="card">
          <h3>Top 5 expenses</h3>
          {r.top.length === 0 ? <Empty text="Nothing here yet" /> : (
            <div className="table-wrap"><table><thead><tr><th>Date</th><th>Item</th><th>Amount</th></tr></thead>
              <tbody>{r.top.map((t, i) => <tr key={i}><td>{t.date}</td><td>{t.note || t.category}</td><td className="neg">{fmt(t.amount)}</td></tr>)}</tbody></table></div>
          )}
          {r.budgets.length > 0 && <><h3 style={{ marginTop: 18 }}>Budget performance</h3>
            {r.budgets.map((b) => <div key={b.id} className="row between"><span>{b.icon} {b.name}</span><span className={b.status === 'over' ? 'neg' : ''}>{b.pct}% used</span></div>)}</>}
        </div>
      </div>
      {a && a.insights.length > 0 && (
        <div className="card">
          <h3>Smart insights</h3>
          <div className="insights">{a.insights.map((i, k) => <div key={k} className={'insight ' + i.tone}><span className="ins-ico">{i.icon}</span><div><b>{i.title}</b><div>{i.text}</div></div></div>)}</div>
        </div>
      )}
    </div>
  );
}
