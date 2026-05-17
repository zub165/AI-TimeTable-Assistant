# GoDaddy VPS deployment (future)

Local development uses **SQLite** on port **8100** and React on **5180**.

## VPS checklist

1. Copy `.env.example` to `.env` on the VPS and set `USE_POSTGRES=True` plus Postgres credentials.
2. Run `deploy/godaddy/deploy.sh` on the server (installs deps, migrates, restarts services).
3. Point Nginx at `deploy/godaddy/nginx.conf` (API + static React build).
4. Open firewall: 80/443 only; API binds to `127.0.0.1:8100`.

## Ports (avoid conflicts)

| Service        | Local port |
|----------------|------------|
| Django API     | 8100       |
| React (Vite)   | 5180       |
| Postgres (VPS) | 5432       |
