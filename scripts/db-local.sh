#!/usr/bin/env bash
#
# CondoHub — banco LOCAL + migrations
# -----------------------------------
# Cria (se ainda não existir) um Postgres LOCAL em Docker, roda TODAS as migrations
# do backend nesse banco e deixa o banco rodando para desenvolvimento.
#
# Não usa o banco/credenciais online. O DATABASE_URL local é injetado na hora de
# migrar (o dotenv do backend NÃO sobrescreve variáveis já definidas no ambiente),
# então o seu dev/backend/.env online permanece intacto.
#
# Uso:
#   ./scripts/db-local.sh            # cria/sobe o banco e roda as migrations
#   ./scripts/db-local.sh --status   # só mostra o status das migrations
#   ./scripts/db-local.sh --reset    # APAGA o volume do banco e recria do zero
#
# Variáveis (opcionais) para customizar:
#   CONDOHUB_PG_CONTAINER (default: condohub-postgres)
#   CONDOHUB_PG_PORT      (default: 5433)
#   CONDOHUB_PG_USER      (default: condohub)
#   CONDOHUB_PG_PASSWORD  (default: condohub)
#   CONDOHUB_PG_DB        (default: condohub)
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/dev/backend"

CONTAINER="${CONDOHUB_PG_CONTAINER:-condohub-postgres}"
VOLUME="${CONDOHUB_PG_VOLUME:-condohub-pgdata}"
PG_PORT="${CONDOHUB_PG_PORT:-5433}"
PG_USER="${CONDOHUB_PG_USER:-condohub}"
PG_PASSWORD="${CONDOHUB_PG_PASSWORD:-condohub}"
PG_DB="${CONDOHUB_PG_DB:-condohub}"
LOCAL_DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@localhost:${PG_PORT}/${PG_DB}"

STATUS_ONLY=false
RESET=false
for arg in "$@"; do
  case "$arg" in
    --status) STATUS_ONLY=true ;;
    --reset)  RESET=true ;;
    *) echo "Argumento desconhecido: $arg" >&2; exit 2 ;;
  esac
done

command -v docker >/dev/null 2>&1 || {
  echo "ERRO: 'docker' não encontrado. Instale o Docker Desktop e tente de novo." >&2
  exit 1
}

if [ "$RESET" = true ]; then
  echo "[db-local] --reset: removendo container e volume..."
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null 2>&1 || true
fi

# Cria ou inicia o container Postgres
if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "[db-local] Container '$CONTAINER' já está rodando."
elif docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  echo "[db-local] Iniciando container '$CONTAINER' existente..."
  docker start "$CONTAINER" >/dev/null
else
  echo "[db-local] Criando Postgres '$CONTAINER' (porta $PG_PORT, db '$PG_DB')..."
  docker run -d \
    --name "$CONTAINER" \
    -e POSTGRES_USER="$PG_USER" \
    -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -e POSTGRES_DB="$PG_DB" \
    -p "${PG_PORT}:5432" \
    -v "${VOLUME}:/var/lib/postgresql/data" \
    postgres:16-alpine >/dev/null
fi

# Espera o Postgres aceitar conexões
echo "[db-local] Aguardando o Postgres ficar pronto..."
for i in $(seq 1 60); do
  if docker exec "$CONTAINER" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
    break
  fi
  if [ "$i" = "60" ]; then
    echo "ERRO: Postgres não ficou pronto a tempo." >&2
    exit 1
  fi
  sleep 1
done

# Garante dependências do backend
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
  echo "[db-local] Instalando dependências do backend (npm install)..."
  (cd "$BACKEND_DIR" && npm install)
fi

# Roda as migrations (ou só o status) contra o banco LOCAL
cd "$BACKEND_DIR"
if [ "$STATUS_ONLY" = true ]; then
  echo "[db-local] Status das migrations (banco local):"
  DATABASE_URL="$LOCAL_DATABASE_URL" npm run db:status
  exit 0
fi

echo "[db-local] Rodando migrations no banco local..."
DATABASE_URL="$LOCAL_DATABASE_URL" npm run db:migrate

cat <<EOF

[db-local] Pronto. Postgres local rodando e migrado:
  DATABASE_URL = $LOCAL_DATABASE_URL
  Container    = $CONTAINER   (parar: docker stop $CONTAINER | logs: docker logs -f $CONTAINER)
  Volume       = $VOLUME      (dados persistem entre reinícios)

Obs.: o banco começa VAZIO (só o schema). Para popular dados de teste, veja a
seção "Seed / dados de teste" no README.
EOF
