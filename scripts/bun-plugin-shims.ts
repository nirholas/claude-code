// scripts/bun-plugin-shims.ts
// Bun preload plugin — intercepts `bun:bundle` imports at runtime
// and resolves them to our local shim so the CLI can run without
// the production Bun bundler pass.

import { plugin } from 'bun'
import { resolve } from 'path'

plugin({
  name: 'bun-bundle-shim',
  setup(build) {
    const shimPath = resolve(import.meta.dir, '../src/shims/bun-bundle.ts')

    build.onResolve({ filter: /^bun:bundle$/ }, () => ({
      path: shimPath,
    }))
  },
})
