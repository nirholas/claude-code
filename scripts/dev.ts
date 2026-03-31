// scripts/dev.ts
// Development launcher — runs the CLI directly via Bun's TS runtime.
//
// Usage:
//   bun scripts/dev.ts [args...]
//   bun run dev [args...]
//
// The bun:bundle shim is loaded automatically via bunfig.toml preload.
// Bun automatically reads .env files from the project root.

// Load MACRO global (version, package url, etc.) before any app code
import '../src/shims/macro.js'

// Launch the CLI entrypoint
await import('../src/entrypoints/cli.js')
