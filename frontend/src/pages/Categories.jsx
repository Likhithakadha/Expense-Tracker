import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Modal, Confirm } from '../components.jsx';

export default function Categories({ tick, refresh, say }) {
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  useEffect(() => { api('/categories').then(setCats); }, [tick]);

  async function save(e) {
    e.preventDefault();
    try {
      if (form.id) await api('/categories/' + form.id, { method: 'PUT', body: form });
      else await api('/categories', { method: 'POST', body: form });
      say('Category saved'); setForm(null); refresh();
    } catch (err) { say(err.message, 'bad'); }
  }
  async function doDelete() {
    try { await api('/categories/' + del.id, { method: 'DELETE' }); say('Category deleted'); refresh(); }
    catch (err) { say(err.message, 'bad'); }
    setDel(null);
  }
  const group = (type) => (
    <div className="card">
      <h3>{type === 'expense' ? '💸 Expense' : '💰 Income'} categories</h3>
      <div className="chips">
        {cats.filter((c) => c.type === type).map((c) => (
          <div key={c.id} className="cat-chip" style={{ borderColor: c.color }}>
            <span>{c.icon} {c.name}</span>
            <button className="icon-btn tiny" title="Edit" aria-label="Edit" onClick={() => setForm({ ...c })}>✏️</button>
            <button className="icon-btn tiny" title="Delete" aria-label="Delete" onClick={() => setDel(c)}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div className="page">
      <div className="row between"><h2>Categories</h2><button className="btn small" onClick={() => setForm({ name: '', icon: '🏷️', color: '#2563eb', type: 'expense' })}>+ New category</button></div>
      {group('expense')}{group('income')}
      {del && <Confirm title="Delete category?" text={`"${del.name}" will be removed (only possible if it has no transactions).`} onConfirm={doDelete} onCancel={() => setDel(null)} />}
      {form && (
        <Modal title={form.id ? 'Edit category' : 'New category'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="form">
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Emoji<input value={form.icon} maxLength={4} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></label>
            <label>Colour<input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></label>
            {!form.id && <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="expense">Expense</option><option value="income">Income</option></select></label>}
            <button className="btn">Save</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
