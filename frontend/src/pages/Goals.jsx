import React, { useEffect, useState } from 'react';
import { api, fmt } from '../api.js';
import { Modal, Progress, Empty, RowActions, Confirm } from '../components.jsx';

export default function Goals({ tick, refresh, say }) {
  const [goals, setGoals] = useState([]);
  const [form, setForm] = useState(null);
  const [contrib, setContrib] = useState(null);
  const [del, setDel] = useState(null);
  useEffect(() => { api('/goals').then(setGoals); }, [tick]);

  async function save(e) {
    e.preventDefault();
    try {
      if (form.id) await api('/goals/' + form.id, { method: 'PUT', body: form });
      else await api('/goals', { method: 'POST', body: form });
      say(form.id ? 'Goal updated' : 'Goal created 🎯'); setForm(null); refresh();
    } catch (err) { say(err.message, 'bad'); }
  }
  async function addSavings(e) {
    e.preventDefault();
    try { await api(`/goals/${contrib.g.id}/contribute`, { method: 'POST', body: { amount: contrib.amount } }); say('Nice! Saved more 🎉'); setContrib(null); refresh(); }
    catch (err) { say(err.message, 'bad'); }
  }
  async function doDelete() {
    try { await api('/goals/' + del.id, { method: 'DELETE' }); say('Goal deleted'); } catch (err) { say(err.message, 'bad'); }
    setDel(null); refresh();
  }

  return (
    <div className="page">
      <div className="row between"><h2>Savings goals</h2><button className="btn small" onClick={() => setForm({ name: '', icon: '🎯', target: '', saved: 0 })}>+ New goal</button></div>
      <div className="grid2">
        {goals.length === 0 && <div className="card"><Empty icon="🏆" text="Create a goal - a laptop, a trip, an emergency fund…" /></div>}
        {goals.map((g) => {
          const pct = Math.round((g.saved / g.target) * 100);
          return (
            <div className="card" key={g.id}>
              <div className="row between"><b style={{ fontSize: 18 }}>{g.icon} {g.name}</b><RowActions onEdit={() => setForm({ ...g })} onDelete={() => setDel(g)} /></div>
              <Progress pct={pct} status={pct >= 100 ? 'done' : 'ok'} />
              <div className="row between muted"><span>{fmt(g.saved)} of {fmt(g.target)}</span><span>{pct}%{pct >= 100 ? ' 🎉' : ''}</span></div>
              <button className="btn ghost small" onClick={() => setContrib({ g, amount: '' })}>+ Add savings</button>
            </div>
          );
        })}
      </div>

      {form && (
        <Modal title={form.id ? 'Edit savings goal' : 'New savings goal'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="form">
            <label>Goal name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Emoji<input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} maxLength={4} /></label>
            <label>Target (₹)<input type="number" min="1" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} required /></label>
            <label>Saved so far (₹)<input type="number" min="0" value={form.saved} onChange={(e) => setForm({ ...form, saved: e.target.value })} /></label>
            <button className="btn">{form.id ? 'Save changes' : 'Create goal'}</button>
          </form>
        </Modal>
      )}
      {contrib && (
        <Modal title={`Add savings - ${contrib.g.name}`} onClose={() => setContrib(null)}>
          <form onSubmit={addSavings} className="form">
            <label>Amount (₹)<input type="number" min="1" autoFocus value={contrib.amount} onChange={(e) => setContrib({ ...contrib, amount: e.target.value })} required /></label>
            <button className="btn">Add</button>
          </form>
        </Modal>
      )}
      {del && <Confirm title="Delete goal?" text={`"${del.name}" and its progress will be removed.`} onConfirm={doDelete} onCancel={() => setDel(null)} />}
    </div>
  );
}
