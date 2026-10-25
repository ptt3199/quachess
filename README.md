# ♞ Quachess

**The office chess club in your pocket.**

Quachess is a tiny web app for colleagues who play chess over the board — at the office, over coffee, whenever two people and a board meet. The game happens in real life; Quachess takes care of everything after the last move: recording the result, updating the ratings, and keeping the friendly rivalry alive.

Built for a small club of about ten players who get together a couple of evenings a week. Everything in the app is designed around one number: **recording a finished game takes under 10 seconds.**

---

## Why it exists

Casual office chess dies in one specific way: nobody remembers to write results down. Leagues feel heavy, chess platforms feel impersonal, and a spreadsheet is a chore. Quachess makes the "paperwork" so light that it never gets skipped — and gives back a seasonal leaderboard, rivalries, and push notifications so there's always a reason to come back.

## What's inside

### ⚔️ Record a result in seconds
Tap the big **Record** button, pick your opponent (recent opponents are one tap away), press **Win / Draw / Loss** — done. Your rating change appears instantly, e.g. *+14*. Mis-tapped the wrong result? Any participant can undo it within 24 hours and ratings roll back automatically.

### 🏆 Seasonal leaderboards
Each quarter is a fresh season — everyone starts at 1200, so a new joiner can top the chart within weeks instead of chasing a year of history. Prefer the long game? Switch to the all-time view. Three independent Elo ladders (Rapid, Blitz, Classical), rank medals for the podium, and skill tiers from **Wood** to **Master**.

### 🤝 Challenges & head-to-head
Send a challenge from any player's profile (with color choice), accept it from your inbox, and the match appears on your home screen waiting for a result. Every profile has a head-to-head record — because "I'm 5–2 against you" is half the fun of office chess.

### 🔔 Push notifications
Get a notification when someone challenges you, accepts your challenge, or records a game with your name on it. Installable as a PWA (Add to Home Screen) and works offline — recent results and rankings are readable even in the elevator.

### 🔐 Sign in the lazy way
One tap with your Google account — no passwords to invent or forget. The club admin is simply a configured Gmail address. Classic username/password sign-in also works as a fallback, and every player can set a display name (nicknames encouraged).

## How a game flows

1. **Meet** — two players, a physical board, a real clock.
2. **Play** — Rapid, Blitz, or Classical; house rules welcome.
3. **Record** — the winner (or either player) opens Quachess and logs the result in four taps.
4. **Talk trash** — the feed, the leaderboard shift, and the head-to-head record do the rest.

## Under the hood

A deliberately small stack, sized for a ten-person club:

- **Backend**: FastAPI + SQLModel (async), PostgreSQL in production / SQLite in development, Redis-backed response caching, Alembic migrations, deterministic full-history Elo recalculation after every change.
- **Frontend**: React + TypeScript + Tailwind CSS, TanStack Query, typed API client generated from the backend's OpenAPI schema, Workbox service worker for offline + Web Push.
- **Deploy**: FastAPI Cloud, auto-deployed from `main` via GitHub Actions.

## Project layout

```
├── backend/    FastAPI app (API, Elo engine, seasons, push)
├── frontend/   React SPA (also built into backend/static for deploys)
└── .github/    CI workflow: build + deploy on push to main
```

---

*Named after the office it was born in. Knights before bishops.* ♞
