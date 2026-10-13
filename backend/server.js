const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { init } = require('./db');
const { protect } = require('./middleware/auth');

(async () => {
  await init();
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api', protect, require('./routes/api'));

  const dist = path.join(__dirname, '../frontend/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use((err, req, res, next) => { console.error(err); res.status(err.status || 500).json({ error: err.message || 'Server error' }); });
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`SpendWise running -> http://expense-tracker-m02o.onrender.com:${PORT}`));
})();
