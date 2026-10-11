import React, { useState } from 'react';
import { api } from '../api.js';

export const Logo = ({ size = 34 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="var(--brand)" />
    <path d="M10 27l7-8 5 5 8-11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FEATURES = [
  ['Smart overview', 'Balance, income and expenses at a glance'],
  ['Budget alerts', 'Get notified before you overspend'],
  ['Savings goals', 'Track progress toward what matters'],
  ['Secure & synced', 'Your data is available on any device'],
];

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const isReg = mode === 'register';

  const switchTo = (m) => { setMode(m); setErr(''); };

  async function go(path, body) {
    setErr(''); setBusy(true);
    try {
      const r = await api(path, { method: 'POST', body });
      localStorage.setItem('sw_token', r.token);
      onLogin(r.user);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  const submit = (e) => {
    e.preventDefault();
    if (isReg && f.name.trim().length < 2) return setErr('Please enter your name (at least 2 characters)');
    if (!f.email.trim()) return setErr('Please enter your email');
    if (isReg && f.password.length < 6) return setErr('Password must be at least 6 characters');
    go(isReg ? '/auth/register' : '/auth/login', { ...f, name: f.name.trim(), email: f.email.trim() });
  };

  return (
    <div className="auth-wrap">
      <section className="auth-hero">
        <div className="auth-brand"><Logo size={42} /><span>SpendWise</span></div>
        <h1>Take control of your money.</h1>
        <p>A simple, secure way to track spending, stay on budget and grow your savings.</p>
        <ul>
          {FEATURES.map(([t, d]) => (
            <li key={t}><i>✓</i><div><b>{t}</b><span>{d}</span></div></li>
          ))}
        </ul>
      </section>

      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={!isReg} className={!isReg ? 'on' : ''} onClick={() => switchTo('login')}>Sign in</button>
          <button type="button" role="tab" aria-selected={isReg} className={isReg ? 'on' : ''} onClick={() => switchTo('register')}>Create account</button>
        </div>

        <h2>{isReg ? 'Create your account' : 'Welcome back'}</h2>
        <p className="muted">{isReg ? 'It takes less than a minute.' : 'Sign in to view your dashboard.'}</p>

        {isReg && <label>Full name<input value={f.name} onChange={set('name')} placeholder="Your name" autoComplete="name" /></label>}
        <label>Email<input type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" /></label>
        <label>Password<input type="password" value={f.password} onChange={set('password')} placeholder={isReg ? 'Minimum 6 characters' : 'Your password'} autoComplete={isReg ? 'new-password' : 'current-password'} /></label>

        {err && <div className="error" role="alert">{err}</div>}

        <button className="btn" disabled={busy}>{busy ? 'Please wait…' : isReg ? 'Create account' : 'Sign in'}</button>
        <div className="or"><span>or</span></div>
        <button type="button" className="btn ghost" disabled={busy} onClick={() => go('/auth/demo')}>Try demo account (with sample data)</button>

        <p className="muted center-text">
          {isReg ? 'Already have an account?' : 'New to SpendWise?'}{' '}
          <button type="button" className="link" onClick={() => switchTo(isReg ? 'login' : 'register')}>{isReg ? 'Sign in' : 'Create an account'}</button>
        </p>
      </form>
    </div>
  );
}
