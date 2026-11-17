# ---------------------------------------------------------------------
# Frontend — React 19 / Vite
# Multi-stage: build với Node, phục vụ bằng Nginx (SPA + reverse proxy /api).
# ---------------------------------------------------------------------

# --- Stage 1: build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Cache dependency
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && corepack prepare pnpm@9 --activate \
  && (pnpm install --frozen-lockfile || pnpm install)

# Copy source & build
COPY . .
ARG VITE_USE_MOCK_API=false
ENV VITE_USE_MOCK_API=$VITE_USE_MOCK_API
RUN pnpm build

# --- Stage 2: nginx ---
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
