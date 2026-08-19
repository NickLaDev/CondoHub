#!/usr/bin/env bash
#
# CondoHub — sobe TUDO para desenvolvimento local
# ------------------------------------------------
# Sobe, juntos:
#   1) API / backend   (Node + Express)  -> http://localhost:3000   (banco LOCAL)
#   2) web-sindico     (Vite/React)      -> http://localhost:5173
#   3) app-mobile      (Flutter)         -> emulador/simulador/dispositivo conectado
#
# O backend aponta para o Postgres LOCAL (scripts/db-local.sh). O seu
# dev/backend/.env online NÃO é usado nem alterado aqui.
#
# Pré-requisitos: Docker, Node 20+, Flutter (com um emulador/simulador aberto).
#
# Uso:
#   ./scripts/dev-all.sh                # backend + web-sindico + mobile
#   ./scripts/dev-all.sh --no-mobile    # sem o Flutter (ex.: sem emulador aberto)
#   ./scripts/dev-all.sh --no-web       # sem o web-sindico
#
# Ctrl+C encerra todos os processos.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/dev/backend"
SINDICO_DIR="$ROOT_DIR/dev/web-sindico"
MOBILE_DIR="$ROOT_DIR/dev/app-mobile"

# --- DB local (mesmos defaults do scripts/db-local.sh) ---
CONTAINER="${CONDOHUB_PG_CONTAINER:-condohub-postgres}"
PG_PORT="${CONDOHUB_PG_PORT:-5433}"
PG_USER="${CONDOHUB_PG_USER:-condohub}"
PG_PASSWORD="${CONDOHUB_PG_PASSWORD:-condohub}"
PG_DB="${CONDOHUB_PG_DB:-condohub}"
LOCAL_DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${PG_DB}"

# --- API ---
API_PORT="${PORT:-3000}"
API_BASE_URL="http://localhost:${API_PORT}"
# iOS sim/desktop = localhost ; Android emulator = 10.0.2.2 (o app_config.dart já trata o default)
MOBILE_API_BASE_URL="${CONDOHUB_API_BASE_URL:-${API_BASE_URL}/api/v1}"

RUN_MOBILE=true
RUN_WEB=true
RUN_BACKEND=true
for arg in "$@"; do
  case "$arg" in
    --no-mobile)  RUN_MOBILE=false ;;
    --no-web)     RUN_WEB=false ;;
    --no-backend) RUN_BACKEND=false ;;
    *) echo "Argumento desconhecido: $arg" >&2; exit 2 ;;
  esac
done

pids=()
cleanup() {
  echo ""
  echo "[dev-all] Encerrando processos..."
  for pid in "${pids[@]:-}"; do
    kill "$pid" >/dev/null 2>&1 || true
  done
}
trap cleanup EXIT INT TERM

ensure_node_modules() {
  local dir="$1"
  if [ ! -d "$dir/node_modules" ]; then
    echo "[dev-all] Instalando dependências em $(basename "$dir")..."
    (cd "$dir" && npm install)
  fi
}

# 0) Garante o banco local rodando + migrado
if [ "$RUN_BACKEND" = true ]; then
  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER"; then
    echo "[dev-all] Banco local não está rodando — subindo via db-local.sh..."
    "$ROOT_DIR/scripts/db-local.sh"
  fi
fi

# 1) Backend (banco LOCAL; não usa o .env online)
if [ "$RUN_BACKEND" = true ]; then
  ensure_node_modules "$BACKEND_DIR"
  echo "[dev-all] Subindo backend em $API_BASE_URL (Swagger: $API_BASE_URL/api/docs)..."
  (
    cd "$BACKEND_DIR"
    DATABASE_URL="$LOCAL_DATABASE_URL" \
    AUTH_MODE="${AUTH_MODE:-jwt}" \
    TENANT_MODE="${TENANT_MODE:-path}" \
    UPLOAD_MODE="${UPLOAD_MODE:-local}" \
    AUDIT_MODE="${AUDIT_MODE:-console}" \
    npm run dev
  ) &
  pids+=($!)
fi

# 2) web-sindico (usa o próprio .env.local — FULL MOCK por padrão)
if [ "$RUN_WEB" = true ]; then
  ensure_node_modules "$SINDICO_DIR"
  echo "[dev-all] Subindo web-sindico (Vite)..."
  (
    cd "$SINDICO_DIR"
    VITE_API_BASE_URL="$API_BASE_URL" npm run dev
  ) &
  pids+=($!)
fi

# 3) app-mobile (Flutter) — em primeiro plano, pois precisa do console/dispositivo
if [ "$RUN_MOBILE" = true ]; then
  if ! command -v flutter >/dev/null 2>&1; then
    echo "[dev-all] AVISO: 'flutter' não encontrado no PATH — pulando o app mobile."
    echo "[dev-all] Backend/web continuam rodando. Ctrl+C para encerrar."
    wait
  else
    echo "[dev-all] Subindo app-mobile (precisa de um emulador/simulador/dispositivo aberto)..."
    echo "[dev-all] API do app: $MOBILE_API_BASE_URL"
    cd "$MOBILE_DIR"
    flutter pub get
    flutter run --dart-define=CONDOHUB_API_BASE_URL="$MOBILE_API_BASE_URL"
  fi
else
  echo "[dev-all] Mobile desativado. Backend/web rodando. Ctrl+C para encerrar."
  wait
fi
