# ---------------------------------------------------------------------
# Backend — Spring Boot 3.3 / Java 17
# Multi-stage: build với Maven, chạy với JRE nhẹ.
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

USER spring:spring

EXPOSE 8080

# Healthcheck: dùng endpoint công khai (GET, không phải HEAD để tránh 401)
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=10 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/api/v1/public/categories || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
