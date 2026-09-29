#!/usr/bin/env bash
# Despliegue a producción de DevBlog.
#
# Uso (desde WSL Ubuntu, en la carpeta del proyecto):
#   ./deploy.sh                 # reconstruye y despliega todos los servicios
#   ./deploy.sh backend         # solo el backend (o: frontend)
#   ./deploy.sh --check         # solo comprobaciones previas y de salud, sin desplegar
#   ./deploy.sh --yes           # no preguntar si hay cambios sin commitear
#
# Variables opcionales: PUBLIC_URL (por defecto https://blog.anthoruiz.dev)
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
    -*) echo "Opción desconocida: $arg" >&2; exit 2 ;;
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

# Lee una clave del .env sin hacer `source` (los valores pueden tener $, comillas, =, etc.)
env_value() {
  grep -m1 "^$1=" .env 2>/dev/null | cut -d= -f2- | tr -d '\r' || true
}

# ── 1. Entorno ────────────────────────────────────────────────────────────────
step "Entorno"
case "$(uname -s)" in
  Linux) ok "Linux/WSL" ;;
  *) fail "Ejecuta este script desde WSL Ubuntu (wsl -d Ubuntu), no desde Git Bash ni cmd." ;;
esac
docker info >/dev/null 2>&1 || fail "No se puede conectar con Docker. ¿Está corriendo el Docker Engine de WSL?"
ok "Docker disponible"
if [ -f docker-compose.override.yml ]; then
  warn "Existe docker-compose.override.yml: Docker Compose lo aplica automáticamente."
fi

# ── 2. Configuración (.env) ───────────────────────────────────────────────────
step "Configuración (.env)"
[ -f .env ] || fail "No existe .env. Copia .env.example y complétalo."

for key in SECRET_KEY CLOUDFLARE_TUNNEL_TOKEN POSTGRES_PASSWORD; do
  [ -n "$(env_value "$key")" ] || fail "$key está vacía o no existe en .env"
done
secret="$(env_value SECRET_KEY)"
[ "${#secret}" -ge 32 ] || fail "SECRET_KEY tiene menos de 32 caracteres (genera una con: openssl rand -hex 32)"
ok "SECRET_KEY, CLOUDFLARE_TUNNEL_TOKEN y POSTGRES_PASSWORD definidas"

[ "$(env_value ENVIRONMENT)" = "production" ] || fail "ENVIRONMENT debe ser 'production' en .env"
ok "ENVIRONMENT=production"

case "$(env_value ALLOW_ROLE_SELF_SWITCH | tr '[:upper:]' '[:lower:]')" in
  true|1|yes) fail "ALLOW_ROLE_SELF_SWITCH está activado: permite que cualquier usuario se haga ADMIN." ;;
esac
ok "Selector de roles de prueba desactivado"

# Detecta variables que compose no encuentra (se sustituirían por valores vacíos o inseguros)
unset_vars="$(docker compose config -q 2>&1 | grep -o 'The "[A-Z_]*" variable is not set' || true)"
[ -z "$unset_vars" ] || fail "Docker Compose no encuentra variables: $(echo "$unset_vars" | tr '\n' ' ')"
ok "docker-compose.yml válido"

# ── 3. Estado de git ──────────────────────────────────────────────────────────
step "Código a desplegar"
if git rev-parse --git-dir >/dev/null 2>&1; then
  echo "  Rama: $(git rev-parse --abbrev-ref HEAD) · Commit: $(git log -1 --format='%h %s')"
  # --ignore-cr-at-eol: en Windows muchos archivos solo difieren en saltos de línea (CRLF)
  changed="$(git diff --name-only HEAD -- backend frontend docker-compose.yml 2>/dev/null \
    | while read -r f; do [ -z "$(git diff --ignore-cr-at-eol HEAD -- "$f")" ] || echo "$f"; done)"
  untracked="$(git ls-files --others --exclude-standard -- backend frontend)"
  if [ -n "$changed$untracked" ]; then
    warn "Hay cambios sin commitear que TAMBIÉN se desplegarán:"
    printf '%s\n%s\n' "$changed" "$untracked" | sed '/^$/d; s/^/      /'
    if ! $CHECK_ONLY && ! $ASSUME_YES; then
      read -r -p "  ¿Desplegar de todos modos? [s/N] " answer
      [[ "$answer" =~ ^[sSyY]$ ]] || fail "Despliegue cancelado."
    fi
  else
    ok "Sin cambios pendientes en backend/, frontend/ ni docker-compose.yml"
  fi
fi

# ── 4. Despliegue ─────────────────────────────────────────────────────────────
if $CHECK_ONLY; then
  step "Modo --check: se omite el despliegue"
else
  step "Desplegando ${SERVICES[*]:-todos los servicios}"
  docker compose up -d --build --remove-orphans "${SERVICES[@]}"
fi

# ── 5. Verificación ───────────────────────────────────────────────────────────
step "Verificación"
show_logs_and_fail() {
  echo; echo "  Últimas líneas del backend:"; docker logs --tail 25 devblog_backend 2>&1 | sed 's/^/      /'
  fail "$1"
}

for c in devblog_postgres devblog_backend devblog_frontend devblog_tunnel; do
  state="$(docker inspect -f '{{.State.Status}}' "$c" 2>/dev/null || echo missing)"
  [ "$state" = "running" ] || show_logs_and_fail "El contenedor $c no está corriendo (estado: $state)"
done
ok "Los 4 contenedores están corriendo"

for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$LOCAL_API/health" || true)"
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] || show_logs_and_fail "El backend no responde en $LOCAL_API/health (HTTP $code)"
ok "Backend responde (/health)"

if docker inspect -f '{{join .Config.Cmd " "}}' devblog_backend | grep -q -- '--reload'; then
  warn "El backend corre con --reload (modo desarrollo). Despliega sin -f docker-compose.dev.yml."
else
  ok "Backend en modo producción (sin --reload)"
fi

code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC_URL/" || true)"
[ "$code" = "200" ] || fail "El sitio público $PUBLIC_URL no responde (HTTP $code). Revisa: docker logs devblog_tunnel"
ok "Sitio público responde ($PUBLIC_URL)"

code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC_URL/api/v1/posts" || true)"
[ "$code" = "200" ] || fail "La API pública no responde (HTTP $code)"
ok "API pública responde"

# Regresiones de seguridad: estos endpoints nunca deben ser accesibles sin sesión
for path in /api/v1/logs/recent /api/v1/stats/telemetry /api/v1/stats/status; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$PUBLIC_URL$path" || true)"
  [ "$code" = "401" ] || fail "$path devolvió HTTP $code sin sesión (se esperaba 401)"
done
ok "Endpoints de admin protegidos (401 sin sesión)"

if $CHECK_ONLY; then
  echo; echo "${GREEN}${BOLD}Comprobaciones superadas.${RESET}"
else
  echo; echo "${GREEN}${BOLD}Despliegue verificado.${RESET}"
fi
