const express = require('express');
const { getDb } = require('../db/init');
const { requireAuth } = require('../middleware/auth');
const { ROLE_LEVEL } = require('../middleware/rbac');

const router = express.Router();

// GET /api/health — status of all services the user can see
router.get('/', requireAuth, (req, res) => {
    const db = getDb();
    const userLevel = ROLE_LEVEL[req.user.role] ?? 0;
    const rows = db.prepare(`
        SELECT s.id, s.name, s.min_role, h.status, h.latency_ms, h.checked_at
        FROM services s
        LEFT JOIN health_status h ON h.service_id = s.id
        WHERE s.visible = 1
        ORDER BY s.sort_order
    `).all();

    const filtered = rows
        .filter(s => userLevel >= (ROLE_LEVEL[s.min_role] ?? 0))
        .map(s => ({
            id: s.id,
            name: s.name,
            status: s.status,
            latency_ms: s.latency_ms,
            checked_at: s.checked_at
        }));

    res.json(filtered);
});

module.exports = router;
