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

# Lệnh con (vd. "down") luôn được `shift` khỏi vị trí $1 trước khi
# truyền "$@" cho docker compose — nếu không, docker hiểu nhầm tên lệnh
# là tên service ("no such service: down").
case "${1:-up}" in
  up)
    shift || true
    docker compose -f "$COMPOSE_FILE" up --build "$@"
    ;;
  up-d)
    shift
    docker compose -f "$COMPOSE_FILE" up -d --build "$@"
    ;;
  down)
    shift
    docker compose -f "$COMPOSE_FILE" down "$@"
    ;;
  reset)
    # Xoá volume MySQL dev → Flyway migrate lại từ V1 (dùng khi đã SỬA
    # file migration V3/V4/V5 đã từng được apply → "Migration checksum mismatch").
    # Bản production (docker-compose.yml) không bị ảnh hưởng.
    shift
    docker compose -f "$COMPOSE_FILE" down -v "$@"
    docker compose -f "$COMPOSE_FILE" up -d --build "$@"
    ;;
  logs)
    shift
    docker compose -f "$COMPOSE_FILE" logs -f "$@"
    ;;
  ps)
    shift
    docker compose -f "$COMPOSE_FILE" ps "$@"
    ;;
  *)
    echo "Dùng: $0 [up|up-d|down|reset|logs|ps]" >&2
    exit 1
    ;;
esac
