# Prompt 03: Create esbuild-Based Build System

## Context

You are working in `/workspaces/claude-code`. This is the Claude Code CLI — a TypeScript/TSX terminal app using React + Ink. It was originally built using **Bun's bundler** with feature flags, but that build config wasn't included in the leak.

We need to create a build system that:
1. Bundles the entire `src/` tree into a runnable output
2. Aliases `bun:bundle` → our shim at `src/shims/bun-bundle.ts`
3. Injects the `MACRO` global (via `src/shims/macro.ts` preload)
4. Handles TSX/JSX (React)
5. Handles ESM `.js` extension imports (the code uses `import from './foo.js'` which maps to `./foo.ts`)
6. Produces output that can run under **Bun** (primary) or **Node.js 20+** (secondary)

## Existing Files

- `src/shims/bun-bundle.ts` — runtime `feature()` function (created in Prompt 02)
- `src/shims/macro.ts` — global `MACRO` object (created in Prompt 02)
- `src/shims/preload.ts` — preload bootstrap (created in Prompt 02)
- `src/entrypoints/cli.tsx` — main entrypoint
- `tsconfig.json` — has `"jsx": "react-jsx"`, `"module": "ESNext"`, `"moduleResolution": "bundler"`

## Task

### Part A: Install esbuild

```bash
bun add -d esbuild
```

### Part B: Create build script

Create `scripts/build-bundle.ts` (a Bun-runnable build script):

```ts
// scripts/build-bundle.ts
// Usage: bun scripts/build-bundle.ts [--watch] [--minify]

import * as esbuild from 'esbuild'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dir, '..')
const watch = process.argv.includes('--watch')
const minify = process.argv.includes('--minify')

const buildOptions: esbuild.BuildOptions = {
  entryPoints: [resolve(ROOT, 'src/entrypoints/cli.tsx')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outdir: resolve(ROOT, 'dist'),
  outExtension: { '.js': '.mjs' },
  
  // Inject the MACRO global before all other code
  inject: [resolve(ROOT, 'src/shims/macro.ts')],
  
  // Alias bun:bundle to our runtime shim
  alias: {
    'bun:bundle': resolve(ROOT, 'src/shims/bun-bundle.ts'),
  },
  
  // Don't bundle node built-ins or native packages
  external: [
    // Node built-ins
    'fs', 'path', 'os', 'crypto', 'child_process', 'http', 'https',
    'net', 'tls', 'url', 'util', 'stream', 'events', 'buffer',
    'querystring', 'readline', 'zlib', 'assert', 'tty', 'worker_threads',
    'perf_hooks', 'async_hooks', 'dns', 'dgram', 'cluster',
    'node:*',
    // Native addons that can't be bundled
    'fsevents',
  ],
  
  jsx: 'automatic',
  
  // Source maps for debugging
  sourcemap: true,
  
  minify,
  
  // Banner: shebang for CLI + preload the MACRO global
  banner: {
    js: '#!/usr/bin/env node\n',
  },
  
  // Handle the .js → .ts resolution that the codebase uses
  resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  
  logLevel: 'info',
}

async function main() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions)
    await ctx.watch()
    console.log('Watching for changes...')
  } else {
    const result = await esbuild.build(buildOptions)
    if (result.errors.length > 0) {
      console.error('Build failed')
      process.exit(1)
    }
    console.log('Build complete → dist/')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

**Important**: This is a starting point. You will likely need to iterate on the externals list and alias configuration. The codebase has ~1,900 files — some imports may need special handling. When you run the build:

1. Run it: `bun scripts/build-bundle.ts`
2. Look at the errors
3. Fix them (add externals, fix aliases, etc.)
4. Repeat until it bundles successfully

Common issues you'll hit:
- **npm packages that use native modules** → add to `external`
- **Dynamic `require()` calls** behind `process.env.USER_TYPE === 'ant'` → these are Anthropic-internal, wrap them or stub them
- **Circular dependencies** → esbuild handles these but may warn
- **Re-exports from barrel files** → should work but watch for issues

### Part C: Add npm scripts

Add these to `package.json` `"scripts"`:

```json
{
  "build": "bun scripts/build-bundle.ts",
  "build:watch": "bun scripts/build-bundle.ts --watch",
  "build:prod": "bun scripts/build-bundle.ts --minify"
}
```

### Part D: Create dist output directory

Add `dist/` to `.gitignore` (create one if it doesn't exist).

### Part E: Iterate on build errors

Run the build and fix whatever comes up. The goal is a clean `bun scripts/build-bundle.ts` that produces `dist/cli.mjs`. 

**Strategy for unresolvable modules**: If modules reference Anthropic-internal packages or Bun-specific APIs (like `Bun.hash`, `Bun.file`), create minimal stubs in `src/shims/` that provide compatible fallbacks.

### Part F: Test the output

After a successful build:
```bash
node dist/cli.mjs --version
# or
bun dist/cli.mjs --version
```

This should print the version. It will likely crash after that because no API key is configured — that's fine for now.

## Verification

1. `bun scripts/build-bundle.ts` completes without errors
2. `dist/cli.mjs` exists
3. `bun dist/cli.mjs --version` or `node dist/cli.mjs --version` prints a version string
4. `package.json` has `build`, `build:watch`, `build:prod` scripts
