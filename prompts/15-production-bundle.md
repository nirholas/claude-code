# Prompt 15: Production Bundle & Packaging

## Context

You are working in `/workspaces/claude-code`. By now you should have a working development runner (Prompt 14) and build system (Prompt 03). This prompt focuses on creating a production-quality bundle.

## Task

### Part A: Optimize the esbuild configuration

Update `scripts/build-bundle.ts` for production:

1. **Tree shaking** — esbuild does this by default, but verify:
   - Feature-gated code with `if (feature('X'))` where X is `false` should be eliminated
   - `process.env.USER_TYPE === 'ant'` branches should be eliminated (set `define` to replace with `false`)

2. **Define replacements** — Inline constants at build time:
   ```ts
   define: {
     'process.env.USER_TYPE': '"external"',  // Not 'ant' (Anthropic internal)
     'process.env.NODE_ENV': '"production"',
   }
   ```

3. **Minification** — Enable for production (`--minify` flag)

4. **Source maps** — External source maps for production debugging

5. **Target** — Ensure compatibility with both Bun 1.1+ and Node.js 20+

### Part B: Handle chunking/splitting

The full bundle will be large (~2-5 MB minified). Consider:
1. **Single file** — Simplest, works everywhere (recommended for CLI tools)
2. **Code splitting** — Multiple chunks, only useful if we want lazy loading

Go with single file unless it causes issues.

### Part C: Create the executable

After bundling to `dist/cli.mjs`:

1. **Add shebang** — `#!/usr/bin/env node` (already in banner)
2. **Make executable** — `chmod +x dist/cli.mjs`
3. **Test it runs** — `./dist/cli.mjs --version`

### Part D: Platform packaging

Create packaging scripts for distribution:

**npm package** (`scripts/package-npm.ts`):
```ts
// Generate a publishable npm package in dist/npm/
// - package.json with bin, main, version
// - The bundled CLI file
// - README.md
```

**Standalone binary** (optional, via Bun):
```bash
bun build --compile src/entrypoints/cli.tsx --outfile dist/claude
```
This creates a single binary with Bun runtime embedded. Not all features will work, but it's worth testing.

### Part E: Docker build

Update the existing `Dockerfile` to produce a runnable container:

```dockerfile
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN bun run build:prod

FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=builder /app/dist/cli.mjs /app/
RUN apk add --no-cache git ripgrep
ENTRYPOINT ["bun", "/app/cli.mjs"]
```

### Part F: Verify production build

1. `bun run build:prod` succeeds
2. `ls -lh dist/cli.mjs` — check file size
3. `node dist/cli.mjs --version` — works with Node.js
4. `bun dist/cli.mjs --version` — works with Bun
5. `ANTHROPIC_API_KEY=... node dist/cli.mjs -p "hello"` — end-to-end works

### Part G: CI build script

Create `scripts/ci-build.sh`:
```bash
#!/bin/bash
set -euo pipefail

echo "=== Installing dependencies ==="
bun install

echo "=== Type checking ==="
bun run typecheck

echo "=== Linting ==="
bun run lint

echo "=== Building ==="
bun run build:prod

echo "=== Verifying build ==="
node dist/cli.mjs --version

echo "=== Done ==="
```

## Verification

1. `bun run build:prod` produces `dist/cli.mjs`
2. The bundle is < 10 MB (ideally < 5 MB)
3. `node dist/cli.mjs --version` works
4. `docker build .` succeeds (if Docker is available)
5. CI script runs end-to-end without errors
