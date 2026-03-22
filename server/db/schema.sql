-- users
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    display     TEXT    NOT NULL DEFAULT '',
    role        TEXT    NOT NULL DEFAULT 'member' CHECK(role IN ('superadmin','admin','member','family','guest')),
    lang        TEXT    NOT NULL DEFAULT 'ru',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    last_login  TEXT
);

-- categories for grouping services
CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    icon        TEXT    DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0
);

-- services (urls and api keys stored encrypted)
CREATE TABLE IF NOT EXISTS services (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    url         TEXT    NOT NULL,
    icon        TEXT    DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    min_role    TEXT    NOT NULL DEFAULT 'member' CHECK(min_role IN ('superadmin','admin','member','family','guest')),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    health_url  TEXT    DEFAULT '',
    api_key     TEXT    DEFAULT '',
    visible     INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- per-user service ordering
CREATE TABLE IF NOT EXISTS user_service_order (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id  INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, service_id)
);

-- audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT    NOT NULL,
    detail      TEXT    DEFAULT '',
    ip          TEXT    DEFAULT '',
    ua          TEXT    DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- app settings (key-value)
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
);

-- notifications history
CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT    NOT NULL DEFAULT 'info' CHECK(type IN ('info','warn','error','success')),
    title       TEXT    NOT NULL,
    body        TEXT    DEFAULT '',
    read        INTEGER NOT NULL DEFAULT 0,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- health check results
CREATE TABLE IF NOT EXISTS health_status (
    service_id  INTEGER PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
    status      TEXT    NOT NULL DEFAULT 'unknown' CHECK(status IN ('up','down','unknown')),
    latency_ms  INTEGER DEFAULT NULL,
    checked_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT    NOT NULL UNIQUE,
    expires_at  TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
