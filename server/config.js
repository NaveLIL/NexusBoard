const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// load .env manually so we don't need dotenv dependency
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq < 1) continue;
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    }
}
loadEnv();

function env(key, fallback) {
    return process.env[key] || fallback;
}

// auto-generate secrets on first run if missing
function ensureSecret(key, bytes) {
    if (!process.env[key]) {
        const generated = crypto.randomBytes(bytes).toString('hex');
        process.env[key] = generated;
        // append to .env so it persists
        const envPath = path.join(__dirname, '..', '.env');
        fs.appendFileSync(envPath, `${key}=${generated}\n`);
        console.log(`[config] generated ${key}`);
    }
}

// make sure we have required secrets
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, '# NexusBoard config\n');
}
ensureSecret('MASTER_KEY', 32);
ensureSecret('JWT_SECRET', 48);

// process trust proxy value
let trustProxyVal = env('TRUST_PROXY', '1');
if (/^\d+$/.test(trustProxyVal)) {
    trustProxyVal = Number(trustProxyVal);
}

module.exports = {
    port: parseInt(env('PORT', '3000'), 10),
    trustProxy: trustProxyVal,
    masterKey: env('MASTER_KEY'),
    jwtSecret: env('JWT_SECRET'),
    jwtAccessTTL: '15m',
    jwtRefreshDays: 7,

    ntfy: {
        url: env('NTFY_URL', ''),
        topic: env('NTFY_TOPIC', 'nexusboard'),
    },
    tg: {
        token: env('TG_BOT_TOKEN', ''),
        chatId: env('TG_CHAT_ID', ''),
    },
};
