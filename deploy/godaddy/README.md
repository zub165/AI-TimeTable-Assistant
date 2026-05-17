# GoDaddy VPS — backend & database only

The **React frontend** is deployed from GitHub (Pages).  
The **Django API + database** run here when you move to production.

## Phases

| Phase | Frontend | Backend | Database |
|-------|----------|---------|----------|
| **Now (dev)** | `web/` on desktop `:5180` | `backend/` on desktop `:8100` | SQLite `backend/db.sqlite3` |
| **Production** | GitHub Pages | This VPS `:8100` | PostgreSQL (Docker) |

## VPS setup

1. Copy `backend/.env` to the server; set:
   - `USE_POSTGRES=True`
   - `DJANGO_DEBUG=False`
   - `DJANGO_ALLOWED_HOSTS=api.yourdomain.com`
   - `CORS_ALLOWED_ORIGINS=https://zub165.github.io` (your GitHub Pages origin)
2. Run `deploy/godaddy/deploy.sh`
3. Optional: `docker compose -f deploy/godaddy/docker-compose.vps.yml up -d`
4. Install `deploy/godaddy/nginx.conf` and enable TLS (Certbot).

## Connect GitHub Pages to this API

In GitHub → **Settings → Secrets → Actions**, add:

| Secret | Example |
|--------|---------|
| `VITE_API_URL` | `https://api.yourdomain.com/api` |

Push to `main`; the Pages workflow rebuilds React with that API URL.

## Ports (avoid conflicts)

| Service | Port |
|---------|------|
| Django (internal) | 8100 |
| Postgres | 5432 (localhost only) |
| React dev (desktop) | 5180 — not on VPS |
