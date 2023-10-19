const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const router = express.Router();
const pool = new Pool({
  user: 'sri',
  host: 'localhost',
  database: 'usermanagement',
  password: 'Taxsale!',
  port: 5432,
});

const saltRounds = 10;

// GET endpoint to fetch all users (only their names and emails, not passwords)
router.get('/users', async (req, res, next) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT id, name, email FROM users');
    const results = { 'results': (result) ? result.rows : null };
    res.send(results);
    client.release();
  } catch (err) {
    next(new Error('Database connection failed!'));
  }
});

// GET endpoint to fetch all user details
router.get('/allusers', async (req, res, next) => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT id, username, first_name, middle_name, last_name email, mfa_secret, mfa_enabled FROM users'); // Excluding password for security reasons
      const users = result.rows;
      
      res.send(users);
      
      client.release();
    } catch (err) {
        console.error(err); // This will log the detailed error in the server's console.
        next(new Error('Failed to fetch all user details: ' + err.message));
    }
  });
  

// Registration endpoint
router.post('/register', async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new Error('Name, Email, and Password are required'));
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const client = await pool.connect();
    const queryString = 'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email';
    const values = [name, email, hashedPassword];

    const { rows } = await client.query(queryString, values);
    res.status(201).send({ id: rows[0].id, name: rows[0].name, email: rows[0].email });

    client.release();
  } catch (err) {
    next(new Error('Registration failed'));
  }
});

// Login endpoint
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new Error('Email and Password are required'));
  }

  try {
    const client = await pool.connect();
    const { rows } = await client.query('SELECT * FROM users WHERE email = $1', [email]);

    if (rows.length === 0) {
      return next(new Error('User not found'));
    }

    const passwordMatches = await bcrypt.compare(password, rows[0].password);

    if (!passwordMatches) {
      return next(new Error('Invalid password'));
    }

    res.send({ id: rows[0].id, name: rows[0].name, email: rows[0].email });
    client.release();
  } catch (err) {
    next(new Error('Login failed'));
  }
});

// Generate MFA Secret and QR Code
router.post('/mfa/generate', async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return next(new Error('User ID is required'));

    const secret = speakeasy.generateSecret({ length: 20 });
    const client = await pool.connect();
    await client.query('UPDATE users SET mfa_secret = $1 WHERE id = $2', [secret.base32, userId]);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    res.send({ qrCodeUrl });
    
    client.release();
  } catch (err) {
    next(new Error('Failed to generate MFA secret and QR code'));
  }
});

// Verify MFA Token
router.post('/mfa/verify', async (req, res, next) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) return next(new Error('User ID and Token are required'));

    const client = await pool.connect();
    const { rows } = await client.query('SELECT mfa_secret FROM users WHERE id = $1', [userId]);

    if (rows.length === 0) return next(new Error('User not found'));

    const verified = speakeasy.totp.verify({
      secret: rows[0].mfa_secret,
      encoding: 'base32',
      token: token
    });

    if (verified) {
      await client.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId]);
      res.send({ mfaEnabled: true });
    } else {
      res.send({ mfaEnabled: false });
    }

    client.release();
  } catch (err) {
    next(new Error('Failed to verify MFA token'));
  }
});

module.exports = router;
