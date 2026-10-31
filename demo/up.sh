#!/usr/bin/env bash
# Starts the local demo: PostgreSQL, simulators, backend and web client. Needs Docker and the backend repository
# checked out next to this one (or BACKEND_DIR pointing to it). Open http://localhost:8080 when it says ready.
set -euo pipefail
DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$(dirname "$DEMO_DIR")"
BACKEND_DIR="${BACKEND_DIR:-$(dirname "$CLIENT_DIR")/bulk-mailer-backend}"
WEB_PORT="${WEB_PORT:-8080}"
if [ ! -f "$BACKEND_DIR/package.json" ]; then
  echo "Backend repository not found at $BACKEND_DIR (clone Ramioy/bulk-mailer-backend next to this one or set BACKEND_DIR)" >&2
  exit 1
fi
export DEMO_DIR CLIENT_DIR BACKEND_DIR WEB_PORT

secret() { openssl rand -hex 24; }
if [ ! -f "$DEMO_DIR/.env" ]; then
  cat > "$DEMO_DIR/.env" <<ENV
OWNER_DB_PASSWORD=$(secret)
APP_DB_PASSWORD=$(secret)
JWT_SIGNING_KEY=$(openssl rand -base64 32)
TAYRONA_API_TOKEN=$(secret)
SAP_API_TOKEN=$(secret)
ZEPTOMAIL_API_KEY=$(secret)
ZOHO_OAUTH_CLIENT_ID=demo-client
ZOHO_OAUTH_CLIENT_SECRET=$(secret)
ZOHO_OAUTH_REFRESH_TOKEN=$(secret)
ZEPTO_OAUTH_TOKEN=$(secret)
ZEPTOMAIL_WEBHOOK_KEY=$(secret)
ZEPTOMAIL_WEBHOOK_AUTHORIZATION=Webhook-$(secret)
DEMO_OPERATOR=operador
DEMO_OPERATOR_PASSWORD=$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)
ENV
fi
mkdir -p "$DEMO_DIR/tls"
if [ ! -f "$DEMO_DIR/tls/cert.pem" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=app" -addext "subjectAltName=DNS:app,DNS:localhost,IP:127.0.0.1" \
    -keyout "$DEMO_DIR/tls/key.pem" -out "$DEMO_DIR/tls/cert.pem" 2>/dev/null
  chmod 644 "$DEMO_DIR/tls/key.pem"
fi

COMPOSE=(docker compose -f "$DEMO_DIR/docker-compose.yml" --env-file "$DEMO_DIR/.env")
"${COMPOSE[@]}" up -d --build

for _ in $(seq 1 90); do
  if curl -sf "http://localhost:$WEB_PORT/api/health" >/dev/null; then
    # shellcheck disable=SC1091
    . "$DEMO_DIR/.env"
    echo
    echo "Demo lista: http://localhost:$WEB_PORT"
    echo "Operador: $DEMO_OPERATOR   Contraseña: $DEMO_OPERATOR_PASSWORD"
    echo "Contratos de prueba: demo/contracts-tayrona.json (Tayrona) y demo/contracts-sap.json (SAP, bloque ANGLO)."
    exit 0
  fi
  sleep 2
done
echo "La aplicación no respondió a tiempo; últimos registros:" >&2
"${COMPOSE[@]}" logs --tail 50 app web >&2
exit 1
