const crypto = require('crypto');
const config = require('../config');

const ALG = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey() {
    // master key is stored as hex string, 64 chars = 32 bytes
    return Buffer.from(config.masterKey, 'hex');
}

function encrypt(plaintext) {
    if (!plaintext) return '';
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALG, getKey(), iv);
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // pack as iv:tag:ciphertext (all base64)
    return iv.toString('base64') + ':' + tag.toString('base64') + ':' + enc.toString('base64');
}

function decrypt(packed) {
    if (!packed) return '';
    const parts = packed.split(':');
    if (parts.length !== 3) throw new Error('bad encrypted format');
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const enc = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv(ALG, getKey(), iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc, null, 'utf8') + decipher.final('utf8');
}

module.exports = { encrypt, decrypt };
