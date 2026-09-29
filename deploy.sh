#!/usr/bin/env bash
# DevBlog production deployment.
#
# Usage (from WSL Ubuntu, in the project folder):
#   ./deploy.sh                 # rebuild and deploy all services
#   ./deploy.sh backend         # backend only (or: frontend)
#   ./deploy.sh --check         # run preflight and health checks only, no deploy
#   ./deploy.sh --yes           # do not prompt when there are uncommitted changes
#
# Optional variables: PUBLIC_URL (default https://blog.anthoruiz.dev)
set -euo pipefail

cd "$(dirname "$0")"

PUBLIC_URL="${PUBLIC_URL:-https://blog.anthoruiz.dev}"
LOCAL_API="http://localhost:8000"
CHECK_ONLY=false
ASSUME_YES=false
SERVICES=()

for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=true ;;
    --yes|-y) ASSUME_YES=true ;;
    -h|--help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) echo "Unknown option: $arg" >&2; exit 2 ;;
    *) SERVICES+=("$arg") ;;
  esac
done

if [ -t 1 ]; then
  RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; BOLD=$'\e[1m'; RESET=$'\e[0m'
else
  RED=""; GREEN=""; YELLOW=""; BOLD=""; RESET=""
fi
ok()   { echo "  ${GREEN}✔${RESET} $*"; }
warn() { echo "  ${YELLOW}⚠${RESET} $*"; }
fail() { echo "  ${RED}✘${RESET} $*" >&2; exit 1; }
step() { echo; echo "${BOLD}▸ $*${RESET}"; }

# Read a key from .env without `source` (values may contain $, quotes, =, etc.)
env_value() {
  grep -m1 "^$1=" .env 2>/dev/null | cut -d= -f2- | tr -d '\r' || true
}

# ── 1. Environment ────────────────────────────────────────────────────────────
step "Environment"
case "$(uname -s)" in
  Linux) ok "Linux/WSL" ;;
  *) fail "Run this script from WSL Ubuntu (wsl -d Ubuntu), not from Git Bash or cmd." ;;
esac
docker info >/dev/null 2>&1 || fail "Cannot connect to Docker. Is the WSL Docker Engine running?"
ok "Docker available"
if [ -f docker-compose.override.yml ]; then
  warn "docker-compose.override.yml exists: Docker Compose applies it automatically."
fi

# ── 2. Configuration (.env) ───────────────────────────────────────────────────
step "Configuration (.env)"
[ -f .env ] || fail ".env not found. Copy .env.example and fill it in."

for key in SECRET_KEY CLOUDFLARE_TUNNEL_TOKEN POSTGRES_PASSWORD; do
  [ -n "$(env_value "$key")" ] || fail "$key is empty or missing in .env"
done
secret="$(env_value SECRET_KEY)"
[ "${#secret}" -ge 32 ] || fail "SECRET_KEY is shorter than 32 characters (generate one with: openssl rand -hex 32)"
ok "SECRET_KEY, CLOUDFLARE_TUNNEL_TOKEN and POSTGRES_PASSWORD are set"

[ "$(env_value ENVIRONMENT)" = "production" ] || fail "ENVIRONMENT must be 'production' in .env"
ok "ENVIRONMENT=production"

case "$(env_value ALLOW_ROLE_SELF_SWITCH | tr '[:upper:]' '[:lower:]')" in
  true|1|yes) fail "ALLOW_ROLE_SELF_SWITCH is enabled: it lets any user become ADMIN." ;;
esac
ok "Test role switcher disabled"

# Compose aborts when a required variable is missing (${VAR:?...}) and warns about other unset ones
if ! compose_out="$(docker compose config -q 2>&1)"; then
  fail "docker compose config failed: $compose_out"
fi
unset_vars="$(echo "$compose_out" | grep -o 'The "[A-Z_]*" variable is not set' || true)"
[ -z "$unset_vars" ] || fail "Docker Compose cannot resolve variables: $(echo "$unset_vars" | tr '\n' ' ')"
ok "docker-compose.yml is valid and all variables are set"

# ── 3. Git state ──────────────────────────────────────────────────────────────
step "Code to deploy"
if git rev-parse --git-dir >/dev/null 2>&1; then
  echo "  Branch: $(git rev-parse --abbrev-ref HEAD) · Commit: $(git log -1 --format='%h %s')"
  # --ignore-cr-at-eol: on Windows many files differ only in line endings (CRLF)
  changed="$(git diff --name-only HEAD -- backend frontend docker-compose.yml 2>/dev/null \
    | while read -r f; do [ -z "$(git diff --ignore-cr-at-eol HEAD -- "$f")" ] || echo "$f"; done)"
  untracked="$(git ls-files --others --exclude-standard -- backend frontend)"
  if [ -n "$changed$untracked" ]; then
    warn "Uncommitted changes that WILL ALSO be deployed:"
    printf '%s\n%s\n' "$changed" "$untracked" | sed '/^$/d; s/^/      /'
    if ! $CHECK_ONLY && ! $ASSUME_YES; then
      read -r -p "  Deploy anyway? [y/N] " answer
      [[ "$answer" =~ ^[yY]$ ]] || fail "Deployment cancelled."
    fi
  else
    ok "No pending changes in backend/, frontend/ or docker-compose.yml"
  fi
fi

# ── 4. Deploy ─────────────────────────────────────────────────────────────────
if $CHECK_ONLY; then
  step "--check mode: skipping deployment"
else
  step "Deploying ${SERVICES[*]:-all services}"
  docker compose up -d --build --remove-orphans "${SERVICES[@]}"
fi

# ── 5. Verification ───────────────────────────────────────────────────────────
step "Verification"
show_logs_and_fail() {
  echo; echo "  Latest backend log lines:"; docker logs --tail 25 devblog_backend 2>&1 | sed 's/^/      /'
  fail "$1"
}

for c in devblog_postgres devblog_backend devblog_frontend devblog_tunnel; do
  state="$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo missing)"
  [ "$state" = "running" ] || show_logs_and_fail "Container $c is not running (state: $state)"
done
ok "All 4 containers are running"

for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$LOCAL_API/health" || true)"
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] || show_logs_and_fail "Backend is not responding at $LOCAL_API/health (HTTP $code)"
ok "Backend responds (/health)"

if docker inspect -f '{{join .Config.Cmd " "}}' devblog_backend | grep -q -- '--reload'; then
  warn "Backend is running with --reload (development mode). Production must not use docker-compose.dev.yml."
else
  ok "Backend in production mode (no --reload)"
fi

code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC_URL/" || true)"
[ "$code" = "200" ] || fail "Public site $PUBLIC_URL is not responding (HTTP $code). Check: docker logs devblog_tunnel"
ok "Public site responds ($PUBLIC_URL)"

code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC_URL/api/v1/posts" || true)"
[ "$code" = "200" ] || fail "Public API is not responding (HTTP $code)"
ok "Public API responds"

# Security regressions: these endpoints must never be reachable without a session
for path in /api/v1/logs/recent /api/v1/stats/telemetry /api/v1/stats/status; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC_URL$path" || true)"
  [ "$code" = "401" ] || fail "$path returned HTTP $code without a session (expected 401)"
done
ok "Admin endpoints protected (401 without a session)"

if $CHECK_ONLY; then
  echo; echo "${GREEN}${BOLD}All checks passed.${RESET}"
else
  echo; echo "${GREEN}${BOLD}Deployment verified.${RESET}"
fi
