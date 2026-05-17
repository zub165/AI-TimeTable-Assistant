#!/usr/bin/env bash
# Ports: API 8100, React 5180 (avoid 5000, 5174-5177, 8001)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -f "$ROOT/backend/.env" ]]; then
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
fi

cd "$ROOT/backend"
source .venv/bin/activate
python manage.py migrate --noinput
python manage.py runserver 127.0.0.1:8100 &
API_PID=$!

cd "$ROOT/web"
npm run dev &
WEB_PID=$!

echo "API:  http://127.0.0.1:8100/api/health/"
echo "React: http://127.0.0.1:5180"
echo "PWA:   open index.html or serve root statically"
trap "kill $API_PID $WEB_PID 2>/dev/null" EXIT
wait
