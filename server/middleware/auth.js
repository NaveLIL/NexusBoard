const jwt = require('jsonwebtoken');
const config = require('../config');

function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'not authenticated' });
    }
    try {
        const payload = jwt.verify(header.slice(7), config.jwtSecret);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'token expired or invalid' });
    }
}

module.exports = { requireAuth };
