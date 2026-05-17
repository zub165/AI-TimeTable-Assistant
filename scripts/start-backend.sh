#!/usr/bin/env bash
# Local desktop Django API — port 8100
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
else
  source .venv/bin/activate
fi

[[ -f .env ]] || cp .env.example .env
python manage.py migrate --noinput
echo "Backend: http://127.0.0.1:8100/api/health/"
exec python manage.py runserver 127.0.0.1:8100
