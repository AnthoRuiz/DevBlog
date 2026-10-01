# Anthony Ruiz — Blog

> I build it at home before I trust it at scale.

The personal blog of Anthony Ruiz: a self-hosted blog engine and Homelab observability hub, running on bare-metal hardware and published through a Cloudflare Tunnel — with zero open router ports.

- 🌐 **Production:** [https://blog.anthoruiz.dev](https://blog.anthoruiz.dev)
- 📖 **Technical sheet / handoff:** [`docs/ARCHITECTURE_E2E.md`](./docs/ARCHITECTURE_E2E.md) — start with §0 to resume development (current state, conventions, workflow, decisions, known issues and next steps)

**Stack:** React 18 + TypeScript + Vite · FastAPI + SQLAlchemy (async) · PostgreSQL 16 · Nginx · Docker Compose · Cloudflare Tunnel · Claude & Gemini (AI, with failover)

---

## 🌟 Features

- **Magazine home:** a lead story with the latest posts beside it, one block per section (lead post + two more), *Browse by tag*, and the full post grid below.
- **Technical digest feed:** two-column post grid with reading time, views, upvotes and bookmarks, paginated 12 posts at a time with **Load more**.
- **Markdown editor:** Word-style toolbar, live preview, syntax highlighting (highlight.js), dark-themed **Mermaid.js** diagrams, and one-click image upload that embeds `![alt](/uploads/...)` in the post body.
- **Multilingual UI (i18n):** 🇪🇸 Español (`es`) · 🇺🇸 English (`en`) · 🇧🇷 Português (`pt`) · 🇫🇷 Français (`fr`), plus an original-language badge on every post.
- **AI with failover (Claude + Gemini):** post translation, tag suggestions, reading-time estimates and tag-section validation. Providers are tried in order and the next one takes over if one fails. Without any provider, translation is disabled (never faked) and the other features use clearly labelled keyword/heuristic fallbacks.
- **Sections:** Tech & Coding, AI, Interviews & Career, Mental Health and Gaming — each with its own color and icon. The home page filters by section, and every post and tag belongs to one.
- **AI tag validation:** new tags are checked in real time against the post's section (e.g. "WoW" can only be created under Gaming) using the AI providers, with a keyword fallback when none is available.
- **Starter tags:** 19 tags seeded on an empty database, each assigned to its section.
- **Two roles and a review queue:** anonymous visitors are the readers; every account is a `CREATOR` and `ADMIN` runs the site. Creators' posts wait in the admin's review queue (draft → in review → published or rejected with a reason) unless the admin marks the account as trusted. Admin posts publish directly. Creators get daily limits on AI calls (30) and uploads (20). The admin sees pending reviews as a badge on the admin panel button and as `(N)` in the browser tab title, refreshed every minute.
- **Admin panel:** user and role management, backups (database + uploaded media, daily snapshots, 7-day rotation, one-click create/download/delete) and media storage usage with orphan cleanup.
- **RSS and link previews:** `/feed.xml` for the whole blog and `/<section>/feed.xml` per section (latest 20 posts), with auto-discovery links; shared post links show a proper card on LinkedIn, X, Slack and others.
- **Section personality:** each section has a theme (Mental Health uses a calm one), an admin-editable footer below its posts (the Mental Health one is a personal-experience disclaimer with findahelpline.com) and optional per-post content notices.
- **Series / learning paths:** creators group posts of one section into ordered series; posts show "Part 3 of 6" with previous/next links, and the series page tracks reading progress in the browser.
- **Featured posts:** the admin stars up to two published posts per section; they lead the section page in a *Featured* band.
- **Full-text search:** PostgreSQL full-text search over title, summary and content (prefix matching while typing, ranked by relevance), filterable by section, with highlighted matches at `/search`.
- **Real URLs:** every page has its own address (`/tech`, `/tags/docker`, `/posts/<slug>`, `/bookmarks`, `/search`) with working back/forward and shareable links.
- **Personal brand:** name, tagline, `>ar_` monogram, colors and fonts come from the personal brand book; the site identity is served by `GET /site` (`SITE_*` settings) so the UI, feeds and previews share it.
- **Homelab telemetry (admin only):** live CPU, RAM, temperature, disk and uptime via `psutil`, and per-service latency at `/admin/status`.
- **Local media storage:** JPG, PNG and WEBP up to 5 MB and animated GIFs up to 15 MB, validated by file content and stored on the server (Docker volume) — no external object storage needed. Unused files are cleaned up automatically.
- **Observability:** rotating server logs and a React `ErrorBoundary` that reports client crashes to the backend.

---

## 🔐 Security

| Area | Protection |
|------|------------|
| Authentication | JWT (HS256) with bcrypt hashing. `SECRET_KEY` is required; in production the backend refuses to start with a published default or a key under 32 characters |
| Authorization | Users cannot change their own role (the test switcher is off unless `ALLOW_ROLE_SELF_SWITCH=True`); admin-only endpoints for logs, telemetry, backups and users |
| Initial admin | Created from `ADMIN_EMAIL` / `ADMIN_PASSWORD`; if no password is set, a random one is printed once to `docker logs`. No hardcoded credentials anywhere |
| XSS | Markdown links only allow `http(s)`, `mailto` and relative URLs, and quotes are escaped; Mermaid runs with `securityLevel: 'strict'` |
| Uploads | File type detected from magic bytes (SVG rejected), 5 MB cap (15 MB for GIF), served with `nosniff` and a sandboxing CSP; embedded images only accept `http(s)` or same-origin URLs |
| Google sign-in (API) | ID tokens must match `GOOGLE_CLIENT_ID` (`aud`) and carry a verified email; the endpoint is disabled while no client ID is configured |
| Rate limiting | Per-visitor limits in Nginx (real IP restored from `CF-Connecting-IP`) and SlowAPI on authentication, comment/interaction endpoints and client logs |
| Network | Only the Cloudflare Tunnel is public. Postgres, the backend and the frontend listen on `127.0.0.1` only |
| Headers | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`; Nginx version hidden; OpenAPI docs disabled in production |
| Secrets | Everything comes from `.env` (git-ignored). Compose aborts if a required value is missing — there are no insecure fallbacks |

---

## 🏗️ Architecture

```
                         Internet
                            │
                            ▼
          ┌───────────────────────────────────┐
          │   Cloudflare Edge (TLS, WAF,      │
          │   DDoS) · blog.anthoruiz.dev      │
          └─────────────────┬─────────────────┘
                            │ outbound encrypted tunnel (no open ports)
          ┌─────────────────▼───────────────────────────────────┐
          │ Homelab host · Windows 11 + WSL2 Ubuntu · Docker     │
          │                                                      │
          │   devblog_tunnel    (cloudflared)                    │
          │         │                                            │
          │         ▼                                            │
          │   devblog_frontend  (Nginx + React build)  127.0.0.1:3000
          │         │  /api/ · /uploads/                         │
          │         ▼                                            │
          │   devblog_backend   (FastAPI / Uvicorn)    127.0.0.1:8000
          │         │  asyncpg                                   │
          │         ▼                                            │
          │   devblog_postgres  (PostgreSQL 16)        127.0.0.1:5432
          └──────────────────────────────────────────────────────┘
```

### Environments

Production and development are fully separate Docker Compose projects, each with its own database and volumes.

| | Production | Development |
|---|---|---|
| Compose file | `docker-compose.yml` | `docker-compose.dev.yml` (project `devblog-dev`) |
| Config | `.env` | `.env.dev` |
| Web | https://blog.anthoruiz.dev | http://localhost:5173 (`npm run dev`) |
| API | `127.0.0.1:8000` | `127.0.0.1:8001` (live reload, `/docs` enabled) |
| Database | `devblog` on `127.0.0.1:5432` | `devblog_dev` on `127.0.0.1:5433` |
| Seed data | Starter tags + admin | Starter tags + admin + 3 demo posts |
| Cloudflare Tunnel | Yes | No |
| Apply changes | `./deploy.sh` | Automatic on save |

---

## 🚀 Production Setup

### Requirements
- Docker Engine with Docker Compose v2, on native Linux or **WSL2 Ubuntu** (run all Docker commands from WSL, not from Git Bash or `cmd`)
- A Cloudflare Tunnel token (Cloudflare Zero Trust → Networks → Tunnels)

### 1. Configure
```bash
cp .env.example .env
```
Fill in at least the required values (see [Configuration](#-configuration)):
```bash
openssl rand -hex 32   # use as SECRET_KEY
```

### 2. Deploy
```bash
./deploy.sh
```
The script checks the environment and `.env`, warns about uncommitted changes, runs `docker compose up -d --build`, and then verifies the containers, backend health, the public site and that admin endpoints still return `401` without a session.

```bash
./deploy.sh backend    # deploy one service only (or: frontend)
./deploy.sh --check    # run all checks without deploying
```

### 3. First sign-in
Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. If you left `ADMIN_PASSWORD` empty, the generated password is printed once:
```bash
docker logs devblog_backend 2>&1 | grep "\[Seed\]"
```

---

## 🧑‍💻 Development

### 1. Configure (first time)
```bash
cp .env.dev.example .env.dev
# Set POSTGRES_PASSWORD, SECRET_KEY and ADMIN_PASSWORD (use different values than production)
```

### 2. Start the backend and database (WSL)
```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d --build
curl http://localhost:8001/health
```
The backend source is mounted into the container, so saving a `.py` file reloads it.

### 3. Start the frontend
```bash
cd frontend
npm install     # first time or when package.json changes
npm run dev     # http://localhost:5173
```
Vite proxies `/api` and `/uploads` to the **development** backend on port 8001 (override with `VITE_API_PROXY_TARGET`).

Sign in as `admin@devblog.local` with the `ADMIN_PASSWORD` from `.env.dev`.

### Useful commands
```bash
docker logs -f devblog_dev_backend                                        # backend logs
docker compose -f docker-compose.dev.yml --env-file .env.dev down         # stop (keeps data)
docker compose -f docker-compose.dev.yml --env-file .env.dev down -v      # wipe the dev database
```

To test permissions with the role switcher, set `ALLOW_ROLE_SELF_SWITCH=True` in `.env.dev` and run the frontend with `VITE_ENABLE_ROLE_TESTING=true`.

---

## ⚙️ Configuration

All settings live in `.env` (production) or `.env.dev` (development). Templates: [`.env.example`](./.env.example), [`.env.dev.example`](./.env.dev.example).

| Variable | Required | Description |
|----------|:--------:|-------------|
| `POSTGRES_USER` / `POSTGRES_DB` | ✅ | Database user and name |
| `POSTGRES_PASSWORD` | ✅ | Database password (special characters are supported) |
| `POSTGRES_PORT` | | Host port for Postgres (`5432` prod, `5433` dev) |
| `SECRET_KEY` | ✅ | JWT signing key, ≥ 32 characters (`openssl rand -hex 32`) |
| `ENVIRONMENT` | ✅ | `production` or `development` |
| `DEBUG` | | SQL echo and debug output (default `False`) |
| `CLOUDFLARE_TUNNEL_TOKEN` | ✅ prod | Cloudflare Tunnel token |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | | Initial admin, created only if no admin exists |
| `ALLOW_ROLE_SELF_SWITCH` | | Test role switcher — never enable in production (default `False`) |
| `SEED_DEMO_POSTS` | | Seed demo posts into an empty database (default `False`; `True` in dev) |
| `ANTHROPIC_API_KEY` / `CLAUDE_MODEL` | | Claude (default model `claude-opus-5-5`) for the AI features |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | | Google Gemini for the AI features; `GEMINI_MODEL` accepts a comma-separated list tried in order (default `gemini-flash-latest,gemini-flash-lite-latest`) |
| `LLM_PROVIDER_ORDER` | | Failover order of the configured providers (default `claude,gemini`) |

> ⚠️ `POSTGRES_PASSWORD` is only applied when a database volume is first created. To change it later, run `ALTER USER` in Postgres **and** update `.env`.

---

## 🛠️ Operations

### Logs
```bash
docker logs -f devblog_backend
docker logs --tail 50 devblog_tunnel
```
Admins can also read the latest server log lines at `GET /api/v1/logs/recent`.

### Backups
- Every backup is a pair with the same timestamp: `backup_devblog_<ts>.sql.gz` (database, `pg_dump`) and `backup_devblog_<ts>.media.tar.gz` (all uploaded media).
- Automatic daily backups keep the 7 most recent pairs; admins can also create, download and delete them from the admin panel.
- Stored on the host in `backend/backups/` (git-ignored).

Restore the database (the dump includes `DROP ... IF EXISTS`, so it replaces the current data):
```bash
set -a; source <(grep -E '^POSTGRES_(USER|DB)=' .env); set +a
gunzip -c backend/backups/<file>.sql.gz | docker exec -i devblog_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

Restore uploaded media (extracts the files back into the uploads volume):
```bash
docker exec -i devblog_backend tar xzf - -C /app/uploads < backend/backups/<file>.media.tar.gz
```

### Media cleanup
An upload is considered orphaned when no post (published or draft) references it in its cover or content and it is older than 24 hours. Orphans are deleted daily right after the backup — so they stay recoverable from the media archive for 7 days — or on demand from the admin panel (**Clean up unused media**).

### Database migrations
Schema changes are managed with Alembic (`backend/migrations/`) and applied automatically when the backend starts, in both environments. To create one after changing the models:
```bash
docker exec -w /app devblog_dev_backend alembic revision --autogenerate -m "describe the change"
# review the generated file in backend/migrations/versions/, then restart the dev backend
```

### Database shell
```bash
docker exec -it devblog_postgres psql -U devblog_user -d devblog          # production
docker exec -it devblog_dev_postgres psql -U devblog_dev -d devblog_dev   # development
```

---

## 📁 Project Structure

```
backend/            FastAPI app (api/v1 routes, core config & security, models, schemas, services)
frontend/           React + TypeScript app, Nginx config and Dockerfile
docs/               Architecture manual and feature specs
docker-compose.yml      Production stack
docker-compose.dev.yml  Development stack
deploy.sh           Production deployment with pre- and post-deploy checks
```

---

## 📝 Conventions

- **English only:** code, comments, messages, commits and docs are written in English. User-facing text goes through the i18n dictionaries in `frontend/src/i18n`.
- **Conventional Commits:** `feat`, `fix`, `refactor`, `docs`, `chore`, with scopes such as `auth`, `backend`, `frontend`, `i18n`, `infra`, `config`, `deploy`, `env`, `seed`, `security`, `xss`, `uploads`, `nginx`, `logs`, `stats`.
- **Line endings:** `.gitattributes` keeps shell scripts as LF so they run on WSL.
