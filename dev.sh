#!/usr/bin/env bash
# ---------------------------------------------------------------------
# VieJob Marketplace — chạy chế độ DEV (full dev trong Docker)
#
#   docker compose -f docker-compose.dev.yml up --build
#
# Frontend : http://localhost:5173   (Vite dev server + HMR)
# Backend  : http://localhost:8081   (Spring Boot + devtools)
# Swagger  : http://localhost:8081/swagger-ui.html
# MySQL    : localhost:3307
#
# Bản production (nginx + jar) vẫn chạy độc lập ở:
#   http://localhost:8000 / :8080 / :3306
# ---------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.dev.yml"

case "${1:-up}" in
  up)
    docker compose -f "$COMPOSE_FILE" up --build "$@"
    ;;
  up-d)
    shift
    docker compose -f "$COMPOSE_FILE" up -d --build "$@"
    ;;
  down)
    docker compose -f "$COMPOSE_FILE" down "$@"
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f "$@"
    ;;
  ps)
    docker compose -f "$COMPOSE_FILE" ps "$@"
    ;;
  *)
    echo "Dùng: $0 [up|up-d|down|logs|ps]" >&2
    exit 1
    ;;
esac
