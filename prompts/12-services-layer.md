# Prompt 12: Wire Up Services Layer (Analytics, Policy, Settings, Sessions)

## Context

You are working in `/workspaces/claude-code`. The CLI has several background services that run during operation:
- **Analytics/Telemetry** — GrowthBook feature flags, OpenTelemetry traces
- **Policy Limits** — rate limiting, quota enforcement from Anthropic backend
- **Remote Managed Settings** — server-pushed configuration
- **Session Memory** — persistent conversation history across invocations
- **Bootstrap Data** — initial config fetched from API on startup

Most of these talk to Anthropic's backend servers and will fail in our dev build. The goal is to make them fail gracefully (not crash the app) or provide stubs.

## Key Files

- `src/services/analytics/growthbook.ts` — GrowthBook feature flag client
- `src/services/analytics/` — Telemetry, event logging
- `src/services/policyLimits/` — Rate limit enforcement
- `src/services/remoteManagedSettings/` — Server-pushed settings
- `src/services/SessionMemory/` — Conversation persistence
- `src/services/api/bootstrap.ts` — Initial data fetch
- `src/entrypoints/init.ts` — Where most services are initialized
- `src/cost-tracker.ts` — Token usage and cost tracking

## Task

### Part A: Map the initialization sequence

Read `src/entrypoints/init.ts` carefully. Document:
1. What services are initialized, in what order?
2. Which are blocking (must complete before app starts)?
3. Which are fire-and-forget (async, can fail silently)?
4. What happens if each one fails?

### Part B: Make GrowthBook optional

Read `src/services/analytics/growthbook.ts`:
1. How is GrowthBook initialized?
2. Where is it called from? (feature flag checks throughout the codebase)
3. What happens if initialization fails?

**Goal**: Make GrowthBook fail silently — all feature flag checks should return `false` (default) if GrowthBook is unavailable. This may already be handled, but verify it.

### Part C: Stub policy limits

Read `src/services/policyLimits/`:
1. What limits does it enforce? (messages per minute, tokens per day, etc.)
2. What happens when a limit is hit?
3. Where is `loadPolicyLimits()` called?

**Goal**: Make the app work without policy limits. Either:
- Stub the service to return "no limits" (allow everything)
- Or catch and ignore errors from the API call

### Part D: Make remote settings optional

Read `src/services/remoteManagedSettings/`:
1. What settings does it manage?
2. What's the fallback when the server is unreachable?

**Goal**: Ensure the app works with default settings when the remote endpoint fails.

### Part E: Handle bootstrap data

Read `src/services/api/bootstrap.ts`:
1. What data does it fetch?
2. What uses this data?
3. What happens if the fetch fails?

**Goal**: Provide sensible defaults when bootstrap fails (no API key = no bootstrap).

### Part F: Verify session memory

Read `src/services/SessionMemory/`:
1. Where is session data stored? (filesystem path)
2. How are sessions identified?
3. Does it work with the local filesystem?

**Goal**: Session memory should work out of the box since it's local filesystem.

### Part G: Wire up cost tracking

Read `src/cost-tracker.ts`:
1. How are costs calculated?
2. Where is usage reported?
3. Does it persist across sessions?

**Goal**: Cost tracking should work locally (just display, no remote reporting needed).

### Part H: Create a services smoke test

Create `scripts/test-services.ts`:
```ts
// scripts/test-services.ts
// Test that all services initialize without crashing
// Usage: bun scripts/test-services.ts

import './src/shims/preload.js'

async function main() {
  console.log('Testing service initialization...')
  
  // Try to run the init sequence
  try {
    const { init } = await import('./src/entrypoints/init.js')
    await init()
    console.log('✅ Services initialized')
  } catch (err: any) {
    console.error('❌ Init failed:', err.message)
    // Document which service failed and why
  }
}

main()
```

## Verification

1. `bun scripts/test-services.ts` completes without crashing (warnings are fine)
2. Missing remote services log warnings, not crashes
3. Session memory reads/writes to the local filesystem
4. Cost tracking displays locally
5. The app can start even when Anthropic's backend is unreachable (with just an API key)
