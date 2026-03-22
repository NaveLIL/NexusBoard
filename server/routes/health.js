const express = require('express');
const { getDb } = require('../db/init');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/health — status of all services the user can see
router.get('/', requireAuth, (req, res) => {
    const db = getDb();
    const rows = db.prepare(`
        SELECT s.id, s.name, h.status, h.latency_ms, h.checked_at
        FROM services s
        LEFT JOIN health_status h ON h.service_id = s.id
        WHERE s.visible = 1
        ORDER BY s.sort_order
    `).all();
    res.json(rows);
});

module.exports = router;
