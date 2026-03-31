# IDE Bridge (VS Code & JetBrains)

**Location:** `src/bridge/`

## Key Files

| File | Size | Purpose |
|------|------|---------|
| `bridgeMain.ts` | 116KB | Session lifecycle, polling, work dispatch |
| `bridgeApi.ts` | 18KB | HTTP API client for bridge protocol |
| `initReplBridge.ts` | 24KB | Connection initialization |
| `jwtUtils.ts` | 9.4KB | Session token management |

## Architecture

### Environment Registration

On startup, Claude Code registers with the bridge:
- Machine name, directory, branch, git repo URL
- Idempotent re-registration (reuses `environment_id`)
- Session capacity advertisement (`max_sessions`)

### Work Polling

```
Long-poll with 10s timeout
  ├── Work available → Acknowledge → Execute → Status updates
  ├── No work → Track empty polls (log every 100)
  └── Stale work → Reclaim mechanism (reclaimOlderThanMs)
```

### Work Execution

1. **Acknowledge** work item
2. **Run** the requested operation
3. **Status updates** sent during execution
4. **Stop** with force flag if needed
5. **OAuth 401** → retry with token refresh

## Security

| Measure | Description |
|---------|-------------|
| Trusted device token | `X-Trusted-Device-Token` header for elevated auth |
| ID validation | `SAFE_ID_PATTERN`: alphanumeric, dash, underscore only |
| Path traversal prevention | Input validation on all paths |
| JWT authentication | Session-based tokens |
| OAuth refresh | Automatic token refresh on 401 |
