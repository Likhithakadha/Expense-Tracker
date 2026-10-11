const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { get, run } = require('../db');
const { sign, protect, validate } = require('../middleware/auth');
const { createDefaults, seedDemo } = require('../seed');

const pub = (u) => ({ id: u.id, name: u.name, email: u.email });

router.post('/register', validate({ name: { required: true, min: 2 }, email: { required: true, type: 'email' }, password: { required: true, min: 6 } }), (req, res) => {
  const { name, email, password } = req.body;
  if (get('SELECT id FROM users WHERE email=?', [email.toLowerCase()])) return res.status(409).json({ error: 'Email already registered' });
  const id = run('INSERT INTO users(name,email,password) VALUES(?,?,?)', [name, email.toLowerCase(), bcrypt.hashSync(password, 10)]);
  createDefaults(id);
  const user = { id, name, email: email.toLowerCase() };
  res.json({ token: sign(user), user });
});

router.post('/login', validate({ email: { required: true }, password: { required: true } }), (req, res) => {
  const u = get('SELECT * FROM users WHERE email=?', [req.body.email.toLowerCase()]);
  if (!u || !bcrypt.compareSync(req.body.password, u.password)) return res.status(401).json({ error: 'Wrong email or password' });
  res.json({ token: sign(u), user: pub(u) });
});

// One-click demo account with realistic data
router.post('/demo', (req, res) => {
  let u = get('SELECT * FROM users WHERE email=?', ['demo@spendwise.app']);
  if (!u) {
    const id = run('INSERT INTO users(name,email,password) VALUES(?,?,?)', ['Demo User', 'demo@spendwise.app', bcrypt.hashSync('demo123', 10)]);
    createDefaults(id); seedDemo(id);
    u = get('SELECT * FROM users WHERE id=?', [id]);
  }
  res.json({ token: sign(u), user: pub(u) });
});

router.get('/me', protect, (req, res) => res.json(pub(get('SELECT * FROM users WHERE id=?', [req.user.id]))));
module.exports = router;
