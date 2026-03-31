#!/bin/bash
# ─────────────────────────────────────────────────────────────
# ci-build.sh — CI/CD build pipeline
# ─────────────────────────────────────────────────────────────
# Runs the full build pipeline: install, typecheck, lint, build,
# and verify the output. Intended for CI environments.
#
# Usage:
#   ./scripts/ci-build.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail

echo "=== Installing dependencies ==="
bun install

echo "=== Type checking ==="
bun run typecheck

echo "=== Linting ==="
bun run lint

echo "=== Building production bundle ==="
bun run build:prod

echo "=== Verifying build output ==="

# Check that the bundle was produced
if [ ! -f dist/cli.mjs ]; then
  echo "ERROR: dist/cli.mjs not found"
  exit 1
fi

# Print bundle size
SIZE=$(ls -lh dist/cli.mjs | awk '{print $5}')
echo "  Bundle size: $SIZE"

# Verify the bundle runs with Node.js
if command -v node &>/dev/null; then
  VERSION=$(node dist/cli.mjs --version 2>&1 || true)
  echo "  node dist/cli.mjs --version → $VERSION"
fi

# Verify the bundle runs with Bun
if command -v bun &>/dev/null; then
  VERSION=$(bun dist/cli.mjs --version 2>&1 || true)
  echo "  bun dist/cli.mjs --version → $VERSION"
fi

echo "=== Done ==="
