// src/shims/preload.ts
// Must be loaded before any application code.
// Provides runtime equivalents of Bun bundler build-time features.

import './macro.js'
// bun:bundle is resolved via the build alias, not imported here
