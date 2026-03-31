# Startup & Initialization

## Boot Sequence

### Phase 1: Parallel Prefetches (before imports)

Fired as side-effects in `main.tsx` before heavy module evaluation begins:

```typescript
startMdmRawRead()        // MDM enterprise policy fetch (parallel)
startKeychainPrefetch()  // macOS keychain credential pre-read (parallel)
profileCheckpoint()      // Startup performance profiling
```

### Phase 2: Early Validation

1. **Debug detection** — exits immediately if `--inspect` flag present
2. **Settings path processing** — `--settings`, `--setting-sources` flags
3. **Trust dialog enforcement** — shown before any git commands run

### Phase 3: `init()` Sequence

1. Analytics/telemetry setup (OpenTelemetry spans, GrowthBook initialization)
2. Permission system initialization
3. MCP configuration loading
4. Plugin and skill discovery
5. Model capability prefetching
6. Migration runner (async, non-blocking)

### Phase 4: Deferred Prefetches

After the first REPL render:

```typescript
startDeferredPrefetches() → {
  initUser(),
  getUserContext(),
  loadTips(),
  countFiles(),
  startSettingsChangeDetector(),
  startSkillsChangeDetector(),
  startEventLoopStallDetector()  // Ant-only
}
```

## `setup.ts` — Pre-Query Safety Checks

Called once at process startup:

| Check | Purpose |
|-------|---------|
| Node.js version | Requires 18+ |
| UDS messaging server | Multi-agent swarm communication |
| Worktree creation | Optional git worktree + tmux setup |
| Terminal restoration | Recover interrupted iTerm2/Terminal.app |
| Hook snapshot capture | Prevent mid-session hook tampering |
| Session memory init | Load persistent memory |
| API key prefetch | Pre-load credentials |
| Sandbox validation | Prevent unsafe bypass-permissions |
| Release notes | Check for new version |

### Sandbox Safety

```
Cannot use --dangerously-skip-permissions unless:
  ├── IS_SANDBOX=1 environment variable set
  ├── Running inside Docker or Bubblewrap
  └── Not running as root/sudo
  
Ant users additionally:
  └── CLAUDE_CODE_ENTRYPOINT must be 'local-agent' or 'claude-desktop'
```

## Migration System

- **Current version:** `CURRENT_MIGRATION_VERSION = 11`
- **Runs:** Async, non-blocking
- **Purpose:** Automatic config migrations (model string updates, settings format changes)
- **Pattern:** Sequential version-numbered migrations (v1 through v11)
