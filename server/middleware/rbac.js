const ROLE_LEVEL = { guest: 0, family: 1, member: 2, admin: 3, superadmin: 4 };

function requireRole(minRole) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'not authenticated' });
        const userLevel = ROLE_LEVEL[req.user.role] ?? -1;
        const required = ROLE_LEVEL[minRole] ?? 99;
        if (userLevel < required) {
            return res.status(403).json({ error: 'insufficient permissions' });
        }
        next();
    };
}

module.exports = { requireRole, ROLE_LEVEL };
