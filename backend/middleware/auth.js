const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'spendwise-dev-secret-change-me';
const sign = (u) => jwt.sign({ id: u.id, email: u.email }, SECRET, { expiresIn: '7d' });

function protect(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Please log in' });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: 'Session expired, log in again' }); }
}

// Express.js data-validation middleware
const validate = (rules) => (req, res, next) => {
  for (const [k, r] of Object.entries(rules)) {
    const v = req.body[k];
    const empty = v === undefined || v === null || v === '';
    if (empty) { if (r.required) return res.status(400).json({ error: `${k} is required` }); continue; }
    if (r.type === 'number' && !(Number(v) > 0)) return res.status(400).json({ error: `${k} must be a positive number` });
    if (r.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return res.status(400).json({ error: `${k} must be YYYY-MM-DD` });
    if (r.type === 'month' && !/^\d{4}-\d{2}$/.test(v)) return res.status(400).json({ error: `${k} must be YYYY-MM` });
    if (r.type === 'email' && !/^\S+@\S+\.\S+$/.test(v)) return res.status(400).json({ error: 'Enter a valid email' });
    if (r.in && !r.in.includes(v)) return res.status(400).json({ error: `${k} must be one of ${r.in.join(', ')}` });
    if (r.min && String(v).length < r.min) return res.status(400).json({ error: `${k} must be at least ${r.min} characters` });
  }
  next();
};
module.exports = { sign, protect, validate };
