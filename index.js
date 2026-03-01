require('dotenv').config();
const express = require('express');
const { initDb } = require('./src/db');
const { identify } = require('./src/identify');

const app = express();
app.use(express.json());

app.post('/identify', async (req, res) => {
  const { email, phoneNumber } = req.body;
  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'At least one of email or phoneNumber is required' });
  }
  try {
    const contact = await identify(email, phoneNumber);
    return res.status(200).json({ contact });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


async function start(PORT = process.env.PORT || 3000) {
  initDb().then(() => {
    app.listen(PORT, () => {console.log(`Server running on port ${PORT}`);});
  }).catch(err => {
    console.error('Database connection failed, exiting:', err.message);
    process.exit(1);
  });
}

// Staring the server with DB connection check
start();
