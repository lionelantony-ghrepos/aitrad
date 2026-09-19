#!/usr/bin/env bash
# Minimal Codespaces Path A bootstrap. Does not pnpm install or seed.
set -euo pipefail

node_ver="$(node -v | sed 's/^v//')"
echo "node ${node_ver}"
IFS=. read -r major _minor _patch <<< "${node_ver}"
if [ "${major}" -lt 22 ]; then
  echo "ERROR: Codespaces Path A requires Node >= 22 (got ${node_ver}; pnpm node:sqlite)." >&2
  echo "Rebuild this codespace from javascript-node:22-bookworm. Local laptop engines may still be >=20.11." >&2
  exit 1
fi

echo "Meridian Path A: enabling pnpm 9.15.9 via corepack"
corepack enable || sudo corepack enable
corepack prepare pnpm@9.15.9 --activate

echo "pnpm $(pnpm -v)"

echo "Waiting for Docker-in-Docker daemon..."
ready=0
for _ in $(seq 1 30); do
  if docker info >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [ "${ready}" -eq 1 ]; then
  docker --version
  if docker compose version >/dev/null 2>&1; then
    docker compose version
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose version
  else
    echo "WARN: Docker Compose CLI not found yet. Retry: docker compose version" >&2
  fi
else
  echo "WARN: Docker daemon not ready yet. Retry in the terminal: docker info" >&2
fi

echo
echo "Path A standup: docs/codespaces-path-a.md"
echo "Do not auto-seed. Run InsForge + pnpm steps from that checklist."
echo "Stop this codespace when finished (Free quota / spend limit \$0)."
