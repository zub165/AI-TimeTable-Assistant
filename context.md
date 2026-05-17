# Voice Time Manager — Project Context (v1.0)

## Overview

Multi-platform voice-controlled time tracking: plan your ideal day, start/stop activities by voice, and sync data through a shared Django API.

## Architecture

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
│ index.html  │  │ React (web) │  │ Flutter     │  │ Electron /   │
│ PWA + SW    │  │ :5180       │  │ iOS/Android │  │ Tizen        │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────────┘
       │ localStorage    │                │
       └─────────────────┴────────────────┘
                         │
              ┌──────────▼──────────┐
              │ Django REST :8100   │
              │ django-cors-headers │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │ SQLite (local dev)  │
              │ PostgreSQL (VPS)    │
              └─────────────────────┘
```

## Port map (do not reuse busy ports)

| Service | Port | Notes |
|---------|------|--------|
| Django API | **8100** | `python manage.py runserver 127.0.0.1:8100` |
| React (Vite) | **5180** | Avoids 5174–5177, 8001 |
| Postgres (VPS) | 5432 | Docker on GoDaddy only |
| Android emulator → API | 10.0.2.2:8100 | Flutter default |
| iOS simulator → API | 127.0.0.1:8100 | Flutter default |

## Repository layout

| Path | Purpose |
|------|---------|
| `index.html`, `sw.js`, `manifest.json` | Original PWA (localStorage + optional API later) |
| `backend/` | Django 6 + DRF, SQLite/Postgres |
| `web/` | React + Vite client |
| `mobile/` | Flutter (iOS + Android) |
| `deploy/godaddy/` | VPS: Docker Compose, Nginx, `deploy.sh` |
| `scripts/` | `start-dev.sh`, `build-mobile.sh` |
| `releases/` | Built `.aab` / simulator artifacts |
| `electron/`, `tizen/` | Desktop / TV wrappers (unchanged) |

## API endpoints

- `GET /api/health/`
- `GET|DELETE /api/activities/`
- `POST /api/activities/start/` — body: `{ "name": "coding" }`
- `POST /api/activities/stop/` — body: `{ "name": "coding" }`
- `GET|PUT /api/schedule/` — day plan hours per category

## Local development

```bash
# Terminal 1 — API
cd backend && source .venv/bin/activate
cp -n .env.example .env
python manage.py migrate
python manage.py runserver 127.0.0.1:8100

# Terminal 2 — React
cd web && npm install && npm run dev
# http://127.0.0.1:5180

# Terminal 3 — Flutter
cd mobile && flutter run
```

Or: `./scripts/start-dev.sh`

## GoDaddy VPS (future)

1. Copy `backend/.env` with `USE_POSTGRES=True` and secrets.
2. On server: `deploy/godaddy/deploy.sh`
3. Optional: `docker compose -f deploy/godaddy/docker-compose.vps.yml up -d`
4. Install `deploy/godaddy/nginx.conf` for TLS + reverse proxy.

CORS in production: set `CORS_ALLOWED_ORIGINS` to your domain(s). In `DEBUG`, CORS allows all origins when the env var is empty.

## Bugs fixed (v1.0)

- **XSS**: Activity list uses `escapeHtml` + `data-action` delegation (no inline `onclick`).
- **Schedule persistence**: `daySchedule` saved to `localStorage`; restored on load.
- **Active sessions**: Restored from `startTimes` / `activeActivities` after refresh.
- **Service worker**: Registers with `new URL('./sw.js', …)` for non-root hosting.
- **Django `BASE_DIR`**: Was pointing at `.env` file; fixed to `backend/`.

## Mobile builds (v1.0.0)

```bash
./scripts/build-mobile.sh
# Output: releases/voice-time-manager-v1.0.0.aab
```

IPA requires Apple signing; simulator build: `flutter build ios --simulator`.

## Deployment

- **GitHub Pages**: workflow `.github/workflows/deploy-pages.yml` (PWA + React build).
- **CI**: `.github/workflows/ci.yml` — backend, web, Flutter analyze.
- **VPS**: `deploy/godaddy/` scripts (manual).

## Environment variables

**backend/.env** — see `.env.example`  
**web/.env** — `VITE_API_URL=http://127.0.0.1:8100/api`  
**Flutter** — `--dart-define=API_URL=http://your-host:8100/api`

## Next steps

- Auth (JWT) for multi-user sync
- Wire PWA `index.html` to REST API (offline queue)
- App Store / Play Store signing pipelines
- Prayer times API integration
