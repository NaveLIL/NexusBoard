const express = require('express');
const { getDb } = require('../db/init');
const { requireAuth } = require('../middleware/auth');
const { requireRole, ROLE_LEVEL } = require('../middleware/rbac');
const { encrypt, decrypt } = require('../services/crypto');

const router = express.Router();

// GET /api/services — filtered by user's role
router.get('/', requireAuth, (req, res) => {
    const db = getDb();
    const userRole = req.user.role;
    const userLevel = ROLE_LEVEL[userRole] ?? 0;

    const services = db.prepare(`
        SELECT s.*, c.name as category_name, c.icon as category_icon, c.sort_order as category_order,
               h.status as health_status, h.latency_ms, h.checked_at
        FROM services s
        LEFT JOIN categories c ON s.category_id = c.id
        LEFT JOIN health_status h ON h.service_id = s.id
        WHERE s.visible = 1
        ORDER BY c.sort_order, s.sort_order
    `).all();

    // filter by role and decrypt urls
    const filtered = services
        .filter(s => userLevel >= (ROLE_LEVEL[s.min_role] ?? 0))
        .map(s => {
            const mapped = {
                id: s.id,
                name: s.name,
                description: s.description,
                url: decrypt(s.url),
                icon: s.icon,
                category: s.category_name || 'Прочее',
                categoryIcon: s.category_icon || 'grid',
                categoryOrder: s.category_order ?? 99,
                sortOrder: s.sort_order,
                health: s.health_status || 'unknown',
                latency: s.latency_ms,
                checkedAt: s.checked_at,
            };
            if (userLevel >= ROLE_LEVEL.admin) {
                mapped.healthUrl = s.health_url ? decrypt(s.health_url) : '';
            }
            return mapped;
        });

    // check for per-user order overrides
    const overrides = db.prepare(
        'SELECT service_id, sort_order FROM user_service_order WHERE user_id = ?'
    ).all(req.user.id);

    if (overrides.length) {
        const orderMap = Object.fromEntries(overrides.map(o => [o.service_id, o.sort_order]));
        for (const s of filtered) {
            if (orderMap[s.id] !== undefined) s.sortOrder = orderMap[s.id];
        }
        filtered.sort((a, b) => a.categoryOrder - b.categoryOrder || a.sortOrder - b.sortOrder);
    }

    res.json(filtered);
});

// Helper to validate URL
function isValidUrl(str) {
    if (!str) return true; // allow empty for health_url clear
    try {
        const u = new URL(str);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

// POST /api/services — create (admin+)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
    const { name, description, url, icon, category_id, min_role, sort_order, health_url, api_key } = req.body;
    if (!name || !url) return res.status(400).json({ error: 'name and url required' });
    if (!isValidUrl(url) || !isValidUrl(health_url)) {
        return res.status(400).json({ error: 'invalid url scheme' });
    }

    const db = getDb();
    const result = db.prepare(`
        INSERT INTO services (name, description, url, icon, category_id, min_role, sort_order, health_url, api_key)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        name,
        description || '',
        encrypt(url),
        icon || '',
        category_id || null,
        min_role || 'member',
        sort_order || 0,
        health_url ? encrypt(health_url) : '',
        api_key ? encrypt(api_key) : ''
    );

    res.json({ id: result.lastInsertRowid });
});

// PUT /api/services/:id — update (admin+)
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });

    const { name, description, url, icon, category_id, min_role, sort_order, health_url, api_key, visible } = req.body;
    if ((url !== undefined && !isValidUrl(url)) || (health_url !== undefined && !isValidUrl(health_url))) {
        return res.status(400).json({ error: 'invalid url scheme' });
    }

    db.prepare(`
        UPDATE services SET name=?, description=?, url=?, icon=?, category_id=?,
        min_role=?, sort_order=?, health_url=?, api_key=?, visible=? WHERE id=?
    `).run(
        name ?? existing.name,
        description ?? existing.description,
        url ? encrypt(url) : existing.url,
        icon ?? existing.icon,
        category_id !== undefined ? category_id : existing.category_id,
        min_role ?? existing.min_role,
        sort_order ?? existing.sort_order,
        health_url !== undefined ? (health_url ? encrypt(health_url) : '') : existing.health_url,
        api_key ? encrypt(api_key) : existing.api_key,
        visible !== undefined ? (visible ? 1 : 0) : existing.visible,
        req.params.id
    );
    res.json({ ok: true });
});

// DELETE /api/services/:id — (superadmin only)
router.delete('/:id', requireAuth, requireRole('superadmin'), (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
});

// PATCH /api/services/:id/order — per-user reorder
router.patch('/:id/order', requireAuth, (req, res) => {
    const { sort_order } = req.body;
    if (sort_order === undefined) return res.status(400).json({ error: 'sort_order required' });

    const db = getDb();
    db.prepare(`
        INSERT INTO user_service_order (user_id, service_id, sort_order) VALUES (?, ?, ?)
        ON CONFLICT(user_id, service_id) DO UPDATE SET sort_order = excluded.sort_order
    `).run(req.user.id, req.params.id, sort_order);
    res.json({ ok: true });
});

module.exports = router;
