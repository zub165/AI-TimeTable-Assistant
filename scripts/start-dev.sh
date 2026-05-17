#!/usr/bin/env bash
# Local desktop: Django API :8100 + React :5180
# Production: React on GitHub Pages, API on GoDaddy VPS (see deploy/godaddy/)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

"$ROOT/scripts/start-backend.sh" &
API_PID=$!
sleep 2
"$ROOT/scripts/start-frontend.sh" &
WEB_PID=$!

echo ""
echo "Frontend (React): http://127.0.0.1:5180"
echo "Backend (local):  http://127.0.0.1:8100/api/health/"
echo "GitHub Pages deploys web/ only — backend stays on desktop until GoDaddy."
trap "kill $API_PID $WEB_PID 2>/dev/null" EXIT
wait
