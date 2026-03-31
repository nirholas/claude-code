# Prompt 14: Create Development Runner

## Context

You are working in `/workspaces/claude-code`. By now you should have:
- Bun installed (Prompt 01)
- Runtime shims for `bun:bundle` and `MACRO` (Prompt 02)
- A build system (Prompt 03)
- Environment config (Prompt 05)

Now we need a way to **run the CLI in development mode** — quickly launching it without a full production build.

## Task

### Part A: Create `bun run dev` script

Bun can run TypeScript directly without compilation. Create a development launcher.

**Option 1: Direct Bun execution** (preferred)

Create `scripts/dev.ts`:
```ts
// scripts/dev.ts
// Development launcher — runs the CLI directly via Bun
// Usage: bun scripts/dev.ts [args...]
// Or: bun run dev [args...]

// Load shims first
import '../src/shims/preload.js'

// Register bun:bundle module resolver
// Since Bun natively supports the module, we may need to
// register our shim. Check if this is needed.

// Launch the CLI
await import('../src/entrypoints/cli.js')
```

**Option 2: Bun with preload**

Use Bun's `--preload` flag:
```bash
bun --preload ./src/shims/preload.ts src/entrypoints/cli.tsx
```

**Investigate which approach works** with the `bun:bundle` import. The tricky part is that `bun:bundle` is a special Bun module name — at runtime (without the bundler), Bun may not recognize it. You'll need to either:
1. Use Bun's `bunfig.toml` to create a module alias
2. Use a loader/plugin to intercept the import
3. Use a pre-transform step to rewrite imports

### Part B: Handle the `bun:bundle` import at runtime

This is the critical challenge. Options to investigate:

**Option A: `bunfig.toml` alias**
```toml
[resolve]
alias = { "bun:bundle" = "./src/shims/bun-bundle.ts" }
```

**Option B: Bun plugin**
Create a Bun plugin that intercepts `bun:bundle`:
```ts
// scripts/bun-plugin-shims.ts
import { plugin } from 'bun'

plugin({
  name: 'bun-bundle-shim',
  setup(build) {
    build.onResolve({ filter: /^bun:bundle$/ }, () => ({
      path: resolve(import.meta.dir, '../src/shims/bun-bundle.ts'),
    }))
  },
})
```
Then reference it in `bunfig.toml`:
```toml
preload = ["./scripts/bun-plugin-shims.ts"]
```

**Option C: Patch at build time**
If runtime aliasing doesn't work, use a quick pre-build transform that replaces `from 'bun:bundle'` with `from '../shims/bun-bundle.js'` across all files, outputting to a temp directory.

**Try the options in order** and go with whichever works.

### Part C: Add npm scripts

Add to `package.json`:
```json
{
  "scripts": {
    "dev": "bun scripts/dev.ts",
    "dev:repl": "bun scripts/dev.ts --repl",
    "start": "bun scripts/dev.ts"
  }
}
```

### Part D: Create a `.env` loader

If the dev script doesn't automatically load `.env`, add dotenv support:
```bash
bun add -d dotenv-cli
```
Then wrap the dev command:
```json
"dev": "dotenv -e .env -- bun scripts/dev.ts"
```

Or use Bun's built-in `.env` loading (Bun automatically reads `.env` files).

### Part E: Test the development runner

1. Set `ANTHROPIC_API_KEY` in `.env`
2. Run `bun run dev --version` → should print version
3. Run `bun run dev --help` → should print help text
4. Run `bun run dev` → should start the interactive REPL (will need working Ink UI)
5. Run `ANTHROPIC_API_KEY=sk-ant-... bun run dev -p "say hello"` → should make one API call and print response

### Part F: Add debug mode

Add a debug script that enables verbose logging:
```json
{
  "scripts": {
    "dev:debug": "CLAUDE_CODE_DEBUG_LOG_LEVEL=debug bun scripts/dev.ts"
  }
}
```

## Verification

1. `bun run dev --version` prints the version
2. `bun run dev --help` prints help without errors
3. The `bun:bundle` import resolves correctly at runtime
4. `.env` variables are loaded
5. No module resolution errors on startup
