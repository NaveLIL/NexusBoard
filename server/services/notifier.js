const https = require('https');
const http = require('http');
const config = require('../config');

function sendNtfy(title, body, priority = 3) {
    if (!config.ntfy.url) return;
    const url = `${config.ntfy.url}/${config.ntfy.topic}`;
    const data = JSON.stringify({ topic: config.ntfy.topic, title, message: body, priority });

    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    req.on('error', (e) => console.error('[ntfy] error:', e.message));
    req.write(data);
    req.end();
}

function sendTelegram(text) {
    if (!config.tg.token || !config.tg.chatId) return;
    const url = `https://api.telegram.org/bot${config.tg.token}/sendMessage`;
    const data = JSON.stringify({ chat_id: config.tg.chatId, text, parse_mode: 'HTML' });

    const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    req.on('error', (e) => console.error('[telegram] error:', e.message));
    req.write(data);
    req.end();
}

function notify(title, body, priority) {
    sendNtfy(title, body, priority);
    sendTelegram(`<b>${title}</b>\n${body}`);
}

module.exports = { notify, sendNtfy, sendTelegram };
