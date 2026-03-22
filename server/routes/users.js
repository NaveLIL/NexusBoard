const express = require('express');
const bcrypt = require('bcrypt');
const { getDb } = require('../db/init');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// GET /api/users — list all (superadmin)
router.get('/', requireAuth, requireRole('superadmin'), (req, res) => {
    const db = getDb();
    const users = db.prepare(
        'SELECT id, username, display, role, lang, active, created_at, last_login FROM users ORDER BY id'
    ).all();
    res.json(users);
});

// POST /api/users — create (superadmin)
router.post('/', requireAuth, requireRole('superadmin'), (req, res) => {
    const { username, password, display, role, lang } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'password min 8 chars' });

    const validRoles = ['admin', 'member', 'family', 'guest'];
    if (role && !validRoles.includes(role)) {
        return res.status(400).json({ error: 'invalid role' });
    }

    const db = getDb();
    const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (exists) return res.status(409).json({ error: 'username taken' });

    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare(
        'INSERT INTO users (username, password, display, role, lang) VALUES (?, ?, ?, ?, ?)'
    ).run(username, hash, display || username, role || 'member', lang || 'ru');

    res.json({ id: result.lastInsertRowid });
});

// PUT /api/users/:id — update (superadmin)
router.put('/:id', requireAuth, requireRole('superadmin'), (req, res) => {
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'not found' });

    // don't allow demoting yourself
    if (user.id === req.user.id && req.body.role && req.body.role !== 'superadmin') {
        return res.status(400).json({ error: 'cannot change own role' });
    }

    const { display, role, lang, active, password } = req.body;

    if (password) {
        if (password.length < 8) return res.status(400).json({ error: 'password min 8 chars' });
        const hash = bcrypt.hashSync(password, 12);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);
    }

    db.prepare(`
        UPDATE users SET display=?, role=?, lang=?, active=? WHERE id=?
    `).run(
        display ?? user.display,
        role ?? user.role,
        lang ?? user.lang,
        active !== undefined ? (active ? 1 : 0) : user.active,
        req.params.id
    );
    res.json({ ok: true });
});

// DELETE /api/users/:id — (superadmin, can't delete self)
router.delete('/:id', requireAuth, requireRole('superadmin'), (req, res) => {
    if (parseInt(req.params.id) === req.user.id) {
        return res.status(400).json({ error: 'cannot delete yourself' });
    }
    const db = getDb();
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

module.exports = router;
