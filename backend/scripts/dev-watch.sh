#!/bin/sh
# ---------------------------------------------------------------------
# Backend dev watcher — chạy trong container (docker-compose.dev.yml).
#
# Vòng lặp polling (không dùng inotify) vì bind-mount từ host Windows/
# macOS qua Docker Desktop KHÔNG phát sự kiện file sang container.
#
#   1. Compile lần đầu
#   2. Chạy `mvn spring-boot:run` (kèm spring-boot-devtools)
#   3. Mỗi 3s, so checksum source; nếu đổi -> `mvn compile` lại
#      -> devtools phát hiện classpath đổi -> restart app tự động
# ---------------------------------------------------------------------
set -e

COMPILE_INTERVAL=3

echo "[dev] Compile lần đầu..."
mvn -B -q compile

echo "[dev] Khởi động Spring Boot (devtools sẽ tự restart khi classpath đổi)..."
mvn -B spring-boot:run -Dspring-boot.run.fork=true &
MVN_PID=$!

cleanup() {
  echo "[dev] Dừng ứng dụng..."
  # `spring-boot:run` fork ra tiến trình java con — cần dừng cả hai.
  pkill -f 'spring-boot:run' 2>/dev/null || true
  pkill -f 'com.uniwork.UniworkApplication' 2>/dev/null || true
  kill $MVN_PID 2>/dev/null || true
}
trap cleanup INT TERM EXIT

fingerprint() {
  find src -type f \( -name '*.java' -o -name '*.yml' -o -name '*.yaml' \
    -o -name '*.properties' -o -name '*.sql' \) -exec md5sum {} \; \
    | sort | md5sum | cut -d' ' -f1
}

PREV=$(fingerprint)

while kill -0 $MVN_PID 2>/dev/null; do
  sleep $COMPILE_INTERVAL
  CUR=$(fingerprint)
  if [ "$CUR" != "$PREV" ]; then
    PREV=$CUR
    echo "[dev] Phát hiện thay đổi source -> compile lại..."
    if mvn -B -q compile; then
      echo "[dev] Compile xong -> devtools sẽ restart app."
    else
      echo "[dev] Compile LỖI (app giữ nguyên bản cũ, chi tiết lỗi ở trên)."
    fi
  fi
done

cleanup
