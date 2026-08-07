#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-${PROJECT_DIR}/.env.production}"
COMPOSE_FILE="${PROJECT_DIR}/compose.production.yml"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "File ${ENV_FILE} belum ada. Salin .env.production.example terlebih dahulu." >&2
  exit 1
fi

cd "${PROJECT_DIR}"

compose=(docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}")

"${compose[@]}" config --quiet
"${compose[@]}" pull database caddy
"${compose[@]}" build --pull migrate app
"${compose[@]}" up -d --remove-orphans
"${compose[@]}" ps

echo
echo "Deployment dijalankan. Pantau SSL dan aplikasi dengan:"
echo "docker compose --env-file .env.production -f compose.production.yml logs -f caddy app"
