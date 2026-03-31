# ─────────────────────────────────────────────────────────────
# Claude Code CLI — Production Container
# ─────────────────────────────────────────────────────────────
# Multi-stage build: builds a production bundle, then copies
# only the output into a minimal runtime image.
#
# Usage:
#   docker build -t claude-code .
#   docker run --rm -e ANTHROPIC_API_KEY=sk-... claude-code -p "hello"
# ─────────────────────────────────────────────────────────────

# Stage 1: Build
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy manifests first for layer caching
COPY package.json bun.lockb* ./

# Install all dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile || bun install

# Copy source
COPY . .

# Build production bundle
RUN bun run build:prod

# Stage 2: Runtime
FROM oven/bun:1-alpine

WORKDIR /app

# Install OS-level runtime dependencies
RUN apk add --no-cache git ripgrep

# Copy only the bundled output from the builder
COPY --from=builder /app/dist/cli.mjs /app/cli.mjs

# Make it executable
RUN chmod +x /app/cli.mjs

ENTRYPOINT ["bun", "/app/cli.mjs"]


