import React, { useEffect, useState } from 'react';
import { api, fmt, thisMonth } from '../api.js';
import { Modal, Progress, MonthPicker, Empty, RowActions, Confirm } from '../components.jsx';

export default function Budgets({ tick, refresh, say }) {
  const [month, setMonth] = useState(thisMonth());
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);

  useEffect(() => { api('/budgets?month=' + month).then(setList); }, [month, tick]);
  useEffect(() => { api('/categories').then((c) => setCats(c.filter((x) => x.type === 'expense'))); }, [tick]);

  async function save(e) {
    e.preventDefault();
    try {
      await api('/budgets', { method: 'POST', body: { category_id: Number(form.category_id), amount: form.amount, month } });
      say(form.editing ? 'Budget updated' : 'Budget saved'); setForm(null); refresh();
    } catch (err) { say(err.message, 'bad'); }
  }
  async function doDelete() {
    try { await api('/budgets/' + del.id, { method: 'DELETE' }); say('Budget deleted'); } catch (err) { say(err.message, 'bad'); }
    setDel(null); refresh();
  }

  const tot = list.reduce((a, b) => ({ amount: a.amount + b.amount, spent: a.spent + b.spent }), { amount: 0, spent: 0 });
  return (
    <div className="page">
      <div className="row between"><h2>Budgets</h2><div className="row"><MonthPicker value={month} onChange={setMonth} /><button className="btn small" onClick={() => setForm({ category_id: '', amount: '' })}>+ Set budget</button></div></div>
      {list.length > 0 && (
        <div className="card">
          <div className="row between"><b>Overall</b><span>{fmt(tot.spent)} / {fmt(tot.amount)}</span></div>
          <Progress pct={(tot.spent / tot.amount) * 100} status={tot.spent > tot.amount ? 'over' : 'ok'} />
        </div>
      )}
      <div className="grid2">
        {list.length === 0 && <div className="card"><Empty icon="🎯" text="No budgets for this month. Set one to get alerts at 80% and 100%." /></div>}
        {list.map((b) => (
          <div className={'card budget ' + b.status} key={b.id}>
            <div className="row between">
              <b>{b.icon} {b.name}</b>
              <div className="row"><span className={'chip ' + b.status}>{b.status === 'over' ? 'Exceeded' : b.status === 'warning' ? 'Near limit' : 'On track'}</span><RowActions onEdit={() => setForm({ category_id: b.category_id, amount: b.amount, editing: true, name: b.icon + ' ' + b.name })} onDelete={() => setDel(b)} /></div>
            </div>
            <Progress pct={b.pct} status={b.status} />
            <div className="row between muted"><span>{fmt(b.spent)} spent · {b.pct}%</span><span>{b.amount - b.spent >= 0 ? fmt(b.amount - b.spent) + ' left' : fmt(b.spent - b.amount) + ' over'}</span></div>
          </div>
        ))}
      </div>
      {del && <Confirm title="Delete budget?" text={`The ${del.name} budget for ${month} will be removed.`} onConfirm={doDelete} onCancel={() => setDel(null)} />}
      {form && (
        <Modal title={form.editing ? `Edit budget - ${month}` : `Set budget for ${month}`} onClose={() => setForm(null)}>
          <form onSubmit={save} className="form">
            <label>Category
              <select value={form.category_id} disabled={form.editing} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
                <option value="">Select…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </label>
            <label>Monthly limit (₹)<input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
            <button className="btn">{form.editing ? 'Save changes' : 'Save budget'}</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
