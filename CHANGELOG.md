# Changelog

All notable changes to Slogr are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — v0.2.0 ⚡ IN PROGRESS

### In Progress
- [ ] SQLite full persistence (agents, tasks, logs survive restarts)
- [ ] Task history UI — scroll back through any mission
- [ ] Task replay — re-run historical tasks
- [ ] Per-agent token cost tracking
- [ ] Cost dashboard ($ per agent, per session, per day)
- [ ] Budget alerts — warn before overspending
- [ ] Session log export (JSON / CSV)

---

## [0.1.0] — 2026-03-12 ✅ RELEASED

### Added

**Core Platform**
- Real-time agent monitoring via Socket.io — events appear in milliseconds
- Node.js Express backend with in-memory state management
- SQLite-ready schema with in-memory fallback (Windows-safe)
- `.env` support via `dotenv` — API key never exposed to browser
- Anthropic API proxy at `/api/chat` — Claude-powered agent chat

**Python SDK**
- `Slogr` client class — connect any agent in 5 lines
- Task tracking: `start_task()`, `finish_task()`, `fail_task()`
- Agent events: `log()`, `thinking()`, `tool_call()`, `update_status()`
- `@slogr.on_command()` decorator for receiving dashboard commands
- Context manager: `with slogr.task("name"): ...`

**Framework Integrations**
- LangChain — `SlogrLangChain` BaseCallbackHandler
- CrewAI — `SlogrCrewAI` crew wrapper
- AutoGen — `SlogrAutoGen` agent patcher

**Dashboard**
- Star Wars game canvas — agents as starfighters, tasks as enemies
- Shield health system — decreases on task failure, color-coded
- Agent sidebar with fleet overview and status badges
- Direct agent chat panel per agent
- "TRANSMITTING..." indicator when agent is thinking
- Real-time score counter
- Demo mode with 3 pre-built agents (R-01, W-02, D-03)

**REST API**
- `GET /health` — server health check
- `GET /api/agents` — list all agents
- `GET /api/agents/:id` — agent details
- `GET /api/agents/:id/logs` — agent log history
- `GET /api/agents/:id/tasks` — task history
- `GET /api/tasks` — all tasks
- `GET /api/stats` — fleet statistics
- `POST /api/agents/:id/command` — send command to agent
- `POST /api/chat` — Anthropic Claude proxy

**Socket Events (Agent → Server)**
- `agent:register`, `agent:offline`, `agent:status`
- `task:start`, `task:finish`, `task:fail`
- `agent:log`, `agent:thinking`, `agent:tool_call`

**Socket Events (Server → Dashboard)**
- `state:agents`, `agent:registered`, `agent:offline`
- `task:start`, `task:finish`, `task:fail`
- `agent:log`, `agent:thinking`, `agent:status`
- `command:result`

**Web & Docs**
- Landing page at `slogr.xyz` with cursor ship, game demo preview
- Live demo at `slogr.xyz/demo` — fullscreen, no install needed
- Docs at `slogr.xyz/docs` — SDK reference, API, integrations
- Whitepaper at `slogr.xyz/whitepaper` (HTML + PDF)
- Roadmap at `slogr.xyz` with visual timeline
- Roadmap PDF at `slogr.xyz/roadmap.pdf`

---

## Roadmap

| Version | Theme | Status |
|---------|-------|--------|
| v0.1.0 | Foundation — Mission Control Online | ✅ Released |
| v0.2.0 | Persistence — Memory for the Fleet | ⚡ Building |
| v0.3.0 | Auth & Teams — Secure the Base | 📋 Planned |
| v0.4.0 | Plugins — Expand the Arsenal | 📋 Planned |
| v1.0.0 | Galaxy-Scale + $SLOG Token | 🌌 The Dream |

---

## Powered by Claude

Agent chat in Slogr is powered by [Anthropic's Claude API](https://anthropic.com).

Your API key stays in `.env` on your own server — never sent to any third party.

> **Coming in v1.0.0:** Hold $SLOG token → get a free Slogr API key powered by Claude. No Anthropic account needed.

---

> [slogr.xyz](https://slogr.xyz) · [@slogrwork](https://x.com/slogrwork) · [t.me/slogrAgent](https://t.me/slogrAgent)
