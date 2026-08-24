# ♟️ Quaveo Chess Club Rating Web App

A production-ready, mobile-first web application built for Quaveo Chess Club. It tracks matches, schedules, results, and independent **Rapid**, **Blitz**, and **Classical** Elo ratings for club players.

---

## 🌟 Key Features

- **3 Independent Ratings**: Rapid, Blitz, and Classical ratings ($K = 32$, initial rating $1200$).
- **Deterministic Elo Engine**: Rebuilds complete rating history from match records upon result edits or cancellations.
- **Mobile-First UX**: Responsive interface optimized for mobile viewports (375px–430px) with touch-friendly targets.
- **Admin Dashboard**: Secure HTTP-only session cookie authentication for managing players, scheduling matches, and 1-tap result recording.
- **Vietnam Timezone Support**: Match schedules and historical dates automatically presented in `Asia/Ho_Chi_Minh` (UTC+7).
- **FastAPI Cloud & Container Ready**: Deployable with a single `fastapi deploy` command or via multi-stage Docker container on Cloud Run.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.14, FastAPI (FastAPI CLI / `fastapi[standard]`), SQLModel (SQLAlchemy 2.x + Pydantic v2), Uvicorn, Alembic.
- **Database**: SQLite (Local Dev zero-dependency default) & PostgreSQL / Neon (Production).
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v3, Lucide Icons, `openapi-typescript` + `openapi-fetch`.
- **Package Managers**: `uv` for ultra-fast Python management in `backend/`, `pnpm` for `frontend/`.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Python 3.14 & [`uv`](https://docs.astral.sh/uv/)
- Node.js v20+ & `pnpm`

### 2. Backend Setup
```bash
# Sync dependencies and virtualenv in backend
cd backend
uv sync

# Seed 10 players and historical matches
cd ..
make seed

# Start backend dev server with FastAPI CLI (runs at http://localhost:8000)
make dev
```

### 3. Frontend Setup (In a separate terminal)
```bash
cd frontend
pnpm install
pnpm run dev
# Frontend runs at http://localhost:5173
```

---

## ☁️ Deploying to FastAPI Cloud (`fastapi deploy`)

The backend is configured as a self-contained FastAPI Cloud project with entrypoint `main:app` in [`backend/pyproject.toml`](file:///Users/thanhpt/01-personal/chess/backend/pyproject.toml).

To deploy directly to **FastAPI Cloud**:

1. **Log in to FastAPI Cloud**:
   ```bash
   cd backend
   uv run fastapi login
   ```

2. **Deploy the application**:
   ```bash
   make deploy
   # Or manually: cd backend && uv run fastapi deploy
   ```

---

## 🧪 Running Automated Tests & Linting

```bash
# Run Ruff linting and formatting
make lint
make format

# Run full Pytest backend test suite
make test
```

---

## 🐳 Docker Deployment (Google Cloud Run / Container Platforms)

```bash
# Build multi-stage Docker image
make docker-build

# Run container locally
docker run -p 8080:8080 \
  -e DATABASE_URL="sqlite+aiosqlite:///./chess.db" \
  -e ADMIN_USERNAME="admin" \
  -e ADMIN_PASSWORD="your_secure_password" \
  -e SESSION_SECRET="your_production_secret" \
  chess-club-app
```

Verify container health:
```bash
curl http://localhost:8080/health
# Returns: {"status": "ok"}
```

---

## 📂 Project Structure

```text
chess/
├── backend/                     # Self-contained Python FastAPI backend
│   ├── pyproject.toml           # uv & FastAPI entrypoint (tool.fastapi)
│   ├── main.py                  # Entrypoint exporting app
│   ├── app/
│   │   ├── main.py              # FastAPI app definition & static file router
│   │   ├── config.py            # Settings & Env vars
│   │   ├── database.py          # Async SQLModel engine setup
│   │   ├── models.py            # SQLModel tables (Player, Match, RatingHistory)
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── auth/session.py      # Signed HTTP-only session cookie auth
│   │   ├── services/elo.py      # Pure Elo engine & deterministic recalculation
│   │   └── api/                 # API routers (players, rankings, matches, admin)
│   ├── generate_openapi.py      # OpenAPI schema generator
│   ├── migrations/              # Alembic migration scripts
│   ├── tests/                   # Pytest unit & integration tests
│   └── seed.py                  # Database seed script
├── frontend/                    # React TypeScript SPA
│   ├── src/
│   │   ├── client/              # Auto-generated OpenAPI TypeScript client types
│   │   ├── components/          # Header, MobileNav, RatingCategorySelector, MatchCard
│   │   ├── pages/               # RankingsPage, MatchesPage, PlayerDetailPage, Admin pages
│   │   ├── api/client.ts        # Typed openapi-fetch client wrapper
│   │   └── utils/formatters.ts  # Vietnam timezone & date formatters
│   ├── package.json
│   └── pnpm-lock.yaml
├── Dockerfile                   # Multi-stage production build
├── docker-compose.yml           # Optional Postgres docker-compose
├── Makefile                     # Developer shortcuts
└── README.md
```
