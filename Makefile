.PHONY: help dev test seed migrate build docker-build lint format deploy vapid-keys

help:
	@echo "Available commands:"
	@echo "  make dev          - Run backend FastAPI server (fastapi dev)"
	@echo "  make test         - Run backend Pytest suite"
	@echo "  make lint         - Run Ruff linter on backend"
	@echo "  make format       - Run Ruff formatter on backend"
	@echo "  make seed         - Seed database with 10 players & matches"
	@echo "  make migrate      - Run Alembic database migrations"
	@echo "  make build        - Build React frontend SPA into backend/static"
	@echo "  make deploy       - Build frontend & deploy FastAPI to Cloud"
	@echo "  make docker-build - Build production Docker container"
	@echo "  make vapid-keys   - Generate Web Push VAPID keypair (env lines)"

dev:
	cd backend && uv run fastapi dev --port 8000

test:
	cd backend && uv run pytest

lint:
	cd backend && uv run ruff check .

format:
	cd backend && uv run ruff format .

seed:
	cd backend && uv run python seed.py

migrate:
	cd backend && uv run alembic upgrade head

build:
	cd frontend && pnpm run build

deploy: build
	cd backend && uv run fastapi deploy

docker-build:
	docker build -t chess-club-app .

vapid-keys:
	cd backend && uv run python scripts/generate_vapid.py
