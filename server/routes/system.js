const express = require('express');
const os = require('os');
const { execSync, exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
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

async function getDiskUsage() {
    try {
        const { stdout } = await execAsync('df -h / | tail -1', { timeout: 3000 });
        const out = stdout.trim();
        const parts = out.split(/\s+/);
        // handles both GNU coreutils and BusyBox df
        // GNU: Filesystem Size Used Avail Use% Mounted
        // BusyBox: Filesystem Size Used Available Use% Mounted
        const sizeIdx = 1, usedIdx = 2, freeIdx = 3, pctIdx = 4;
        return {
            total: parts[sizeIdx] || '?',
            used: parts[usedIdx] || '?',
            free: parts[freeIdx] || '?',
            percent: parseInt(parts[pctIdx]) || 0,
        };
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

let sysCache = { data: null, timestamp: 0 };

// GET /api/system — server metrics (member+)
router.get('/', requireAuth, requireRole('member'), async (req, res) => {
    if (Date.now() - sysCache.timestamp < 5000 && sysCache.data) {
        return res.json(sysCache.data);
    }

    const mem = { total: os.totalmem(), free: os.freemem() };
    mem.used = mem.total - mem.free;
    mem.percent = Math.round((mem.used / mem.total) * 100);

    const disk = await getDiskUsage();

    sysCache.data = {
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
        disk,
        uptime: getUptime(),
        loadavg: os.loadavg().map(l => l.toFixed(2)),
    };
    sysCache.timestamp = Date.now();

    res.json(sysCache.data);
});

// GET /api/system/docker — docker containers (admin+)
router.get('/docker', requireAuth, requireRole('admin'), (req, res) => {
    res.json(getDockerContainers());
});

module.exports = router;
