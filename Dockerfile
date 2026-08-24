# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm run build

# Stage 2: Production Python Backend
FROM python:3.14-slim AS runner
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast Python package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy backend requirements & install dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN uv pip install --system -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend static assets into backend static folder
COPY --from=frontend-builder /app/frontend/dist ./backend/static

# Environment variables
ENV PYTHONPATH=/app/backend
ENV PORT=8080
ENV ENVIRONMENT=production

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Production start command
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
