# Prompt 02: Runtime Shims for `bun:bundle` Feature Flags & `MACRO` Globals

## Context

You are working in `/workspaces/claude-code`. This is the Claude Code CLI source. It was built to run under **Bun's bundler** which provides two build-time features that don't exist at runtime:

### 1. `bun:bundle` feature flags
Throughout the code you'll find:
```ts
import { feature } from 'bun:bundle'
if (feature('BRIDGE_MODE')) { ... }
```
Bun's bundler replaces `feature('X')` with `true`/`false` at build time for dead-code elimination. Without the bundler, this import fails at runtime.

**Current state**: There's a type stub at `src/types/bun-bundle.d.ts` that satisfies TypeScript, but there's no runtime module. We need a real module.

### 2. `MACRO` global object
The code references a global `MACRO` object with these properties:
- `MACRO.VERSION` — package version string (e.g., `"1.0.53"`)
- `MACRO.PACKAGE_URL` — npm package name (e.g., `"@anthropic-ai/claude-code"`)
- `MACRO.ISSUES_EXPLAINER` — feedback URL/instructions string

These are normally inlined by the bundler. Some files already guard with `typeof MACRO !== 'undefined'`, but most don't.

## Task

### Part A: Create `bun:bundle` runtime module

Create a file at `src/shims/bun-bundle.ts` that exports a `feature()` function. Feature flags should be configurable via environment variables so we can toggle them:

```ts
// src/shims/bun-bundle.ts

// Map of feature flags to their enabled state.
// In production Bun builds, these are compile-time constants.
// For our dev build, we read from env vars with sensible defaults.
const FEATURE_FLAGS: Record<string, boolean> = {
  PROACTIVE: envBool('CLAUDE_CODE_PROACTIVE', false),
  KAIROS: envBool('CLAUDE_CODE_KAIROS', false),
  BRIDGE_MODE: envBool('CLAUDE_CODE_BRIDGE_MODE', false),
  DAEMON: envBool('CLAUDE_CODE_DAEMON', false),
  VOICE_MODE: envBool('CLAUDE_CODE_VOICE_MODE', false),
  AGENT_TRIGGERS: envBool('CLAUDE_CODE_AGENT_TRIGGERS', false),
  MONITOR_TOOL: envBool('CLAUDE_CODE_MONITOR_TOOL', false),
  COORDINATOR_MODE: envBool('CLAUDE_CODE_COORDINATOR_MODE', false),
  ABLATION_BASELINE: false,  // always off for external builds
  DUMP_SYSTEM_PROMPT: envBool('CLAUDE_CODE_DUMP_SYSTEM_PROMPT', false),
  BG_SESSIONS: envBool('CLAUDE_CODE_BG_SESSIONS', false),
}

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key]
  if (v === undefined) return fallback
  return v === '1' || v === 'true'
}

export function feature(name: string): boolean {
  return FEATURE_FLAGS[name] ?? false
}
```

### Part B: Create `MACRO` global definition

Create a file at `src/shims/macro.ts` that defines and installs the global `MACRO` object:

```ts
// src/shims/macro.ts

// Read version from package.json at startup
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const pkgPath = resolve(dirname(__filename), '..', '..', 'package.json')
let version = '0.0.0-dev'
try {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  version = pkg.version || version
} catch {}

const MACRO_OBJ = {
  VERSION: version,
  PACKAGE_URL: '@anthropic-ai/claude-code',
  ISSUES_EXPLAINER: 'report issues at https://github.com/anthropics/claude-code/issues',
}

// Install as global
;(globalThis as any).MACRO = MACRO_OBJ

export default MACRO_OBJ
```

### Part C: Create a preload/bootstrap file

Create `src/shims/preload.ts` that imports both shims so they're available before any app code runs:

```ts
// src/shims/preload.ts
// Must be loaded before any application code.
// Provides runtime equivalents of Bun bundler build-time features.

import './macro.js'
// bun:bundle is resolved via the build alias, not imported here
```

### Part D: Update tsconfig.json `paths`

The current tsconfig.json has:
```json
"paths": {
  "bun:bundle": ["./src/types/bun-bundle.d.ts"]
}
```

This handles type-checking. For runtime, we'll need the build system (Prompt 03) to alias `bun:bundle` → `src/shims/bun-bundle.ts`. **Don't change tsconfig.json** — the type stub is correct for `tsc`. Just note this for the next prompt.

### Part E: Add global MACRO type declaration

Check if there's already a global type declaration for `MACRO`. If not, add one to `src/types/bun-bundle.d.ts` or a new `src/types/macro.d.ts`:

```ts
declare const MACRO: {
  VERSION: string
  PACKAGE_URL: string
  ISSUES_EXPLAINER: string
}
```

Make sure `tsc --noEmit` still passes after your changes.

## Verification

1. `bun run typecheck` should pass (or have the same errors as before — no new errors)
2. The files `src/shims/bun-bundle.ts`, `src/shims/macro.ts`, `src/shims/preload.ts` exist
3. Running `bun -e "import { feature } from './src/shims/bun-bundle.ts'; console.log(feature('BRIDGE_MODE'))"` should print `false`
4. Running `bun -e "import './src/shims/macro.ts'; console.log(MACRO.VERSION)"` should print the version
