# Hook System

**Location:** `src/utils/hooks.ts`

## Hook Events

| Event | When Triggered |
|-------|---------------|
| `setup` | Before first query |
| `session-start` | Session begins |
| `session-end` | Session ends |
| `pre-tool-use` | Before tool execution |
| `post-tool-use` | After successful tool execution |
| `post-tool-use-failure` | After tool failure |
| `permission-request` | Permission dialog triggered |
| `pre-compact` | Before context compaction |
| `post-compact` | After context compaction |
| `stop` | Response complete |
| `stop-failure` | Stop hook failed |
| `subagent-start` | Sub-agent spawned |
| `subagent-stop` | Sub-agent completed |
| `teammate-idle` | Team agent idle |
| `task-created` | Task created |
| `task-completed` | Task completed |
| `config-change` | Config modified |
| `cwd-changed` | Working directory changed |
| `file-changed` | File modified |
| `instructions-loaded` | CLAUDE.md loaded |
| `user-prompt-submit` | User sends message |
| `elicitation` | Elicitation triggered |
| `elicitation-result` | Elicitation result |
| `notification` | Notification sent |
| `status-line` | Status line update |

## Hook Capabilities

| Capability | Description |
|-----------|-------------|
| Shell commands | Execute at lifecycle points |
| JSON output | Structured responses from hooks |
| Input modification | `pre-tool-use` can return `updatedInput` to modify tool inputs |
| Permission influence | `permission-request` hooks return `PermissionRequestResult` |
| Environment context | Hooks receive CWD, session ID, transcript path |
| Async execution | Background hook registry |
| Telemetry | Duration and output tracked |

## Important: Hooks Cannot Bypass Permissions

Hooks run AFTER the permission check. They can influence the permission decision (via `permission-request` hooks) but cannot bypass the permission system entirely.

## Configuration Sources

```
User settings → Project settings → Local settings → Managed (admin policy) → Plugins
```

## Enterprise Controls

| Control | Purpose |
|---------|---------|
| `shouldAllowManagedHooksOnly()` | Only run admin-managed hooks |
| `shouldDisableAllHooksIncludingManaged()` | Disable all hooks entirely |

## Security

- **Snapshot at session start** — hooks captured once, preventing mid-session tampering via config file modification
- **Telemetry** — all hook executions logged with duration and output size
- **FileChanged watcher** — initialized separately from main hooks
