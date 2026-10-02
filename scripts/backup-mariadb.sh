#!/usr/bin/env sh
set -eu

ENV_FILE="${COMPOSE_ENV_FILE:-deploy/.env.production}"
if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

: "${MARIADB_DATABASE:?Set MARIADB_DATABASE}"
: "${MARIADB_USER:?Set MARIADB_USER}"
: "${MARIADB_PASSWORD:?Set MARIADB_PASSWORD}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/bazis-crm}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
mkdir -p "$BACKUP_DIR"

docker compose --env-file "$ENV_FILE" -f docker-compose.production.yml exec -T db mariadb-dump \
  -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" --single-transaction --routines --events "$MARIADB_DATABASE" \
  | gzip > "$BACKUP_DIR/servio_crm-$STAMP.sql.gz"

find "$BACKUP_DIR" -type f -name 'servio_crm-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
echo "Backup created: $BACKUP_DIR/servio_crm-$STAMP.sql.gz"
