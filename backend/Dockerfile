# ---------------------------------------------------------------------
# Backend — Spring Boot 3.3 / Java 17
# Multi-stage: build với Maven, chạy với JRE nhẹ.
#
# Dùng cho:
#   - Docker Compose local (docker-compose.yml / docker-compose.dev.yml)
#   - Render (runtime: docker, plan: free — 0.1 CPU / 512 MB RAM)
# ---------------------------------------------------------------------

# --- Stage 1: build ---
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Cache dependency trước (copy pom trước, source sau)
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

# Copy source & build
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# --- Stage 2: runtime ---
FROM eclipse-temurin:17-jre

WORKDIR /app

# Tạo user không đặc quyền
RUN groupadd -r spring && useradd -r -g spring spring

COPY --from=builder /build/target/*.jar app.jar

# File upload lưu trên Cloudflare R2 — container KHÔNG cần thư mục ghi file.
# (Cách này giúp deploy lên PaaS có disk ephemeral không mất dữ liệu khi restart.)

# --- JVM tuning cho container giới hạn RAM -------------------------------
# Render free chỉ có 512 MB RAM. Mặc định JVM (JDK 10+) chỉ lấy 25% RAM
# làm heap => 128 MB heap => Spring Boot + Flyway OOM.
#   MaxRAMPercentage=60 : ~300 MB heap, chừa chỗ cho metaspace/code cache
#   UseSerialGC         : 1 CPU => G1 cạn tranh thread, SerialGC nhẹ hơn
#   Xss512k             : giảm thread stack của Tomcat
#   ReservedCodeCache   : chặn JIT cache phình to
# Render có thể override bằng biến môi trường JAVA_TOOL_OPTIONS.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+UseSerialGC -Xss512k -XX:ReservedCodeCacheSize=48m"

# Render inject PORT=10000; local docker compose không set => 8080.
ENV PORT=8080

EXPOSE 8080

USER spring:spring

# Healthcheck: dùng endpoint công khai (GET, không phải HEAD để tránh 401).
# Dùng $PORT vì Render đổi port sang 10000.
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=10 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/v1/public/categories" || exit 1

# -XX:+ExitOnOutOfMemoryError: OOM thì container thoát hẳn để Render restart,
# thay vì chạy tiếp với heap hỏng.
ENTRYPOINT ["java", "-XX:+ExitOnOutOfMemoryError", "-jar", "/app/app.jar"]
