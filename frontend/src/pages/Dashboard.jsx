import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend } from 'recharts';
import { api, fmt, thisMonth, monthLabel } from '../api.js';
import { MonthPicker, Empty, Progress, TxRow, useTxEditor, tipProps } from '../components.jsx';
import { TopCategoryBanner } from './Analytics.jsx';

const Icon = ({ d, color }) => (
  <span className="stat-ico" style={{ background: color + '1a', color }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  </span>
);
const ICONS = {
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3M3 7h15a2 2 0 0 1 2 2v3m0 0h-4a2 2 0 0 0 0 4h4v-4z',
  down: 'M12 5v14M5 12l7 7 7-7',
  up: 'M12 19V5M5 12l7-7 7 7',
  coins: 'M12 3v18M17 7.5c0-1.9-2.2-3.5-5-3.5S7 5.6 7 7.5 9.2 11 12 11s5 1.6 5 3.5S14.8 18 12 18s-5-1.6-5-3.5',
};

function StatCard({ icon, color, label, value, caption, tone }) {
  return (
    <div className="card stat">
      <div className="stat-top"><span className="stat-label">{label}</span><Icon d={ICONS[icon]} color={color} /></div>
      <b className={'stat-value ' + (tone || '')}>{value}</b>
      <small className="stat-cap">{caption}</small>
    </div>
  );
}

function Mini({ label, value, sub }) {
  return <div className="mini"><span>{label}</span><b>{value}</b>{sub && <small>{sub}</small>}</div>;
}

function HealthRing({ health }) {
  const r = 52, c = 2 * Math.PI * r;
  const color = health.score >= 70 ? '#16a34a' : health.score >= 50 ? '#eab308' : '#ef4444';
  return (
    <div className="card health">
      <h3>Financial Health Score</h3>
      <div className="row" style={{ gap: 20 }}>
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r={r} fill="none" stroke="var(--line)" strokeWidth="12" />
          <circle cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (c * health.score) / 100} transform="rotate(-90 65 65)" style={{ transition: 'stroke-dashoffset .8s' }} />
          <text x="65" y="63" textAnchor="middle" className="ring-num">{health.score}</text>
          <text x="65" y="82" textAnchor="middle" className="ring-sub">{health.grade}</text>
        </svg>
        <div className="parts">
          <div>Savings <b>{health.parts.savings}/40</b></div>
          <div>Budgets <b>{health.parts.budgets}/30</b></div>
          <div>Tracking habit <b>{health.parts.habit}/15</b></div>
          <div>Goals <b>{health.parts.goals}/15</b></div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ tick, refresh, say }) {
  const [month, setMonth] = useState(thisMonth());
  const [d, setD] = useState(null);
  const ed = useTxEditor({ refresh, say });
  useEffect(() => { api('/analytics/summary?month=' + month).then(setD); }, [month, tick]);
  if (!d) return <div className="muted">Loading dashboard…</div>;

  const tip = (v) => fmt(v);
  const s = d.summary;
  return (
    <div className="page">
      <div className="row between"><h2>Dashboard</h2><MonthPicker value={month} onChange={setMonth} /></div>

      <div className="grid4">
        <StatCard icon="wallet" color="#2563eb" label="Total Balance" value={fmt(d.totals.balance)} tone={d.totals.balance >= 0 ? '' : 'neg'} caption="All income minus all expenses" />
        <StatCard icon="down" color="#16a34a" label="Total Income" value={fmt(d.totals.income)} caption="Everything you have earned" />
        <StatCard icon="up" color="#dc2626" label="Total Expenses" value={fmt(d.totals.expense)} caption="Everything you have spent" />
        <StatCard icon="coins" color="#7c3aed" label="Remaining Money" value={fmt(d.remaining)} tone={d.remaining >= 0 ? '' : 'neg'}
          caption={d.remaining >= 0 ? `Left from ${monthLabel(month)} income` : `Overspent in ${monthLabel(month)}`} />
      </div>

      {s.topCategory && <TopCategoryBanner highest={{ ...s.topCategory, pct: d.expense ? Math.round((s.topCategory.value / d.expense) * 100) : 0 }} label={month === thisMonth() ? 'this month' : 'in ' + monthLabel(month)} />}

      <div className="card summary">
        <div className="row between wrap">
          <h3>{month === thisMonth() ? "This month's" : monthLabel(month)} spending summary</h3>
          <span className="chip">{monthLabel(month)}</span>
        </div>
        <div className="summary-grid">
          <div className="summary-main">
            <span className="muted">Spent so far</span>
            <b className="big">{fmt(d.expense)}</b>
            {s.changePct !== null && (
              <span className={'delta ' + (s.changePct > 0 ? 'up' : 'down')}>
                {s.changePct > 0 ? '▲' : '▼'} {Math.abs(s.changePct)}% vs last month
              </span>
            )}
            <div className="used">
              <div className="row between"><small>Income used</small><small><b>{d.income > 0 ? Math.min(Math.round((d.expense / d.income) * 100), 999) : 0}%</b></small></div>
              <Progress pct={d.income > 0 ? (d.expense / d.income) * 100 : d.expense > 0 ? 100 : 0} status={d.income > 0 && d.expense > d.income ? 'over' : d.expense > d.income * 0.8 ? 'warning' : 'ok'} />
              <div className="row between"><small>Income {fmt(d.income)}</small><small>Spent {fmt(d.expense)}</small></div>
            </div>
            <div className="minis">
              <Mini label="Daily average" value={fmt(s.avgDaily)} />
              <Mini label="Transactions" value={s.txCount} />
              <Mini label="Top category" value={s.topCategory ? `${s.topCategory.icon} ${s.topCategory.name}` : '—'} sub={s.topCategory ? fmt(s.topCategory.value) : null} />
              <Mini label="Largest expense" value={s.largest ? fmt(s.largest.amount) : '—'} sub={s.largest ? (s.largest.note || s.largest.category) : null} />
              {month === thisMonth() && <Mini label="Projected month-end" value={fmt(d.forecast)} />}
              {s.budgetTotal > 0 && <Mini label="Budget used" value={`${Math.round((s.budgetSpent / s.budgetTotal) * 100)}%`} sub={`${fmt(s.budgetSpent)} of ${fmt(s.budgetTotal)}`} />}
            </div>
          </div>

          <div className="summary-chart">
            <span className="muted">Where your money went</span>
            {d.byCategory.length === 0 ? <Empty text="No expenses this month" /> : (
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <ResponsiveContainer width="55%" height={210} minWidth={170}>
                  <PieChart>
                    <Pie data={d.byCategory} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="none">
                      {d.byCategory.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                    <Tooltip formatter={tip} {...tipProps} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="legend">
                  {d.byCategory.slice(0, 6).map((c) => <div key={c.name}><i style={{ background: c.color }} />{c.icon} {c.name}<b>{fmt(c.value)}</b></div>)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid2">
        <HealthRing health={d.health} />
        <div className="card">
          <h3>🧠 Smart insights</h3>
          {d.insights.map((i, k) => <div key={k} className={'insight ' + i.tone}><span>{i.icon}</span>{i.text}</div>)}
        </div>
      </div>

      <div className="grid1">
        <div className="card">
          <h3>6-month income vs expense</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={d.trend.map((t) => ({ ...t, name: monthLabel(t.month) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={12} />
              <YAxis stroke="var(--muted)" fontSize={12} />
              <Tooltip formatter={tip} {...tipProps} /><Legend />
              <Bar dataKey="income" fill="#16a34a" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="#dc2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="row between"><h3>Cumulative spending this month</h3>{month === thisMonth() && <span className="chip">🔮 Forecast: {fmt(d.forecast)}</span>}</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={d.daily}>
            <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".6" /><stop offset="100%" stopColor="#2563eb" stopOpacity="0" /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="day" stroke="var(--muted)" fontSize={12} /><YAxis stroke="var(--muted)" fontSize={12} />
            <Tooltip formatter={tip} {...tipProps} />
            <Area type="monotone" dataKey="cumulative" stroke="#2563eb" strokeWidth={3} fill="url(#g)" connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="row between"><h3>Recent transactions</h3><button className="btn small" onClick={ed.openNew}>+ Add</button></div>
        {d.recent.length === 0 ? <Empty text="No transactions yet - try the quick-add bar above!" /> : d.recent.map((t) => <TxRow key={t.id} t={t} onEdit={ed.openEdit} onDelete={ed.askDelete} />)}
      </div>
      {ed.modals}
    </div>
  );
}
