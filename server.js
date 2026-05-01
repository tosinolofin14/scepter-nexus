require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const validator = require('validator');

const app = express();
const PORT = process.env.PORT || 3001;
const API_BASE = process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : `http://localhost:${PORT}`;

// HTTPS Redirect
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// Middleware setup
app.use(helmet({ contentSecurityPolicy: false })); // allow inline scripts
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname));

// DB Setup
const dbPath = path.join(__dirname, 'scepter_nexus.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error opening database:', err.message);
    else {
        db.run(`CREATE TABLE IF NOT EXISTS consultation_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT, work_email TEXT, company_name TEXT, annual_revenue_est TEXT, goals TEXT, submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, first_name TEXT, last_name TEXT, email TEXT UNIQUE NOT NULL, password_hash TEXT, google_id TEXT UNIQUE, avatar_url TEXT, remember_token TEXT, is_active INTEGER DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, last_login DATETIME, reset_token TEXT, reset_token_expires DATETIME)`);
        db.run("ALTER TABLE users ADD COLUMN reset_token TEXT", (err) => { });
        db.run("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME", (err) => { });

        // Functional Widget Tables
        db.run(`CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, content_base64 TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, sender TEXT, content TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    }
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER || '', pass: process.env.EMAIL_PASS || '' }
});

function sendEmail(mailOptions) {
    if (!process.env.EMAIL_USER) return;
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.error('Error sending email:', error);
    });
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy_id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
}, function (accessToken, refreshToken, profile, cb) {
    const email = profile.emails && profile.emails[0].value;
    const googleId = profile.id;
    const firstName = profile.name ? profile.name.givenName : '';
    const lastName = profile.name ? profile.name.familyName : '';
    const avatarUrl = profile.photos && profile.photos[0].value;

    if (!email) return cb(new Error('Google profile must include email'), null);

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) return cb(err);
        let now = new Date().toISOString();
        if (row) {
            if (!row.google_id) {
                db.run('UPDATE users SET google_id = ?, avatar_url = ?, last_login = ? WHERE id = ?',
                    [googleId, avatarUrl || row.avatar_url, now, row.id], (err2) => {
                        if (err2) return cb(err2);
                        row.google_id = googleId; row.last_login = now; return cb(null, row);
                    });
            } else {
                db.run('UPDATE users SET last_login = ? WHERE id = ?', [now, row.id]);
                row.last_login = now; return cb(null, row);
            }
        } else {
            db.run('INSERT INTO users (first_name, last_name, email, google_id, avatar_url, last_login) VALUES (?, ?, ?, ?, ?, ?)',
                [firstName, lastName, email, googleId, avatarUrl, now], function (err) {
                    if (err) return cb(err);
                    db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
                        sendEmail({ from: process.env.EMAIL_USER, to: email, subject: 'Welcome to Scepter Nexus', text: `Hi ${firstName}, welcome to Scepter Nexus!` });
                        return cb(null, newUser);
                    });
                });
        }
    });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
        if (err) return res.status(401).json({ error: 'Invalid or expired token' });
        req.user = user; next();
    });
};

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many requests, please try again after 15 minutes.' } });

app.post('/api/consultation', (req, res) => {
    let { first_name, last_name, work_email, company_name, annual_revenue_est, goals } = req.body;
    first_name = validator.escape(first_name || '');
    last_name = validator.escape(last_name || '');
    work_email = validator.normalizeEmail(work_email || '');
    company_name = validator.escape(company_name || '');
    goals = validator.escape(goals || '');

    if (!first_name || !last_name || !work_email || !company_name || !annual_revenue_est) return res.status(400).json({ error: 'Required fields missing.' });
    if (!validator.isEmail(work_email)) return res.status(400).json({ error: 'Valid email required' });

    const sql = `INSERT INTO consultation_requests (first_name, last_name, work_email, company_name, annual_revenue_est, goals) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [first_name, last_name, work_email, company_name, annual_revenue_est, goals], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to submit' });
        sendEmail({ from: process.env.EMAIL_USER, to: 'tosin@scepternexus.com', subject: 'New Consultation Request', text: `New consultation from ${first_name} ${last_name} (${work_email})\nCompany: ${company_name}` });
        res.status(201).json({ message: 'Submitted.', id: this.lastID });
    });
});

app.post('/api/auth/signup', authLimiter, async (req, res) => {
    let { first_name, last_name, email, password, confirm_password } = req.body;
    email = validator.normalizeEmail(email || '');
    if (!first_name || !last_name || !email || !password || !confirm_password) return res.status(400).json({ error: 'All fields are required.' });
    if (!validator.isEmail(email)) return res.status(400).json({ error: 'Invalid email.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (password !== confirm_password) return res.status(400).json({ error: 'Passwords do not match.' });

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (row) return res.status(400).json({ error: 'Email already exists.' });

        const hash = await bcrypt.hash(password, await bcrypt.genSalt(12));
        db.run('INSERT INTO users (first_name, last_name, email, password_hash, last_login) VALUES (?, ?, ?, ?, ?)',
            [validator.escape(first_name), validator.escape(last_name), email, hash, new Date().toISOString()], function (err) {
                if (err) return res.status(500).json({ error: 'Failed to create user.' });
                const token = jwt.sign({ id: this.lastID, first_name, last_name, email }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
                sendEmail({ from: process.env.EMAIL_USER, to: email, subject: 'Welcome to Scepter Nexus', text: `Hi ${first_name}, welcome to Scepter Nexus!` });
                res.status(201).json({ message: 'Signup successful', token });
            });
    });
});

app.post('/api/auth/login', authLimiter, (req, res) => {
    let { email, password, remember_me } = req.body;
    email = validator.normalizeEmail(email || '');
    if (!email || !password) return res.status(400).json({ error: 'Both fields required.' });

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user || !user.password_hash) return res.status(401).json({ error: 'Invalid email or password' });
        if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Invalid email or password' });

        const token = jwt.sign({ id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: remember_me ? '30d' : '24h' });
        db.run('UPDATE users SET last_login = ? WHERE id = ?', [new Date().toISOString(), user.id]);
        res.json({ token, user: { id: user.id, first_name: user.first_name } });
    });
});

app.post('/api/auth/forgot-password', authLimiter, (req, res) => {
    let email = validator.normalizeEmail(req.body.email || '');
    if (!validator.isEmail(email)) return res.status(400).json({ error: 'Valid email required' });

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.json({ message: 'If that account exists, a reset link was sent.' });

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        let expireDate = new Date(); expireDate.setHours(expireDate.getHours() + 1);

        db.run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [tokenHash, expireDate.toISOString(), user.id], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            const resetUrl = `${API_BASE}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
            console.log(`\n\n--- PASSWORD RESET LINK ---\n${resetUrl}\n--------------------------\n`);
            res.json({ message: 'If that account exists, a reset link was sent.' });
        });
    });
});

app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => { req.session.destroy(); res.status(200).json({ message: 'Logged out' }); });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    db.get('SELECT id, first_name, last_name, email FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err || !row) return res.status(401).json({ error: 'Not found' });
        res.json(row);
    });
});

/* ================= WIDGET API ROUTES ================= */

app.get('/api/dashboard/kpi', authenticateToken, (req, res) => {
    const kpiData = {
        labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
        revenue: [12500, 15000, 14200, 18500, 22000, 26000],
        expenses: [8000, 9500, 9200, 11000, 12500, 13000]
    };
    res.json(kpiData);
});

app.get('/api/documents', authenticateToken, (req, res) => {
    db.all('SELECT id, name, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json(rows || []);
    });
});

app.post('/api/documents', authenticateToken, (req, res) => {
    // using base64 via json body instead of multer for zero-dependency native functional prototyping
    const { name, base64 } = req.body;
    if (!name || !base64) return res.status(400).json({ error: 'Missing file data' });
    db.run('INSERT INTO documents (user_id, name, content_base64) VALUES (?, ?, ?)', [req.user.id, name, base64], function (err) {
        if (err) return res.status(500).json({ error: 'File save failed' });
        res.json({ id: this.lastID, name, created_at: new Date().toISOString() });
    });
});

app.get('/api/messages', authenticateToken, (req, res) => {
    db.all('SELECT id, sender, content, created_at FROM messages WHERE user_id = ? ORDER BY created_at ASC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB Error' });

        let msgs = rows || [];
        if (msgs.length === 0) {
            const welcomeMsg = "Hi there! I'm your dedicated Scepter Nexus advisor. How can I help you today?";
            db.run('INSERT INTO messages (user_id, sender, content) VALUES (?, ?, ?)', [req.user.id, 'admin', welcomeMsg]);
            msgs.push({ id: 9999, sender: 'admin', content: welcomeMsg, created_at: new Date().toISOString() });
        }
        res.json(msgs);
    });
});

app.post('/api/messages', authenticateToken, (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Message cannot be empty' });

    db.run('INSERT INTO messages (user_id, sender, content) VALUES (?, ?, ?)', [req.user.id, 'user', content], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to send' });
        res.json({ id: this.lastID, sender: 'user', content, created_at: new Date().toISOString() });
    });
});

app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback', passport.authenticate('google', { failureRedirect: '/portal.html?error=google_auth_failed' }), (req, res) => {
    const token = jwt.sign({ id: req.user.id, first_name: req.user.first_name, last_name: req.user.last_name, email: req.user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3001'}/portal.html?token=${token}`);
});

app.use((req, res, next) => { res.status(404).sendFile(path.join(__dirname, '404.html')); });
app.listen(PORT, () => { console.log(`Server is running with JWT and OAuth on port ${PORT}`); });
