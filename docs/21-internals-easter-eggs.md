# Internals, Codenames & Easter Eggs

## Internal Codenames

| Codename | Meaning | Where Found |
|----------|---------|-------------|
| **Tengu** | Claude Code's internal codename | Event names (`tengu_*`), feature flags, analytics |
| **Kairos** | Proactive/autonomous assistant mode | Feature flags, prompt sections |
| **Tungsten** | Unknown feature-gated tool | Feature flag reference |
| **Ant** | Anthropic employees | `process.env.USER_TYPE === 'ant'`, permission modes |
| **FedStart** | Federal/government deployment | OAuth URL allowlist |
| **Numbat** | Upcoming model launch | `@[MODEL LAUNCH]` code comments |
| **Capybara** | Model version (v8 referenced) | `@[MODEL LAUNCH]` code comments |
| **Hive** | Verification agent system | `tengu_hive_evidence` feature flag |
| **CCR** | Cloud Code Runtime | Remote agent execution |

## Code Comment Tags

| Tag | Meaning |
|-----|---------|
| `@[MODEL LAUNCH]` | Code to update when a new model launches |
| `ANT-ONLY` | Code only in Anthropic internal builds |
| `DCE` | Dead Code Elimination note |

## Easter Eggs

### `/buddy` — Companion Sprite
**Location:** `src/buddy/`

A companion sprite Easter egg. Full implementation in its own directory.

### `/stickers` — Sticker System
**Location:** `src/commands/stickers/`

A sticker collection/trading system.

### `/good-claude` — Positive Reinforcement
**Location:** `src/commands/good-claude/`

A command for giving Claude positive feedback.

### `/thinkback` + `/thinkback-play`
**Location:** `src/commands/thinkback/`

Replay the model's thinking process.

## Curiosities

### `isUndercover()` — Undercover Mode
**Location:** `src/utils/undercover.ts`

When active (Ant-only), ALL model names and IDs are stripped from system prompts. Prevents leaking internal model names into public artifacts (commits, PRs).

### `autoDream` — Dream Mode
**Location:** `src/services/autoDream/`

A dream/creative mode service. Purpose unknown.

### `awaySummary.ts` — Away Summary
**Location:** `src/services/awaySummary.ts`

Summarizes what happened while the user was away from the terminal.

### `vcr.ts` — VCR Recording
**Location:** `src/services/vcr.ts`

"Video Cassette Recorder" for API calls — records and replays request/response pairs for debugging.

### `moreright/` — Unknown Subsystem
**Location:** `src/moreright/`

Unknown purpose. Name is cryptic.

### Mock Limits
**Location:** `src/services/mockRateLimits.ts` + `src/commands/mock-limits/`

Simulates rate limiting for testing. Ant-only.

### Diagnostic Tracking
**Location:** `src/services/diagnosticTracking.ts`

Internal diagnostic event tracking.

## Build Architecture Notes

### Dead Code Elimination Pattern

```typescript
import { feature } from 'bun:bundle'

// Bun evaluates feature() at build time
// If false: entire branch is stripped from output
const module = feature('FLAG')
  ? require('./module.js')
  : null
```

### USER_TYPE Check Pattern

```typescript
// MUST be inlined at each callsite — NOT hoisted to a const
// This allows Bun to constant-fold in external builds
if (process.env.USER_TYPE === 'ant') {
  // Ant-only code
}
```

### `MACRO.VERSION`, `MACRO.ISSUES_EXPLAINER`

Build-time macros replaced during bundling. `MACRO.VERSION` is the Claude Code version string.
