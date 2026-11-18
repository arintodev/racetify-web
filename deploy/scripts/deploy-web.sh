#!/usr/bin/env bash
# Deploy the public site and organizer app into the existing racetify-api_edge network.
# Safe to run manually from the deploy directory:
#   bash scripts/deploy-web.sh sha-abc123def456 ghcr.io/my-org
set -euo pipefail

TAG="${1:-${TAG:-}}"
IMAGE_PREFIX="${2:-${IMAGE_PREFIX:-}}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.web.yml}"

cd "$(dirname "${BASH_SOURCE[0]}")/.."
compose=(docker compose -f "${COMPOSE_FILE}")

if [[ -z "${TAG}" || ! "${TAG}" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]]; then
  echo "usage: $0 <tag> [image-prefix]" >&2
  exit 1
fi
export TAG
if [[ -n "${IMAGE_PREFIX}" ]]; then
  export IMAGE_PREFIX
fi

for file in "${COMPOSE_FILE}" .env.web .env.app; do
  [[ -f "${file}" ]] || {
    echo "missing ${file} in $(pwd); copy the matching env.*.example on first deploy." >&2
    exit 1
  }
done

command -v docker >/dev/null 2>&1 || {
  echo "docker is required." >&2
  exit 1
}
command -v curl >/dev/null 2>&1 || {
  echo "curl is required." >&2
  exit 1
}

echo "==> Preflight"
docker network inspect racetify-api_edge >/dev/null 2>&1 || {
  echo "network racetify-api_edge not found; deploy racetify-api first." >&2
  exit 1
}
curl -fsS --max-time 5 --retry 10 --retry-delay 3 --retry-all-errors \
  http://127.0.0.1:8080/healthz >/dev/null || {
  echo "the API is not healthy; refusing to deploy the frontends." >&2
  exit 1
}
"${compose[@]}" config -q

previous_image() {
  local service="$1" container
  container="$("${compose[@]}" ps -aq "${service}" 2>/dev/null | awk 'NR == 1' || true)"
  if [[ -n "${container}" ]]; then
    docker inspect --format '{{.Config.Image}}' "${container}" 2>/dev/null || true
  fi
}

prev_web_image="$(previous_image web)"
prev_app_image="$(previous_image app)"

rollback() {
  echo "Rolling back to the previous images ..." >&2
  local pair service image tag
  for pair in "web:${prev_web_image}" "app:${prev_app_image}"; do
    service="${pair%%:*}"
    image="${pair#*:}"
    [[ -n "${image}" ]] || continue
    tag="${image##*:}"
    TAG="${tag}" "${compose[@]}" up -d --no-deps --wait --wait-timeout 180 "${service}" || true
  done
}

echo "==> Pulling web and app images (${TAG})"
if ! "${compose[@]}" pull web app; then
  echo "Pull failed; confirm the server is logged in to GHCR." >&2
  rollback
  exit 1
fi

echo "==> Starting web and app"
if ! "${compose[@]}" up -d --wait --wait-timeout 180 web app; then
  rollback
  exit 1
fi

healthy() {
  local service container
  for service in web app; do
    container="$("${compose[@]}" ps -q "${service}")"
    [[ -n "${container}" ]] || return 1
    docker exec "${container}" node -e \
      "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
      || return 1
    # Proves the shared edge network can reach the API service.
    docker exec "${container}" node -e \
      "fetch('http://api:8080/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
      || return 1
  done
}

echo "==> Checking container health and API reachability"
if ! healthy; then
  rollback
  exit 1
fi

echo "Web deployment complete: ${TAG}"
