const express = require('express');
const { getDb } = require('../db/init');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// GET /api/settings
router.get('/', requireAuth, requireRole('admin'), (req, res) => {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(settings);
});

// PUT /api/settings
router.put('/', requireAuth, requireRole('superadmin'), (req, res) => {
    const db = getDb();
    const update = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    const tx = db.transaction(() => {
        for (const [k, v] of Object.entries(req.body)) {
            update.run(k, String(v));
        }
    });
    tx();
    res.json({ ok: true });
});

// GET /api/audit — audit log (admin+)
router.get('/audit', requireAuth, requireRole('admin'), (req, res) => {
    const db = getDb();
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;
    const rows = db.prepare(`
        SELECT a.*, u.username FROM audit_log a
        LEFT JOIN users u ON u.id = a.user_id
        ORDER BY a.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    res.json(rows);
});

// GET /api/categories
router.get('/categories', requireAuth, (req, res) => {
    const db = getDb();
    res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order').all());
});

// POST /api/categories (admin+)
router.post('/categories', requireAuth, requireRole('admin'), (req, res) => {
    const { name, icon, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const db = getDb();
    const r = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)').run(name, icon || '', sort_order || 0);
    res.json({ id: r.lastInsertRowid });
});

// GET /api/notifications — user's notifications
router.get('/notifications', requireAuth, (req, res) => {
    const db = getDb();
    const rows = db.prepare(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.user.id);
    res.json(rows);
});

// PATCH /api/notifications/:id/read
router.patch('/notifications/:id/read', requireAuth, (req, res) => {
    const db = getDb();
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ ok: true });
});

module.exports = router;
