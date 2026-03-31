import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'
import { existsSync } from 'fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/**
 * Vite plugin that resolves relative `.js` imports to their `.ts`/`.tsx`
 * equivalents at the filesystem level.
 *
 * The source uses TypeScript's `allowImportingTsExtensions: true` convention
 * (`.js` suffixes on imports for Node ESM compatibility), but Vitest's runtime
 * must locate the real TypeScript source files. This plugin intercepts all
 * relative `.js` imports and checks whether a matching `.ts` or `.tsx` file
 * exists, returning its absolute path if found.
 */
const resolveJsToTs = {
  name: 'resolve-js-to-ts',
  enforce: 'pre' as const,
  resolveId(id: string, importer: string | undefined): string | null {
    if (!importer || !id.startsWith('.') || !id.endsWith('.js')) return null

    const dir = dirname(importer)
    const base = id.slice(0, -3)

    for (const ext of ['.ts', '.tsx']) {
      const candidate = resolve(dir, base + ext)
      if (existsSync(candidate)) return candidate
    }
    return null
  },
}

export default defineConfig({
  plugins: [resolveJsToTs],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: [
      // The source uses baseUrl:"." in tsconfig so bare "src/..." imports resolve from root
      { find: /^src\//, replacement: resolve(__dirname, 'src') + '/' },
      // bun:bundle is a Bun bundler virtual module; redirect to the dev shim
      { find: 'bun:bundle', replacement: resolve(__dirname, 'src/shims/bun-bundle.ts') },
      // color-diff-napi is a native addon unavailable in test environments;
      // redirect to the pre-existing stub shim so smoke tests can load
      { find: 'color-diff-napi', replacement: resolve(__dirname, 'src/shims/color-diff-napi.ts') },
    ],
  },
})
