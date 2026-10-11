import React, { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';
import { Empty, TxRow, useTxEditor } from '../components.jsx';

export default function Transactions({ tick, refresh, say }) {
  const [rows, setRows] = useState([]);
  const [cats, setCats] = useState([]);
  const [flt, setFlt] = useState({ q: '', type: '', category: '', from: '', to: '', sort: 'date', order: 'desc' });
  const ed = useTxEditor({ refresh, say });

  useEffect(() => { api('/categories').then(setCats); }, [tick]);
  useEffect(() => {
    const qs = new URLSearchParams(Object.entries(flt).filter(([, v]) => v)).toString();
    api('/transactions?' + qs).then(setRows);
  }, [flt, tick]);

  const setF = (k) => (e) => setFlt({ ...flt, [k]: e.target.value });
  const total = rows.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);

  return (
    <div className="page">
      <div className="row between"><h2>Transactions</h2><button className="btn small" onClick={ed.openNew}>+ Add</button></div>
      <div className="card filters">
        <input placeholder="🔍 Search note or category" value={flt.q} onChange={setF('q')} />
        <select value={flt.type} onChange={setF('type')}><option value="">All types</option><option value="income">Income</option><option value="expense">Expense</option></select>
        <select value={flt.category} onChange={setF('category')}><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}</select>
        <input type="date" value={flt.from} onChange={setF('from')} title="From" />
        <input type="date" value={flt.to} onChange={setF('to')} title="To" />
        <select value={flt.sort + ':' + flt.order} onChange={(e) => { const [sort, order] = e.target.value.split(':'); setFlt({ ...flt, sort, order }); }}>
          <option value="date:desc">Newest first</option><option value="date:asc">Oldest first</option>
          <option value="amount:desc">Amount high → low</option><option value="amount:asc">Amount low → high</option>
        </select>
      </div>
      <div className="muted">{rows.length} transactions · Net <b className={total >= 0 ? 'pos' : 'neg'}>{fmt(total)}</b></div>
      <div className="card">
        {rows.length === 0 ? <Empty text="No transactions match" /> : rows.map((t) => <TxRow key={t.id} t={t} onEdit={ed.openEdit} onDelete={ed.askDelete} />)}
      </div>
      {ed.modals}
    </div>
  );
}
