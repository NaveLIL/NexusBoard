const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb } = require('../db/init');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const ROLE_HIERARCHY = ['guest', 'family', 'member', 'admin', 'superadmin'];

function signAccess(user) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtAccessTTL }
    );
}

function createRefresh(userId) {
    const db = getDb();
    const token = crypto.randomBytes(40).toString('hex');
    const expires = new Date(Date.now() + config.jwtRefreshDays * 86400000).toISOString();
    db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, expires);
    return { token, expires };
}

function logAction(userId, action, detail, req) {
    const db = getDb();
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const ua = req.headers['user-agent'] || '';
    db.prepare('INSERT INTO audit_log (user_id, action, detail, ip, ua) VALUES (?, ?, ?, ?, ?)').run(userId, action, detail, ip, ua);
}

// POST /api/auth/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'username and password required' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
    if (!user) {
        return res.status(401).json({ error: 'invalid credentials' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
        logAction(user.id, 'login_failed', '', req);
        return res.status(401).json({ error: 'invalid credentials' });
    }

    const accessToken = signAccess(user);
    const refresh = createRefresh(user.id);

    db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?').run(user.id);
    logAction(user.id, 'login', '', req);

    res.cookie('refresh_token', refresh.token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        maxAge: config.jwtRefreshDays * 86400000,
        path: '/api/auth',
    });

    res.json({
        token: accessToken,
        user: { id: user.id, username: user.username, display: user.display, role: user.role, lang: user.lang },
    });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'no refresh token' });

    const db = getDb();
    const row = db.prepare('SELECT * FROM refresh_tokens WHERE token = ?').get(token);
    if (!row || new Date(row.expires_at) < new Date()) {
        if (row) db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);
        return res.status(401).json({ error: 'expired or invalid refresh token' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(row.user_id);
    if (!user) return res.status(401).json({ error: 'user not found' });

    // rotate refresh token
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(row.id);
    const newRefresh = createRefresh(user.id);

    res.cookie('refresh_token', newRefresh.token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        maxAge: config.jwtRefreshDays * 86400000,
        path: '/api/auth',
    });

    res.json({
        token: signAccess(user),
        user: { id: user.id, username: user.username, display: user.display, role: user.role, lang: user.lang },
    });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
    const token = req.cookies?.refresh_token;
    if (token) {
        const db = getDb();
        db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
    }
    logAction(req.user.id, 'logout', '', req);
    res.clearCookie('refresh_token', { path: '/api/auth' });
    res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
    const db = getDb();
    const user = db.prepare('SELECT id, username, display, role, lang, created_at, last_login FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json(user);
});

// GET /api/auth/status — check if setup is needed
router.get('/status', (req, res) => {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
    res.json({ needsSetup: count.c === 0 });
});

// POST /api/auth/setup — create first superadmin (only works when no users exist)
router.post('/setup', (req, res) => {
    const db = getDb();
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
    if (count.c > 0) {
        return res.status(403).json({ error: 'setup already complete' });
    }

    const { username, password, display } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'username and password required' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'password must be at least 8 chars' });
    }

    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare(
        'INSERT INTO users (username, password, display, role) VALUES (?, ?, ?, ?)'
    ).run(username, hash, display || username, 'superadmin');

    logAction(result.lastInsertRowid, 'setup', 'superadmin created', req);

    res.json({ ok: true, message: 'superadmin created, you can now log in' });
});

module.exports = router;
