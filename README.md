# NexusBoard

Self-hosted server dashboard with role-based access, encrypted storage and a modern dark UI.

## Features

- **Auth** — JWT access/refresh tokens, bcrypt, rate limiting
- **Encryption** — service URLs and API keys stored with AES-256-GCM
- **Roles** — superadmin / admin / member / family / guest
- **Dashboard** — glassmorphism cards, live system widgets, search, drag & drop reorder
- **Admin panel** — CRUD services, manage users, audit log
- **Monitoring** — CPU, RAM, disk, uptime, Docker containers
- **Notifications** — bell dropdown, ntfy + Telegram integrations
- **i18n** — Russian, English (extensible)
- **PWA** — installable on mobile

## Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js 20, Express, better-sqlite3 |
| Auth | JWT + bcrypt + refresh token rotation |
| Crypto | AES-256-GCM (node:crypto) |
| Frontend | Vanilla HTML/CSS/JS SPA |
| Deploy | Docker + docker-compose |

## Quick start

```bash
git clone <repo-url>
cd NexusBoard
cp .env.example .env    # edit MASTER_KEY, JWT_SECRET
docker compose -f docker/docker-compose.yml up -d
```

Open `http://localhost:3000` — first visit shows the setup screen to create a superadmin account.

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 3000) |
| `MASTER_KEY` | 32-byte hex key for AES-256 encryption (auto-generated on first run) |
| `JWT_SECRET` | Secret for signing JWT tokens (auto-generated on first run) |
| `NTFY_URL` | ntfy server URL (optional) |
| `NTFY_TOPIC` | ntfy topic (optional) |
| `TG_BOT_TOKEN` | Telegram bot token (optional) |
| `TG_CHAT_ID` | Telegram chat ID (optional) |

## License

MIT
