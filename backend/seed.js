const { get, run } = require('./db');

const DEFAULT_CATS = [
  ['Food & Dining', '🍔', '#f97316', 'expense'], ['Groceries', '🛒', '#22c55e', 'expense'],
  ['Transport', '🚗', '#3b82f6', 'expense'], ['Shopping', '🛍️', '#ec4899', 'expense'],
  ['Bills & Utilities', '💡', '#eab308', 'expense'], ['Entertainment', '🎬', '#a855f7', 'expense'],
  ['Health', '💊', '#ef4444', 'expense'], ['Education', '📚', '#06b6d4', 'expense'],
  ['Travel', '✈️', '#14b8a6', 'expense'], ['Other', '📦', '#94a3b8', 'expense'],
  ['Salary', '💼', '#10b981', 'income'], ['Freelance', '💻', '#6366f1', 'income'],
  ['Investments', '📈', '#84cc16', 'income'], ['Gifts', '🎁', '#f43f5e', 'income'],
];
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function createDefaults(uid) {
  DEFAULT_CATS.forEach(([n, i, c, t]) => run('INSERT INTO categories(user_id,name,icon,color,type) VALUES(?,?,?,?,?)', [uid, n, i, c, t]));
}

function seedDemo(uid) {
  const cat = (n) => get('SELECT id FROM categories WHERE user_id=? AND name=?', [uid, n]).id;
  const rnd = (a, b) => Math.round((a + Math.random() * (b - a)) / 10) * 10;
  const add = (type, c, amount, note, date) =>
    run('INSERT INTO transactions(user_id,category_id,type,amount,note,date) VALUES(?,?,?,?,?,?)', [uid, cat(c), type, amount, note, date]);
  const now = new Date();
  for (let m = 3; m >= 0; m--) {
    const base = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const last = m === 0 ? now.getDate() : new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const day = (d) => ymd(new Date(base.getFullYear(), base.getMonth(), Math.min(d, last)));
    add('income', 'Salary', 52000, 'Monthly salary', day(1));
    if (m % 2 === 0) add('income', 'Freelance', rnd(6000, 14000), 'Freelance project', day(12));
    add('expense', 'Bills & Utilities', 9500, 'Rent share + wifi', day(3));
    for (let d = 2; d <= last; d += 3) {
      add('expense', 'Food & Dining', rnd(120, 650), ['Lunch', 'Coffee', 'Biryani', 'Dinner'][d % 4], day(d));
      if (d % 2 === 0) add('expense', 'Transport', rnd(60, 380), ['Uber', 'Fuel', 'Bus pass'][d % 3], day(d));
      if (d % 5 === 0) add('expense', 'Groceries', rnd(400, 1800), 'Weekly groceries', day(d));
    }
    add('expense', 'Shopping', rnd(1200, 4500), 'Clothes', day(15));
    add('expense', 'Entertainment', rnd(300, 1200), 'Movie + OTT', day(18));
    if (m === 1) add('expense', 'Travel', 6500, 'Weekend trip', day(20));
  }
  const month = ymd(now).slice(0, 7);
  [['Food & Dining', 6000], ['Transport', 3000], ['Shopping', 3000], ['Entertainment', 1500], ['Groceries', 5000]]
    .forEach(([n, a]) => run('INSERT INTO budgets(user_id,category_id,month,amount) VALUES(?,?,?,?)', [uid, cat(n), month, a]));
  [['New Laptop', '💻', 80000, 24000], ['Goa Trip', '🏖️', 30000, 9000], ['Emergency Fund', '🛟', 150000, 40000]]
    .forEach(([n, i, t, s]) => run('INSERT INTO goals(user_id,name,icon,target,saved,deadline) VALUES(?,?,?,?,?,?)', [uid, n, i, t, s, null]));
}
module.exports = { createDefaults, seedDemo, ymd };
