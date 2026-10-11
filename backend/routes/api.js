const router = require('express').Router();
const { all, get, run } = require('../db');
const { validate } = require('../middleware/auth');
const { ymd } = require('../seed');

const thisMonth = () => ymd(new Date()).slice(0, 7);
const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });
const own = (table, id, uid) => get(`SELECT * FROM ${table} WHERE id=? AND user_id=?`, [id, uid]);

/* ---------------- Categories ---------------- */
router.get('/categories', (req, res) => res.json(all('SELECT * FROM categories WHERE user_id=? ORDER BY type, name', [req.user.id])));

router.post('/categories', validate({ name: { required: true, min: 2 }, type: { required: true, in: ['income', 'expense'] } }), (req, res) => {
  const { name, icon = '🏷️', color = '#6366f1', type } = req.body;
  const id = run('INSERT INTO categories(user_id,name,icon,color,type) VALUES(?,?,?,?,?)', [req.user.id, name, icon, color, type]);
  res.json(own('categories', id, req.user.id));
});

router.put('/categories/:id', (req, res) => {
  const c = own('categories', req.params.id, req.user.id);
  if (!c) throw bad('Category not found', 404);
  const { name = c.name, icon = c.icon, color = c.color } = req.body;
  run('UPDATE categories SET name=?,icon=?,color=? WHERE id=?', [name, icon, color, c.id]);
  res.json(own('categories', c.id, req.user.id));
});

router.delete('/categories/:id', (req, res) => {
  const c = own('categories', req.params.id, req.user.id);
  if (!c) throw bad('Category not found', 404);
  if (get('SELECT COUNT(*) n FROM transactions WHERE category_id=?', [c.id]).n > 0) throw bad('Category has transactions - move or delete them first', 409);
  run('DELETE FROM budgets WHERE category_id=?', [c.id]);
  run('DELETE FROM categories WHERE id=?', [c.id]);
  res.json({ ok: true });
});

/* ---------------- Transactions ---------------- */
const txRules = {
  type: { required: true, in: ['income', 'expense'] },
  amount: { required: true, type: 'number' },
  date: { required: true, type: 'date' },
  category_id: { required: true },
};

router.get('/transactions', (req, res) => {
  const { type, category, q, from, to, sort = 'date', order = 'desc' } = req.query;
  let sql = `SELECT t.*, c.name category, c.icon, c.color FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.user_id=?`;
  const p = [req.user.id];
  if (type) { sql += ' AND t.type=?'; p.push(type); }
  if (category) { sql += ' AND t.category_id=?'; p.push(category); }
  if (from) { sql += ' AND t.date>=?'; p.push(from); }
  if (to) { sql += ' AND t.date<=?'; p.push(to); }
  if (q) { sql += ' AND (t.note LIKE ? OR c.name LIKE ?)'; p.push(`%${q}%`, `%${q}%`); }
  const col = sort === 'amount' ? 't.amount' : 't.date';
  sql += ` ORDER BY ${col} ${order === 'asc' ? 'ASC' : 'DESC'}, t.id DESC`;
  res.json(all(sql, p));
});

router.post('/transactions', validate(txRules), (req, res) => {
  const { type, amount, date, category_id, note = '' } = req.body;
  const c = own('categories', category_id, req.user.id);
  if (!c) throw bad('Invalid category');
  if (c.type !== type) throw bad(`Category "${c.name}" is for ${c.type}`);
  const id = run('INSERT INTO transactions(user_id,category_id,type,amount,note,date) VALUES(?,?,?,?,?,?)', [req.user.id, c.id, type, Number(amount), note, date]);
  res.json({ id, alerts: budgetAlertsFor(req.user.id, c.id, date.slice(0, 7)) });
});

router.put('/transactions/:id', validate(txRules), (req, res) => {
  const t = own('transactions', req.params.id, req.user.id);
  if (!t) throw bad('Transaction not found', 404);
  const { type, amount, date, category_id, note = '' } = req.body;
  const c = own('categories', category_id, req.user.id);
  if (!c || c.type !== type) throw bad('Invalid category for this type');
  run('UPDATE transactions SET type=?,amount=?,date=?,category_id=?,note=? WHERE id=?', [type, Number(amount), date, c.id, note, t.id]);
  res.json({ ok: true });
});

router.delete('/transactions/:id', (req, res) => {
  if (!own('transactions', req.params.id, req.user.id)) throw bad('Transaction not found', 404);
  run('DELETE FROM transactions WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

/* ---- Smart quick-add: "coffee 150 yesterday", "salary 52k", "uber 320 2 days ago" ---- */
const KW = {
  'Food & Dining': 'coffee tea lunch dinner breakfast pizza burger swiggy zomato restaurant snack biryani',
  Groceries: 'grocery groceries vegetables milk fruits supermarket',
  Transport: 'uber ola taxi bus metro fuel petrol diesel auto train cab',
  Shopping: 'shopping clothes shoes amazon flipkart shirt',
  'Bills & Utilities': 'bill bills electricity wifi internet recharge rent water gas',
  Entertainment: 'movie netflix game concert party',
  Health: 'doctor medicine pharmacy hospital gym',
  Education: 'book books course fees tuition',
  Travel: 'flight hotel trip',
  Salary: 'salary', Freelance: 'freelance client', Investments: 'dividend interest stocks', Gifts: 'gift',
};
function parseQuick(text, cats) {
  let rest = text.toLowerCase();
  const d = new Date();
  const ago = rest.match(/(\d+)\s*days?\s*ago/);
  if (ago) { d.setDate(d.getDate() - Number(ago[1])); rest = rest.replace(ago[0], ' '); }
  if (/yesterday/.test(rest)) d.setDate(d.getDate() - 1);
  rest = rest.replace(/yesterday|today/g, ' ');
  const m = rest.match(/(\d+(?:\.\d+)?)\s*(k)?\b/);
  if (!m) throw bad('Add an amount, e.g. "coffee 150"');
  const amount = parseFloat(m[1]) * (m[2] ? 1000 : 1);
  rest = rest.replace(m[0], ' ').replace(/\s+/g, ' ').trim();
  const type = /salary|income|received|bonus|freelance|refund|earned|dividend|gift received/.test(text.toLowerCase()) ? 'income' : 'expense';
  const pool = cats.filter((c) => c.type === type);
  const words = rest.split(' ');
  let cat = pool.find((c) => words.some((w) => w.length > 2 && c.name.toLowerCase().includes(w)));
  if (!cat) cat = pool.find((c) => words.some((w) => (KW[c.name] || '').split(' ').includes(w)));
  if (!cat) cat = pool.find((c) => c.name === 'Other') || pool[0];
  const note = (rest || cat.name).replace(/^./, (s) => s.toUpperCase());
  return { type, amount, date: ymd(d), category: cat, note };
}
router.post('/transactions/quick', validate({ text: { required: true, min: 3 } }), (req, res) => {
  const cats = all('SELECT * FROM categories WHERE user_id=?', [req.user.id]);
  const p = parseQuick(req.body.text, cats);
  const id = run('INSERT INTO transactions(user_id,category_id,type,amount,note,date) VALUES(?,?,?,?,?,?)', [req.user.id, p.category.id, p.type, p.amount, p.note, p.date]);
  res.json({ id, parsed: { ...p, category: p.category.name, icon: p.category.icon }, alerts: budgetAlertsFor(req.user.id, p.category.id, p.date.slice(0, 7)) });
});

/* ---------------- Budgets + notification system ---------------- */
function budgetStatus(uid, month) {
  return all(
    `SELECT b.id, b.category_id, b.amount, b.month, c.name, c.icon, c.color,
      COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.user_id=b.user_id AND t.category_id=b.category_id AND t.type='expense' AND substr(t.date,1,7)=b.month),0) spent
     FROM budgets b JOIN categories c ON c.id=b.category_id WHERE b.user_id=? AND b.month=? ORDER BY c.name`, [uid, month]
  ).map((b) => ({ ...b, pct: Math.round((b.spent / b.amount) * 100), status: b.spent >= b.amount ? 'over' : b.spent >= b.amount * 0.8 ? 'warning' : 'ok' }));
}
function budgetAlertsFor(uid, categoryId, month) {
  return budgetStatus(uid, month).filter((b) => b.category_id === categoryId && b.status !== 'ok').map(alertText);
}
const alertText = (b) => ({
  level: b.status,
  text: b.status === 'over'
    ? `${b.icon} ${b.name} budget exceeded! Spent ₹${Math.round(b.spent)} of ₹${Math.round(b.amount)}`
    : `${b.icon} ${b.name} is at ${b.pct}% of its budget (₹${Math.round(b.spent)} / ₹${Math.round(b.amount)})`,
});

router.get('/budgets', (req, res) => res.json(budgetStatus(req.user.id, req.query.month || thisMonth())));

router.post('/budgets', validate({ category_id: { required: true }, month: { required: true, type: 'month' }, amount: { required: true, type: 'number' } }), (req, res) => {
  const { category_id, month, amount } = req.body;
  const c = own('categories', category_id, req.user.id);
  if (!c || c.type !== 'expense') throw bad('Choose an expense category');
  const ex = get('SELECT id FROM budgets WHERE user_id=? AND category_id=? AND month=?', [req.user.id, c.id, month]);
  if (ex) run('UPDATE budgets SET amount=? WHERE id=?', [Number(amount), ex.id]);
  else run('INSERT INTO budgets(user_id,category_id,month,amount) VALUES(?,?,?,?)', [req.user.id, c.id, month, Number(amount)]);
  res.json({ ok: true });
});

router.delete('/budgets/:id', (req, res) => {
  if (!own('budgets', req.params.id, req.user.id)) throw bad('Budget not found', 404);
  run('DELETE FROM budgets WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

router.get('/notifications', (req, res) => res.json(budgetStatus(req.user.id, thisMonth()).filter((b) => b.status !== 'ok').map(alertText)));

/* ---------------- Savings goals ---------------- */
router.get('/goals', (req, res) => res.json(all('SELECT * FROM goals WHERE user_id=? ORDER BY id DESC', [req.user.id])));
router.post('/goals', validate({ name: { required: true, min: 2 }, target: { required: true, type: 'number' } }), (req, res) => {
  const { name, icon = '🎯', target, saved = 0, deadline = null } = req.body;
  const id = run('INSERT INTO goals(user_id,name,icon,target,saved,deadline) VALUES(?,?,?,?,?,?)', [req.user.id, name, icon, Number(target), Number(saved) || 0, deadline || null]);
  res.json(own('goals', id, req.user.id));
});
router.post('/goals/:id/contribute', validate({ amount: { required: true, type: 'number' } }), (req, res) => {
  const g = own('goals', req.params.id, req.user.id);
  if (!g) throw bad('Goal not found', 404);
  run('UPDATE goals SET saved=? WHERE id=?', [g.saved + Number(req.body.amount), g.id]);
  res.json(own('goals', g.id, req.user.id));
});
router.put('/goals/:id', validate({ name: { required: true, min: 2 }, target: { required: true, type: 'number' } }), (req, res) => {
  const g = own('goals', req.params.id, req.user.id);
  if (!g) throw bad('Goal not found', 404);
  const { name, icon = g.icon, target, saved = g.saved } = req.body;
  run('UPDATE goals SET name=?,icon=?,target=?,saved=? WHERE id=?', [name, icon, Number(target), Math.max(0, Number(saved) || 0), g.id]);
  res.json(own('goals', g.id, req.user.id));
});
router.delete('/goals/:id', (req, res) => {
  if (!own('goals', req.params.id, req.user.id)) throw bad('Goal not found', 404);
  run('DELETE FROM goals WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

/* ---------------- Analytics (aggregation) ---------------- */
function monthsBack(month, n) {
  const [y, m] = month.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - (n - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
}
const sumBy = (rows, m, type) => rows.filter((r) => r.m === m && r.type === type).reduce((s, r) => s + r.s, 0);

router.get('/analytics/summary', (req, res) => {
  const uid = req.user.id;
  const month = req.query.month || thisMonth();
  const isCurrent = month === thisMonth();
  const [y, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const daysElapsed = isCurrent ? new Date().getDate() : daysInMonth;

  const byMonth = all(`SELECT substr(date,1,7) m, type, SUM(amount) s FROM transactions WHERE user_id=? GROUP BY m, type`, [uid]);
  const months = monthsBack(month, 6);
  const trend = months.map((m) => ({ month: m, income: sumBy(byMonth, m, 'income'), expense: sumBy(byMonth, m, 'expense') }));
  const income = sumBy(byMonth, month, 'income');
  const expense = sumBy(byMonth, month, 'expense');
  const prevExpense = sumBy(byMonth, months[4], 'expense');

  const byCategory = all(
    `SELECT c.name, c.icon, c.color, SUM(t.amount) value FROM transactions t JOIN categories c ON c.id=t.category_id
     WHERE t.user_id=? AND t.type='expense' AND substr(t.date,1,7)=? GROUP BY c.id ORDER BY value DESC`, [uid, month]);

  const dailyRows = all(`SELECT date, SUM(amount) s FROM transactions WHERE user_id=? AND type='expense' AND substr(date,1,7)=? GROUP BY date`, [uid, month]);
  let cum = 0;
  const daily = Array.from({ length: daysInMonth }, (_, i) => {
    const key = `${month}-${String(i + 1).padStart(2, '0')}`;
    const spent = dailyRows.find((r) => r.date === key)?.s || 0;
    cum += spent;
    return { day: i + 1, spent, cumulative: i + 1 <= daysElapsed ? Math.round(cum) : null };
  });

  // forecast = average daily burn x days in month
  const forecast = Math.round((expense / Math.max(daysElapsed, 1)) * daysInMonth);
  const budgets = budgetStatus(uid, month);
  const goals = all('SELECT * FROM goals WHERE user_id=?', [uid]);
  const activeDays = new Set(all(`SELECT DISTINCT date FROM transactions WHERE user_id=? AND substr(date,1,7)=?`, [uid, month]).map((r) => r.date)).size;

  // ---- Financial Health Score (0-100) ----
  const savingsRate = income > 0 ? (income - expense) / income : expense > 0 ? -1 : 0;
  const pSave = Math.round(Math.max(0, Math.min(savingsRate / 0.2, 1)) * 40);
  const pBudget = budgets.length ? Math.round((budgets.filter((b) => b.status !== 'over').length / budgets.length) * 30) : 15;
  const pHabit = Math.round(Math.min(activeDays / Math.max(daysElapsed * 0.5, 1), 1) * 15);
  const pGoal = goals.length ? Math.round((goals.reduce((s, g) => s + Math.min(g.saved / g.target, 1), 0) / goals.length) * 15) : 7;
  const score = Math.min(100, pSave + pBudget + pHabit + pGoal);
  const grade = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs attention';

  // ---- Smart insights ----
  const insights = [];
  if (byCategory[0] && expense > 0) insights.push({ icon: byCategory[0].icon, tone: 'info', text: `You spent most on ${byCategory[0].name} - ₹${Math.round(byCategory[0].value)} (${Math.round((byCategory[0].value / expense) * 100)}% of your spending).` });
  if (prevExpense > 0 && expense > 0) {
    const diff = Math.round(((expense - prevExpense) / prevExpense) * 100);
    insights.push({ icon: diff > 0 ? '📈' : '📉', tone: diff > 10 ? 'bad' : 'good', text: `Spending is ${Math.abs(diff)}% ${diff > 0 ? 'higher' : 'lower'} than last month.` });
  }
  if (income > 0) insights.push({ icon: '💰', tone: savingsRate >= 0.2 ? 'good' : savingsRate >= 0 ? 'info' : 'bad', text: savingsRate >= 0 ? `You are saving ${Math.round(savingsRate * 100)}% of your income${savingsRate >= 0.2 ? ' - great job!' : ' (aim for 20%).'}` : 'You are spending more than you earn this month.' });
  if (isCurrent && expense > 0 && income > 0 && forecast > income) insights.push({ icon: '⚠️', tone: 'bad', text: `At this pace you will spend about ₹${forecast} this month - more than your income.` });
  else if (isCurrent && expense > 0) insights.push({ icon: '🔮', tone: 'info', text: `Projected month-end spending: ₹${forecast}.` });
  budgets.filter((b) => b.status !== 'ok').forEach((b) => insights.push({ icon: b.status === 'over' ? '🚨' : '🔔', tone: b.status === 'over' ? 'bad' : 'warn', text: alertText(b).text }));
  if (!insights.length) insights.push({ icon: '✨', tone: 'info', text: 'Add a few transactions to unlock personalised insights.' });

  const recent = all(`SELECT t.*, c.name category, c.icon, c.color FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.user_id=? ORDER BY t.date DESC, t.id DESC LIMIT 6`, [uid]);

  // ---- Dashboard overview: all-time totals + selected-month spending summary ----
  const allTime = get(`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) income, COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) expense FROM transactions WHERE user_id=?`, [uid]);
  const txCount = get(`SELECT COUNT(*) n FROM transactions WHERE user_id=? AND substr(date,1,7)=?`, [uid, month]).n;
  const largest = get(`SELECT t.amount, t.note, t.date, c.name category, c.icon FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.user_id=? AND t.type='expense' AND substr(t.date,1,7)=? ORDER BY t.amount DESC LIMIT 1`, [uid, month]) || null;
  const overview = {
    totals: { income: allTime.income, expense: allTime.expense, balance: allTime.income - allTime.expense },
    remaining: income - expense,
    summary: {
      txCount,
      avgDaily: Math.round(expense / Math.max(daysElapsed, 1)),
      prevExpense,
      changePct: prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : null,
      budgetTotal: budgets.reduce((s, b) => s + b.amount, 0),
      budgetSpent: budgets.reduce((s, b) => s + b.spent, 0),
      topCategory: byCategory[0] || null,
      largest,
    },
  };

  res.json({
    ...overview,
    month, income, expense, balance: income - expense, savingsRate: Math.round(savingsRate * 100),
    byCategory, trend, daily, forecast, budgets,
    health: { score, grade, parts: { savings: pSave, budgets: pBudget, habit: pHabit, goals: pGoal } },
    insights, recent,
  });
});

/* ---------------- Analytics page: charts + smart insights ---------------- */
router.get('/analytics/overview', (req, res) => {
  const uid = req.user.id;
  const month = req.query.month || thisMonth();
  const [y, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const label = new Date(y, mo - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const when = month === thisMonth() ? 'this month' : `in ${label}`;
  const R = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

  // Monthly income vs expenses (12 months)
  const byMonth = all(`SELECT substr(date,1,7) m, type, SUM(amount) s FROM transactions WHERE user_id=? GROUP BY m, type`, [uid]);
  const monthly = monthsBack(month, 12).map((m) => {
    const income = sumBy(byMonth, m, 'income'), expense = sumBy(byMonth, m, 'expense');
    return { month: m, income, expense, savings: income - expense };
  });
  const income = sumBy(byMonth, month, 'income');
  const expense = sumBy(byMonth, month, 'expense');
  const prevMonth = monthsBack(month, 2)[0];
  const prevExpense = sumBy(byMonth, prevMonth, 'expense');

  // Category-wise spending
  const catSql = `SELECT c.name, c.icon, c.color, SUM(t.amount) value, COUNT(*) count FROM transactions t JOIN categories c ON c.id=t.category_id
    WHERE t.user_id=? AND t.type='expense' AND substr(t.date,1,7)=? GROUP BY c.id ORDER BY value DESC`;
  const byCategory = all(catSql, [uid, month]).map((c) => ({ ...c, pct: expense ? Math.round((c.value / expense) * 100) : 0 }));
  const prevCats = all(catSql, [uid, prevMonth]);
  const highest = byCategory[0] || null;

  // Weekly spending (Week 1 = days 1-7, Week 2 = 8-14 ...)
  const dayRows = all(`SELECT date, SUM(amount) s FROM transactions WHERE user_id=? AND type='expense' AND substr(date,1,7)=? GROUP BY date`, [uid, month]);
  const weekly = Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, w) => {
    const from = w * 7 + 1, to = Math.min(w * 7 + 7, daysInMonth);
    const spent = dayRows.filter((r) => { const d = Number(r.date.slice(8, 10)); return d >= from && d <= to; }).reduce((s, r) => s + r.s, 0);
    return { week: `Week ${w + 1}`, range: `${from}-${to}`, spent };
  });

  // Day-of-week pattern
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dow = Array(7).fill(0);
  dayRows.forEach((r) => { dow[new Date(r.date + 'T00:00:00').getDay()] += r.s; });
  const topDow = dow.indexOf(Math.max(...dow));

  const largest = get(`SELECT t.amount, t.note, t.date, c.name category, c.icon FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.user_id=? AND t.type='expense' AND substr(t.date,1,7)=? ORDER BY t.amount DESC LIMIT 1`, [uid, month]);

  // ---- Smart insights ----
  const insights = [];
  if (highest && expense > 0) insights.push({ icon: highest.icon, tone: 'info', title: 'Top spending category', text: `You spent most on ${highest.name} ${when} - ${R(highest.value)}, which is ${highest.pct}% of your total spending.` });
  if (byCategory.length > 1 && expense > 0) {
    const top3 = byCategory.slice(0, 3).reduce((s, c) => s + c.value, 0);
    insights.push({ icon: '🎯', tone: 'info', title: 'Where it adds up', text: `Your top ${Math.min(3, byCategory.length)} categories make up ${Math.round((top3 / expense) * 100)}% of everything you spent.` });
  }
  if (prevExpense > 0 && expense > 0) {
    const diff = Math.round(((expense - prevExpense) / prevExpense) * 100);
    insights.push({ icon: diff > 0 ? '📈' : '📉', tone: diff > 10 ? 'bad' : 'good', title: 'Compared to last month', text: `Your spending is ${Math.abs(diff)}% ${diff > 0 ? 'higher' : 'lower'} than last month (${R(prevExpense)} → ${R(expense)}).` });
  }
  const rises = byCategory.map((c) => ({ c, prev: (prevCats.find((p) => p.name === c.name) || {}).value || 0 })).filter((x) => x.prev > 0 && x.c.value > x.prev * 1.25 && x.c.value - x.prev >= 500).sort((a, b) => (b.c.value - b.prev) - (a.c.value - a.prev));
  if (rises[0]) insights.push({ icon: '⚠️', tone: 'warn', title: 'Biggest increase', text: `${rises[0].c.name} spending jumped ${Math.round(((rises[0].c.value - rises[0].prev) / rises[0].prev) * 100)}% (${R(rises[0].prev)} → ${R(rises[0].c.value)}).` });
  const maxWeek = weekly.reduce((a, b) => (b.spent > a.spent ? b : a), weekly[0]);
  if (maxWeek && maxWeek.spent > 0) insights.push({ icon: '🗓️', tone: 'info', title: 'Most expensive week', text: `${maxWeek.week} (days ${maxWeek.range}) was your costliest week - ${R(maxWeek.spent)} spent.` });
  if (dayRows.length >= 3 && dow[topDow] > 0) insights.push({ icon: '📆', tone: 'info', title: 'Spending day', text: `${names[topDow]}s are your biggest spending day - ${R(dow[topDow])} in total ${when}.` });
  if (largest) insights.push({ icon: largest.icon, tone: 'info', title: 'Largest single expense', text: `${largest.note || largest.category} on ${largest.date} was your biggest purchase at ${R(largest.amount)}.` });
  if (income > 0) {
    const rate = (income - expense) / income;
    insights.push({ icon: '💰', tone: rate >= 0.2 ? 'good' : rate >= 0 ? 'info' : 'bad', title: 'Savings rate', text: rate >= 0 ? `You saved ${Math.round(rate * 100)}% of your income ${when}${rate >= 0.2 ? ' - great job!' : ' - try to reach 20%.'}` : `You spent ${R(expense - income)} more than you earned ${when}.` });
  }
  budgetStatus(uid, month).filter((b) => b.status !== 'ok').forEach((b) => insights.push({ icon: b.status === 'over' ? '🚨' : '🔔', tone: b.status === 'over' ? 'bad' : 'warn', title: 'Budget alert', text: alertText(b).text }));
  if (!insights.length) insights.push({ icon: '✨', tone: 'info', title: 'Getting started', text: 'Add a few transactions to unlock personalised insights.' });

  res.json({ month, label, income, expense, monthly, byCategory, highest, weekly, insights, byWeekday: names.map((n, i) => ({ day: n.slice(0, 3), spent: dow[i] })) });
});

/* ---------------- Reports ---------------- */
router.get('/reports/monthly', (req, res) => {
  const uid = req.user.id;
  const month = req.query.month || thisMonth();
  const tot = get(`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) income, COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) expense, COUNT(*) count FROM transactions WHERE user_id=? AND substr(date,1,7)=?`, [uid, month]);
  const byCategory = all(`SELECT c.name, c.icon, t.type, SUM(t.amount) total, COUNT(*) count FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.user_id=? AND substr(t.date,1,7)=? GROUP BY c.id ORDER BY t.type, total DESC`, [uid, month]);
  const top = all(`SELECT t.date, t.amount, t.note, c.name category FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.user_id=? AND t.type='expense' AND substr(t.date,1,7)=? ORDER BY t.amount DESC LIMIT 5`, [uid, month]);
  res.json({ month, ...tot, savings: tot.income - tot.expense, byCategory, top, budgets: budgetStatus(uid, month) });
});

router.get('/reports/export', (req, res) => {
  const month = req.query.month || thisMonth();
  const rows = all(`SELECT t.date, t.type, c.name category, t.amount, t.note FROM transactions t JOIN categories c ON c.id=t.category_id WHERE t.user_id=? AND substr(t.date,1,7)=? ORDER BY t.date`, [req.user.id, month]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = ['Date,Type,Category,Amount,Note', ...rows.map((r) => [r.date, r.type, r.category, r.amount, r.note].map(esc).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="spendwise-${month}.csv"`);
  res.send(csv);
});

module.exports = router;
