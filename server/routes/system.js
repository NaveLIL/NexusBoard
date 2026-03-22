const express = require('express');
const os = require('os');
const { execSync } = require('child_process');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

function getCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    for (const cpu of cpus) {
        for (const type in cpu.times) totalTick += cpu.times[type];
        totalIdle += cpu.times.idle;
    }
    return Math.round((1 - totalIdle / totalTick) * 100);
}

function getDiskUsage() {
    try {
        const out = execSync('df -h / --output=size,used,avail,pcent | tail -1', { timeout: 3000 }).toString().trim();
        const parts = out.split(/\s+/);
        return { total: parts[0], used: parts[1], free: parts[2], percent: parseInt(parts[3]) };
    } catch {
        return { total: '?', used: '?', free: '?', percent: 0 };
    }
}

function getUptime() {
    const secs = os.uptime();
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return { seconds: secs, formatted: `${days}d ${hours}h ${mins}m` };
}

function getDockerContainers() {
    try {
        const out = execSync('docker ps --format "{{.Names}}|{{.Status}}|{{.Image}}"', { timeout: 5000 }).toString().trim();
        if (!out) return [];
        return out.split('\n').map(line => {
            const [name, status, image] = line.split('|');
            return { name, status, image };
        });
    } catch {
        return [];
    }
}

// GET /api/system — server metrics (member+)
router.get('/', requireAuth, requireRole('member'), (req, res) => {
    const mem = { total: os.totalmem(), free: os.freemem() };
    mem.used = mem.total - mem.free;
    mem.percent = Math.round((mem.used / mem.total) * 100);

    res.json({
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpu: {
            model: os.cpus()[0]?.model || 'unknown',
            cores: os.cpus().length,
            usage: getCpuUsage(),
        },
        memory: {
            total: (mem.total / 1073741824).toFixed(1) + ' GB',
            used: (mem.used / 1073741824).toFixed(1) + ' GB',
            free: (mem.free / 1073741824).toFixed(1) + ' GB',
            percent: mem.percent,
        },
        disk: getDiskUsage(),
        uptime: getUptime(),
        loadavg: os.loadavg().map(l => l.toFixed(2)),
    });
});

// GET /api/system/docker — docker containers (admin+)
router.get('/docker', requireAuth, requireRole('admin'), (req, res) => {
    res.json(getDockerContainers());
});

module.exports = router;
