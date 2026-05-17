# Voice Time Manager — Project Context

## Deployment model

| Layer | Development (now) | Production (later) |
|-------|-------------------|---------------------|
| **Frontend** | React `web/` on desktop → `:5180` | **GitHub Pages** only (`web/dist`) |
| **Backend** | Django on **local desktop** → `:8100` | **GoDaddy VPS** (API + Postgres) |
| **Database** | SQLite `backend/db.sqlite3` | PostgreSQL on VPS |

Root `index.html` PWA is legacy/reference — **not** deployed to GitHub.

```
  GitHub Pages                    GoDaddy VPS (production)
 ┌─────────────────┐              ┌──────────────────────┐
 │  React (web/)   │   HTTPS      │  Django API :8100    │
 │  zub165.github  │ ──────────►  │  PostgreSQL          │
 │  .io/AI-Time…   │   CORS       │  nginx → /api/       │
 └─────────────────┘              └──────────────────────┘
         ▲
         │ dev: Vite proxy /api → 127.0.0.1:8100 (same machine)
         └────────────────────────────────────────────────────
```

## Ports (do not reuse busy ports)

| Service | Port |
|---------|------|
| Django API (local / VPS internal) | **8100** |
| React Vite dev | **5180** |
| Postgres (VPS) | 5432 |

## Repository layout

| Path | Role |
|------|------|
| `web/` | **Primary frontend** — React + Vite |
| `backend/` | Django REST — local desktop now, VPS later |
| `deploy/godaddy/` | VPS API + DB deploy (no React static) |
| `mobile/` | Flutter apps (optional; point API URL at desktop or VPS) |
| `index.html` | Legacy PWA (not on GitHub Pages) |

## Local development (desktop)

```bash
# Both services
./scripts/start-dev.sh

# Or separate terminals
./scripts/start-backend.sh   # :8100
./scripts/start-frontend.sh  # :5180, proxies /api
```

React uses `web/.env.development` → `VITE_API_URL=/api`.

## GitHub Pages (frontend only)

- Workflow: `.github/workflows/deploy-pages.yml`
- Builds `web/` with `VITE_BASE_PATH=/AI-TimeTable-Assistant/`
- Live URL: `https://zub165.github.io/AI-TimeTable-Assistant/`

Until VPS is ready, Pages build works but API shows offline (no `VITE_API_URL` secret).

## GoDaddy VPS (backend + database)

1. Deploy `backend/` with `USE_POSTGRES=True` — see `deploy/godaddy/README.md`
2. Set `CORS_ALLOWED_ORIGINS` to `https://zub165.github.io`
3. Expose API at e.g. `https://api.yourdomain.com/api`
4. GitHub secret: `VITE_API_URL=https://api.yourdomain.com/api`
5. Push `main` to rebuild Pages

## API endpoints

- `GET /api/health/`
- `GET|DELETE /api/activities/`
- `POST /api/activities/start/` · `POST /api/activities/stop/`
- `GET|PUT /api/schedule/`

## Environment variables

**Backend** `backend/.env` — see `.env.example`  
**React dev** `web/.env.development` — `VITE_API_URL=/api`  
**React prod** GitHub secret `VITE_API_URL` or `web/.env.production` from `.env.production.example`

## CI

- `ci.yml` — tests backend + builds React (no deploy)
- `deploy-pages.yml` — React → GitHub Pages only
