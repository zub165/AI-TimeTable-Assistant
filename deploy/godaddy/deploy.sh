#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/backend"

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created backend/.env — edit secrets before production."
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput 2>/dev/null || true

echo "Start API: source .venv/bin/activate && gunicorn config.wsgi:application -b 127.0.0.1:8100"
echo "Build React: cd ../web && npm ci && npm run build"
echo "Copy deploy/godaddy/nginx.conf to /etc/nginx/sites-available/voice-time-manager"
