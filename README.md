# Voice Time Manager

Voice-controlled time tracking with AI coaching, daily schedule planning, and sync through a Django API.

## How we deploy

| What | Where |
|------|--------|
| **Frontend (React)** | [GitHub Pages](https://zub165.github.io/AI-TimeTable-Assistant/) — `web/` folder only |
| **Backend (Django)** | **Your desktop** during development → **GoDaddy VPS** in production |
| **Database** | SQLite locally → PostgreSQL on VPS |

## Quick start (local desktop)

```bash
./scripts/start-dev.sh
```

- React: http://127.0.0.1:5180  
- API: http://127.0.0.1:8100/api/health/

Or run separately:

```bash
./scripts/start-backend.sh   # Django + SQLite
./scripts/start-frontend.sh  # Vite dev server
```

## GitHub Pages (frontend)

Every push to `main` builds and deploys **only** the React app from `web/`.

**Site:** https://zub165.github.io/AI-TimeTable-Assistant/

## Production (GoDaddy VPS)

1. Deploy API using `deploy/godaddy/` (backend + Postgres — **not** the React build).
2. Add GitHub repository secret:
   - `VITE_API_URL` = `https://api.yourdomain.com/api`
3. Push to `main` so Pages rebuilds with the live API URL.

Details: `deploy/godaddy/README.md` and `context.md`.

## Features

- Voice start/stop activities and AI schedule coaching
- Responsive UI (phone, iPad, TV-friendly)
- REST API for activities and day schedule
- Optional Flutter mobile app in `mobile/`

## Voice commands

- `Start [activity]` / `Stop [activity]`
- `How am I doing?` / `Analyze my day`
- `Optimize schedule` / `What should I do`

## Project structure

```
web/           ← React frontend (GitHub Pages)
backend/       ← Django API (local desktop → GoDaddy VPS)
deploy/godaddy/← VPS backend + database
mobile/        ← Flutter (optional)
```

## License

MIT
