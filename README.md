# SYS.BLOG • Developer Digest & Homelab Hub

A high-performance technical engineering blog engine and Homelab observability hub self-hosted on bare-metal hardware and globally routed via Cloudflare Zero Trust.

- 🌐 **Live Production URL:** [https://anthoruiz.dev](https://anthoruiz.dev)
- 📖 **Comprehensive E2E Architecture Manual:** [`docs/ARCHITECTURE_E2E.md`](./docs/ARCHITECTURE_E2E.md)

---

## 🌟 Key Features

- **Daily Technical Digest (2 Columns):** High-density engineering feed featuring reading streak counter, view counts, bookmarks, and optimistic upvotes.
- **Homelab Hardware Telemetry:** Real-time host metrics (CPU %, RAM %, Temperature °C, and OS uptime) powered by `psutil` with role-aware UI display (`ADMIN` vs public).
- **Zero-Port-Forwarding Ingress:** Outbound encrypted QUIC tunnel (`cloudflared`) to Cloudflare Edge. Zero open residential router ports.
- **Multilingual Native i18n:** Built-in 4-language support without external bloat:
  - 🇪🇸 Español (`es`)
  - 🇺🇸 English (`en`)
  - 🇧🇷 Português (`pt`)
  - 🇫🇷 Français (`fr`)
- **Dark-Themed Mermaid.js:** Interactive code-to-diagram rendering (flowcharts, sequence diagrams, ER diagrams, class models) with dark palette matching the obsidian UI.
- **Google Gemini AI Integration:** Automatic technical reading time estimation and semantic tag suggestions based on post content.
- **Role-Based Access Control (RBAC):** Strict 3-tier hierarchy (`ADMIN`, `AUTHOR`, `READER`) with persistent top testing switcher.
- **Automated Database Backups:** Daily PostgreSQL snapshots with rolling 7-day retention and one-click admin download.
- **Security & Anti-DDoS:** Leaky-bucket Nginx rate limiting, SlowAPI per-IP limits, and anti-spam honeypot inputs on comments.

---

## 🏗️ System Architecture

```
                                  WAN (Public Internet)
                                            │
                                            ▼
                        ┌──────────────────────────────────────┐
                        │      Cloudflare Edge Anycast         │
                        │   SSL/TLS • WAF • DDoS Mitigation    │
                        │       https://anthoruiz.dev          │
                        └──────────────────┬───────────────────┘
                                           │
                         Encrypted Outbound QUIC Tunnel
                                           │
                                           ▼
             ┌────────────────────────────────────────────────────────────┐
             │       Homelab Host Node (Windows 11 + WSL2 Ubuntu)         │
             │                                                            │
             │   ┌────────────────────────────────────────────────────┐   │
             │   │       Docker Bridge Network (devblog_net)          │   │
             │   │                                                    │   │
             │   │   ┌────────────────────────────────────────────┐   │   │
             │   │   │ devblog_tunnel (cloudflare/cloudflared)    │   │   │
             │   │   └─────────────────────┬──────────────────────┘   │   │
             │   │                         │                          │   │
             │   │                         ▼                          │   │
             │   │   ┌────────────────────────────────────────────┐   │   │
             │   │   │ devblog_frontend (Nginx Alpine + React 18) │   │   │
             │   │   └──────────────┬─────────────────────────────┘   │   │
             │   │                  │ Proxy /api/ & /uploads/         │   │
             │   │                  ▼                                 │   │
             │   │   ┌────────────────────────────────────────────┐   │   │
             │   │   │ devblog_backend (FastAPI + SQLAlchemy)     │   │   │
             │   │   └──────────────┬─────────────────────────────┘   │   │
             │   │                  │ asyncpg connection pool         │   │
             │   │                  ▼                                 │   │
             │   │   ┌────────────────────────────────────────────┐   │   │
             │   │   │ devblog_postgres (PostgreSQL 16 Alpine)    │   │   │
             │   │   └────────────────────────────────────────────┘   │   │
             │   └────────────────────────────────────────────────────┘   │
             └────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (Local & Homelab)

### 1. Requirements
- Docker Engine & Docker Compose
- WSL2 (if running on Windows) or native Linux (Ubuntu/Debian)

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env and supply your credentials and tokens:
# - POSTGRES_PASSWORD
# - SECRET_KEY
# - GEMINI_API_KEY (optional, from https://aistudio.google.com/)
# - CLOUDFLARE_TUNNEL_TOKEN (from Cloudflare Zero Trust)
```

### 3. Launch Services
```bash
docker compose up -d
```

### 4. Endpoints & Access
- **Production Web:** [https://anthoruiz.dev](https://anthoruiz.dev)
- **Local Frontend:** [http://localhost:3000](http://localhost:3000)
- **API Documentation (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **System Latency Status:** [http://localhost:3000/#/status](http://localhost:3000/#/status)

---

## 📚 Technical Documentation

For the complete in-depth specification, schema contracts, sequence diagrams, and operational recovery playbooks, consult:
👉 **[E2E Technical Specification (docs/ARCHITECTURE_E2E.md)](./docs/ARCHITECTURE_E2E.md)**
