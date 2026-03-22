const { getDb } = require('../db/init');
const { decrypt } = require('./crypto');
const http = require('http');
const https = require('https');

let interval = null;

function startHealthChecker(intervalSec = 30) {
    if (interval) clearInterval(interval);
    console.log(`[health] checker started, interval ${intervalSec}s`);
    checkAll();
    interval = setInterval(checkAll, intervalSec * 1000);
}

function stopHealthChecker() {
    if (interval) clearInterval(interval);
    interval = null;
}

async function checkAll() {
    const db = getDb();
    const services = db.prepare('SELECT id, health_url, url FROM services WHERE visible = 1').all();
    const upsert = db.prepare(`
        INSERT INTO health_status (service_id, status, latency_ms, checked_at)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(service_id) DO UPDATE SET status=excluded.status, latency_ms=excluded.latency_ms, checked_at=excluded.checked_at
    `);

    for (const svc of services) {
        const target = svc.health_url ? decrypt(svc.health_url) : decrypt(svc.url);
        if (!target) {
            upsert.run(svc.id, 'unknown', null);
            continue;
        }
        try {
            const { status, ms } = await ping(target);
            upsert.run(svc.id, status, ms);
        } catch {
            upsert.run(svc.id, 'down', null);
        }
    }
}

function ping(url, timeoutMs = 8000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const mod = url.startsWith('https') ? https : http;
        const req = mod.get(url, { timeout: timeoutMs, rejectUnauthorized: false }, (res) => {
            res.resume(); // drain
            const ms = Date.now() - start;
            resolve({ status: res.statusCode < 500 ? 'up' : 'down', ms });
        });
        req.on('error', () => resolve({ status: 'down', ms: null }));
        req.on('timeout', () => { req.destroy(); resolve({ status: 'down', ms: null }); });
    });
}

module.exports = { startHealthChecker, stopHealthChecker };
