import React, { useEffect, useState } from 'react';
import { api, getToken, fmt } from './api.js';
import Auth, { Logo } from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Analytics from './pages/Analytics.jsx';
import Transactions from './pages/Transactions.jsx';
import Budgets from './pages/Budgets.jsx';
import Goals from './pages/Goals.jsx';
import Categories from './pages/Categories.jsx';
import Reports from './pages/Reports.jsx';

const TABS = [
  ['dashboard', '📊', 'Dashboard'], ['analytics', '📈', 'Analytics'], ['transactions', '💳', 'Transactions'], ['budgets', '🎯', 'Budgets'],
  ['goals', '🏆', 'Goals'], ['categories', '🏷️', 'Categories'], ['reports', '📑', 'Reports'],
];

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('sw_theme') || (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [tick, setTick] = useState(0);
  const [notes, setNotes] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [quick, setQuick] = useState('');
  const [toast, setToast] = useState(null);
  const refresh = () => setTick((t) => t + 1);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('sw_theme', theme); }, [theme]);
  useEffect(() => {
    if (!getToken()) return setReady(true);
    api('/auth/me').then(setUser).catch(() => {}).finally(() => setReady(true));
  }, []);
  useEffect(() => { if (user) api('/notifications').then(setNotes).catch(() => {}); }, [user, tick]);

  const say = (msg, kind = 'ok') => { setToast({ msg, kind }); setTimeout(() => setToast(null), 3500); };
  const logout = () => { localStorage.removeItem('sw_token'); setUser(null); };

  async function quickAdd(e) {
    e.preventDefault();
    if (!quick.trim()) return;
    try {
      const r = await api('/transactions/quick', { method: 'POST', body: { text: quick } });
      const p = r.parsed;
      say(`${p.icon} Added ${p.type} ${fmt(p.amount)} - ${p.category} (${p.date})`);
      r.alerts.forEach((a) => setTimeout(() => say(a.text, a.level === 'over' ? 'bad' : 'warn'), 600));
      setQuick(''); refresh();
    } catch (err) { say(err.message, 'bad'); }
  }

  if (!ready) return <div className="center">Loading…</div>;
  const themeBtn = <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle dark mode" aria-label="Toggle dark mode">{theme === 'dark' ? '☀️' : '🌙'}</button>;
  if (!user) return <><div className="theme-float">{themeBtn}</div><Auth onLogin={setUser} /></>;

  const Page = { dashboard: Dashboard, analytics: Analytics, transactions: Transactions, budgets: Budgets, goals: Goals, categories: Categories, reports: Reports }[tab];
  return (
    <div className="layout">
      <aside className="side">
        <div className="brand"><Logo size={30} /><span>SpendWise</span></div>
        {TABS.map(([k, i, l]) => (
          <button key={k} className={'nav' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}><span>{i}</span> {l}</button>
        ))}
        <div className="grow" />
        <div className="me">👤 {user.name}</div>
        <button className="nav" onClick={logout}>🚪 Logout</button>
      </aside>
      <main className="main">
        <header className="top">
          <form onSubmit={quickAdd} className="quick">
            <span>⚡</span>
            <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder='Quick add: "coffee 150 yesterday" · "salary 52k" · "uber 320"' />
            <button className="btn small">Add</button>
          </form>
          <div className="row">
            <div className="bell-wrap">
              <button className="icon-btn" onClick={() => setShowNotes(!showNotes)}>🔔{notes.length > 0 && <b className="badge">{notes.length}</b>}</button>
              {showNotes && (
                <div className="dropdown card">
                  <h4>Budget alerts</h4>
                  {notes.length === 0 ? <p className="muted">All budgets are healthy 🎉</p> : notes.map((n, i) => <div key={i} className={'note ' + n.level}>{n.text}</div>)}
                </div>
              )}
            </div>
            {themeBtn}
            <button className="icon-btn m-only" onClick={logout} title="Logout" aria-label="Logout">🚪</button>
          </div>
        </header>
        <nav className="mobile-nav">
          {TABS.map(([k, i]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{i}</button>)}
        </nav>
        <Page tick={tick} refresh={refresh} say={say} />
      </main>
      {toast && <div className={'toast ' + toast.kind}>{toast.msg}</div>}
    </div>
  );
}
