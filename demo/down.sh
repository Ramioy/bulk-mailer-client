#!/usr/bin/env bash
# Stops the demo and deletes its database and files (demo/.env and demo/tls stay).
set -euo pipefail
DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"
export DEMO_DIR CLIENT_DIR="$(dirname "$DEMO_DIR")" BACKEND_DIR="${BACKEND_DIR:-$(dirname "$(dirname "$DEMO_DIR")")/bulk-mailer-backend}" WEB_PORT="${WEB_PORT:-8080}"
docker compose -f "$DEMO_DIR/docker-compose.yml" --env-file "$DEMO_DIR/.env" down -v --remove-orphans
