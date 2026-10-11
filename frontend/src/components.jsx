import React, { useState } from 'react';
import { api, fmt, today } from './api.js';

export function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Progress = ({ pct, status = 'ok' }) => (
  <div className="bar"><div className={'fill ' + status} style={{ width: Math.min(pct, 100) + '%' }} /></div>
);

export const Empty = ({ icon = '🫥', text }) => (
  <div className="empty"><div style={{ fontSize: 40 }}>{icon}</div><p>{text}</p></div>
);

export function MonthPicker({ value, onChange }) {
  return <input type="month" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} />;
}

/* ---------- Edit / Delete controls ---------- */
const Pencil = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>;
const Trash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;

export function RowActions({ onEdit, onDelete }) {
  return (
    <div className="row-actions">
      {onEdit && <button type="button" className="icon-btn" title="Edit" aria-label="Edit" onClick={onEdit}><Pencil /></button>}
      {onDelete && <button type="button" className="icon-btn danger" title="Delete" aria-label="Delete" onClick={onDelete}><Trash /></button>}
    </div>
  );
}

export function Confirm({ title = 'Are you sure?', text, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="muted" style={{ margin: '14px 0 20px' }}>{text}</p>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn ghost small" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn small danger-btn" onClick={onConfirm} autoFocus>{confirmLabel}</button>
      </div>
    </Modal>
  );
}

/* ---------- One shared transaction row + add/edit/delete flow ---------- */
export function TxRow({ t, onEdit, onDelete }) {
  return (
    <div className="tx">
      <span className="dot" style={{ background: t.color + '33' }}>{t.icon}</span>
      <div className="grow"><b>{t.note || t.category}</b><small>{t.category} · {t.date}</small></div>
      <b className={t.type === 'income' ? 'pos' : 'neg'}>{t.type === 'income' ? '+' : '-'}{fmt(t.amount)}</b>
      <RowActions onEdit={() => onEdit(t)} onDelete={() => onDelete(t)} />
    </div>
  );
}

export function useTxEditor({ refresh, say }) {
  const [form, setForm] = useState(null);
  const [cats, setCats] = useState([]);
  const [del, setDel] = useState(null);
  const loadCats = () => api('/categories').then(setCats).catch(() => {});

  const openNew = () => { loadCats(); setForm({ type: 'expense', amount: '', date: today(), category_id: '', note: '' }); };
  const openEdit = (t) => { loadCats(); setForm({ id: t.id, type: t.type, amount: t.amount, date: t.date, category_id: t.category_id, note: t.note || '' }); };

  async function save(e) {
    e.preventDefault();
    try {
      const body = { ...form, category_id: Number(form.category_id) };
      const r = form.id ? await api('/transactions/' + form.id, { method: 'PUT', body }) : await api('/transactions', { method: 'POST', body });
      say(form.id ? 'Transaction updated' : 'Transaction added');
      (r.alerts || []).forEach((a) => say(a.text, a.level === 'over' ? 'bad' : 'warn'));
      setForm(null); refresh();
    } catch (err) { say(err.message, 'bad'); }
  }
  async function doDelete() {
    try { await api('/transactions/' + del.id, { method: 'DELETE' }); say('Transaction deleted'); setDel(null); refresh(); }
    catch (err) { say(err.message, 'bad'); setDel(null); }
  }

  const formCats = cats.filter((c) => c.type === form?.type);
  const modals = (
    <>
      {form && (
        <Modal title={form.id ? 'Edit transaction' : 'New transaction'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="form">
            <div className="seg">
              {['expense', 'income'].map((t) => <button type="button" key={t} className={form.type === t ? 'on ' + t : ''} onClick={() => setForm({ ...form, type: t, category_id: '' })}>{t}</button>)}
            </div>
            <label>Amount (₹)<input type="number" min="1" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
            <label>Category
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} required>
                <option value="">Select…</option>{formCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </label>
            <label>Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></label>
            <label>Note<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="optional" /></label>
            <button className="btn">{form.id ? 'Save changes' : 'Add transaction'}</button>
          </form>
        </Modal>
      )}
      {del && <Confirm title="Delete transaction?" text={`"${del.note || del.category}" (${fmt(del.amount)} on ${del.date}) will be removed permanently.`} onConfirm={doDelete} onCancel={() => setDel(null)} />}
    </>
  );
  return { openNew, openEdit, askDelete: setDel, modals };
}

/* ---------- Recharts theming (dark mode friendly) ---------- */
export const tipProps = {
  contentStyle: { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--text)', boxShadow: '0 8px 24px rgba(0,0,0,.2)' },
  itemStyle: { color: 'var(--text)' },
  labelStyle: { color: 'var(--muted)', marginBottom: 4 },
  cursor: { fill: 'rgba(148,163,184,.12)' },
};
