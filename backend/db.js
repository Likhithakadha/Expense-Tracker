// SQLite (via sql.js - pure JS, no native build needed) persisted to data.sqlite
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const FILE = path.join(__dirname, 'data.sqlite');
let db, timer;

const schema = `
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, icon TEXT, color TEXT, type TEXT);
CREATE TABLE IF NOT EXISTS transactions(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, category_id INTEGER, type TEXT, amount REAL, note TEXT, date TEXT);
CREATE TABLE IF NOT EXISTS budgets(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, category_id INTEGER, month TEXT, amount REAL);
CREATE TABLE IF NOT EXISTS goals(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, icon TEXT, target REAL, saved REAL DEFAULT 0, deadline TEXT);
CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date);
`;

async function init() {
  const SQL = await initSqlJs();
  db = fs.existsSync(FILE) ? new SQL.Database(fs.readFileSync(FILE)) : new SQL.Database();
  db.run(schema);
  save();
}
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => fs.writeFileSync(FILE, Buffer.from(db.export())), 150);
}
function all(sql, params = []) {
  const st = db.prepare(sql);
  st.bind(params);
  const rows = [];
  while (st.step()) rows.push(st.getAsObject());
  st.free();
  return rows;
}
const get = (sql, params = []) => all(sql, params)[0];
function run(sql, params = []) {
  db.run(sql, params);
  const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  save();
  return id;
}
module.exports = { init, all, get, run };
