# SYS.BLOG • Developer Digest & Homelab Hub

A high-performance technical blog engine and daily digest system designed for self-hosting on homelab servers. Built with **React 18 + TypeScript**, **FastAPI + SQLAlchemy Async**, **PostgreSQL 16**, and **Docker**.

---

## 🌟 Key Features

- **Daily Digest Grid (2 Columns):** High-density technical feed with writing streak counter, reading time, upvotes, and view metrics.
- **Multilingual Support (i18n):** Native internationalization in 4 languages:
  - 🇪🇸 Español (`es`)
  - 🇺🇸 English (`en`)
  - 🇧🇷 Português (`pt`)
  - 🇫🇷 Français (`fr`)
- **Original Language Badges:** Visual flag indicator on each post card to denote the author's primary drafting language.
- **Production Observability & Centralized Logs:**
  - FastAPI ASGI latency tracking and HTTP request logger.
  - Rotating server logs (`/app/logs/server.log`).
  - React `ErrorBoundary` with client diagnostic screen and automatic crash reporting to `/api/v1/logs/client`.
  - Live log viewer endpoint at `GET /api/v1/logs/recent`.
- **Media & Cover Images:** High-resolution post banners with smooth hover zoom animations and a local image uploader (`POST /api/v1/posts/upload-image`).
- **Secure Author Authentication:** JWT token-based authentication with bcrypt password hashing.

---

## 🏗️ Architecture

```
                      ┌──────────────────────┐
                      │    Client Browser    │
                      └──────────┬───────────┘
                                 │ :3000
                                 ▼
                     ┌────────────────────────┐
                     │   Nginx Reverse Proxy  │
                     └────┬──────────────┬────┘
                          │              │
           Static Files   │              │ /api/ & /uploads/
                          ▼              ▼
                     ┌─────────┐   ┌───────────────┐
                     │  React  │   │ FastAPI (App) │
                     │   18    │   └───────┬───────┘
                     └─────────┘           │ :5432
                                           ▼
                                   ┌───────────────┐
                                   │ PostgreSQL 16 │
                                   └───────────────┘
```

---

## 🚀 Quick Start (Docker)

### 1. Clone the Repository
```bash
git clone https://github.com/<your-username>/devblog.git
cd devblog
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Launch with Docker Compose
```bash
docker compose up -d --build
```

### 4. Access the Application
- **Frontend App:** [http://localhost:3000](http://localhost:3000)
- **API Documentation (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **System Logs Viewer:** [http://localhost:3000/api/v1/logs/recent](http://localhost:3000/api/v1/logs/recent)

---

## 📝 Conventional Commits Reference
This repository follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:
- `chore(setup)`: Tooling, containerization, and configuration.
- `feat(backend)`: FastAPI routes, business logic, and schemas.
- `feat(frontend)`: React UI components, styling, and hooks.
- `feat(i18n)`: Translations and internationalization dictionaries.
- `feat(observability)`: Logging middleware and error boundaries.
