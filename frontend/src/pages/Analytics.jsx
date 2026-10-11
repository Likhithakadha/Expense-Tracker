import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { api, fmt, thisMonth, monthLabel } from '../api.js';
import { MonthPicker, Empty, Progress, tipProps } from '../components.jsx';

const short = (v) => (v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v >= 1000 ? Math.round(v / 1000) + 'k' : v);

export function TopCategoryBanner({ highest, label }) {
  if (!highest) return null;
  return (
    <div className="card banner">
      <span className="banner-ico" style={{ background: highest.color + '26' }}>{highest.icon}</span>
      <div className="grow">
        <small className="muted">Highest spending category {label}</small>
        <h3 className="banner-title">You spent most on {highest.name}</h3>
        <div className="row between"><span><b>{fmt(highest.value)}</b> · {highest.pct}% of your total spending</span></div>
        <Progress pct={highest.pct} status="ok" />
      </div>
    </div>
  );
}

export default function Analytics({ tick }) {
  const [month, setMonth] = useState(thisMonth());
  const [d, setD] = useState(null);
  useEffect(() => { api('/analytics/overview?month=' + month).then(setD); }, [month, tick]);
  if (!d) return <div className="muted">Loading analytics…</div>;

  const tip = (v) => fmt(v);
  const maxWeek = Math.max(...d.weekly.map((w) => w.spent), 0);
  const maxDay = Math.max(...d.byWeekday.map((w) => w.spent), 0);
  const when = month === thisMonth() ? 'this month' : 'in ' + monthLabel(month);

  return (
    <div className="page">
      <div className="row between wrap"><h2>Analytics</h2><MonthPicker value={month} onChange={setMonth} /></div>

      {d.highest ? <TopCategoryBanner highest={d.highest} label={when} /> : <div className="card"><Empty text={`No expenses ${when} yet`} /></div>}

      <div className="grid2">
        <div className="card">
          <h3>Monthly income vs expenses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.monthly.map((m) => ({ ...m, name: monthLabel(m.month).replace(' 20', " '") }))} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} interval="preserveStartEnd" />
              <YAxis stroke="var(--muted)" fontSize={11} tickFormatter={short} width={42} />
              <Tooltip formatter={tip} {...tipProps} /><Legend />
              <Bar dataKey="income" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Category-wise spending</h3>
          {d.byCategory.length === 0 ? <Empty text="No expenses in this month" /> : (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <ResponsiveContainer width="55%" height={240} minWidth={190}>
                <PieChart>
                  <Pie data={d.byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={2} stroke="none">
                    {d.byCategory.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                  <Tooltip formatter={tip} {...tipProps} />
                </PieChart>
              </ResponsiveContainer>
              <div className="legend">
                {d.byCategory.slice(0, 7).map((c) => <div key={c.name}><i style={{ background: c.color }} />{c.icon} {c.name}<b>{c.pct}%</b></div>)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Weekly spending <span className="muted">· {monthLabel(month)}</span></h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.weekly.map((w) => ({ ...w, name: w.week.replace('Week ', 'W') + ' (' + w.range + ')' }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted)" fontSize={11} />
              <YAxis stroke="var(--muted)" fontSize={11} tickFormatter={short} width={42} />
              <Tooltip formatter={(v) => [fmt(v), 'Spent']} {...tipProps} />
              <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
                {d.weekly.map((w) => <Cell key={w.week} fill={w.spent === maxWeek && maxWeek > 0 ? '#dc2626' : '#2563eb'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <small className="muted">Red bar = your most expensive week.</small>
        </div>

        <div className="card">
          <h3>Highest spending categories</h3>
          {d.byCategory.length === 0 ? <Empty text="Nothing to rank yet" /> : (
            <div className="rank">
              {d.byCategory.slice(0, 6).map((c, i) => (
                <div key={c.name} className="rank-row">
                  <span className="rank-n">{i + 1}</span>
                  <div className="grow">
                    <div className="row between"><span>{c.icon} {c.name}</span><b>{fmt(c.value)}</b></div>
                    <div className="bar thin"><div className="fill" style={{ width: c.pct + '%', background: c.color }} /></div>
                  </div>
                  <small className="muted rank-pct">{c.pct}%</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Spending by day of week</h3>
          <ResponsiveContainer width="100%" height={330}>
            <BarChart data={d.byWeekday}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted)" fontSize={12} />
              <YAxis stroke="var(--muted)" fontSize={11} tickFormatter={short} width={42} />
              <Tooltip formatter={(v) => [fmt(v), 'Spent']} {...tipProps} />
              <Bar dataKey="spent" radius={[6, 6, 0, 0]}>
                {d.byWeekday.map((w) => <Cell key={w.day} fill={w.spent === maxDay && maxDay > 0 ? '#f59e0b' : '#64748b'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Smart insights</h3>
          <div className="insights">
            {d.insights.map((i, k) => (
              <div key={k} className={'insight ' + i.tone}>
                <span className="ins-ico">{i.icon}</span>
                <div><b>{i.title}</b><div>{i.text}</div></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
