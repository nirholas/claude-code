// Type stubs for bun:bundle feature flags used throughout the codebase.
// In a real Bun build these are provided by the bundler and eliminated at compile time.
declare module 'bun:bundle' {
  /**
   * Returns true if the named feature flag is enabled at build time.
   * Bun uses this for dead-code elimination — disabled branches are stripped entirely.
   */
  export function feature(name: string): boolean
}

