const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const config = require('./config');
const { getDb, closeDb } = require('./db/init');
const { seed } = require('./db/seed');
const { startHealthChecker } = require('./services/healthChecker');
const { loginLimiter, apiLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const usersRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');
const systemRoutes = require('./routes/system');
const settingsRoutes = require('./routes/settings');

const app = express();

// security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
        },
    },
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// trust proxy for x-forwarded-for
app.set('trust proxy', 1);

// static files (client)
app.use(express.static(path.join(__dirname, '..', 'client')));

// rate limits
app.use('/api/auth/login', loginLimiter);
app.use('/api', apiLimiter);

// api routes
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/settings', settingsRoutes);

// SPA fallback — serve index.html for non-api routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// init db and start
getDb();
seed();

const server = app.listen(config.port, () => {
    console.log(`NexusBoard running on port ${config.port}`);
    startHealthChecker(30);
});

// graceful shutdown
process.on('SIGTERM', () => {
    console.log('shutting down...');
    server.close(() => {
        closeDb();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    closeDb();
    process.exit(0);
});
