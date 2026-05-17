#!/usr/bin/env bash
# Local React dev — port 5180 (proxies /api → desktop backend :8100)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/web"
[[ -d node_modules ]] || npm install
echo "React: http://127.0.0.1:5180 (API via /api proxy)"
exec npm run dev
