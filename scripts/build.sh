#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# build.sh — Minimal build / check script for the leaked source
# ─────────────────────────────────────────────────────────────
# Usage:
#   ./scripts/build.sh          # install + typecheck + lint
#   ./scripts/build.sh install  # install deps only
#   ./scripts/build.sh check    # typecheck + lint only
# ─────────────────────────────────────────────────────────────
set -euo pipefail

STEP="${1:-all}"

install_deps() {
  echo "── Installing dependencies ──"
  if command -v bun &>/dev/null; then
    bun install
  elif command -v npm &>/dev/null; then
    npm install
  else
    echo "Error: neither bun nor npm found on PATH" >&2
    exit 1
  fi
}

typecheck() {
  echo "── Running TypeScript type-check ──"
  npx tsc --noEmit
}

lint() {
  echo "── Running Biome lint ──"
  npx @biomejs/biome check src/
}

case "$STEP" in
  install)
    install_deps
    ;;
  check)
    typecheck
    lint
    ;;
  all)
    install_deps
    typecheck
    lint
    ;;
  *)
    echo "Unknown step: $STEP"
    echo "Usage: $0 [install|check|all]"
    exit 1
    ;;
esac

echo "── Done ──"


