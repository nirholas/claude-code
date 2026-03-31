# Permission System

**Location:** `src/utils/permissions/` — **27 files, 400+ KB**

## Permission Modes

| Mode | Symbol | Color | Behavior | Availability |
|------|--------|-------|----------|-------------|
| `default` | (none) | normal | Ask user for each restricted operation | All users |
| `plan` | ⏯ | plan | Plan mode, pauses for approval | All users |
| `acceptEdits` | ⏵⏵ | auto-accept | Auto-accept file edits | All users |
| `bypassPermissions` | ⏵⏵ | red/error | No prompts, sandbox required | All users |
| `dontAsk` | ⏵⏵ | red/error | No prompts, trust all | All users |
| `auto` | ⏵⏵ | yellow/warning | ML classifier decides | **Ant-only** |
| `bubble` | — | — | Unknown | **Ant-only** |

## Permission Rule Sources

Rules are evaluated in priority order (highest first):

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | `policySettings` | Enterprise MDM policy |
| 2 | `flagSettings` | Feature flag overrides |
| 3 | `cliArg` | Command-line flags |
| 4 | `session` | Session-scoped rules |
| 5 | `command` | Command-scoped rules |
| 6 | `localSettings` | `.claude/settings.local.json` |
| 7 | `projectSettings` | `.claude/settings.json` |
| 8 | `userSettings` | `~/.claude/settings.json` |

## Permission Behaviors

| Behavior | Description |
|----------|-------------|
| `allow` | Auto-approve tool execution |
| `deny` | Block tool execution silently |
| `ask` | Prompt user for approval |
| `passthrough` | Conditional — analyze subcommand before deciding |

## Key Files

| File | Size | Purpose |
|------|------|---------|
| `permissions.ts` | 52KB | Core permission checking logic |
| `permissionSetup.ts` | 53KB | Mode initialization and setup |
| `yoloClassifier.ts` | 52KB | ML-based auto-mode classifier |
| `filesystem.ts` | 62KB | Filesystem permission validation |
| `pathValidation.ts` | 16KB | Path validation logic |
| `classifierDecision.ts` | 5KB | Classifier decision routing |
| `bashClassifier.ts` | 1.4KB | Bash-specific classification |
| `denialTracking.ts` | 1.1KB | Denial count tracking |
| `bypassPermissionsKillswitch.ts` | 5KB | Remote killswitch |
| `PermissionMode.ts` | — | Mode definitions and type guards |

## Auto-Mode Classifier (`yoloClassifier.ts`)

The ML-based classifier for Ant users in `auto` mode:

1. Builds transcript context from recent conversation
2. Serializes tool call via `toAutoClassifierInput()`
3. Sends to ML inference endpoint
4. Classifies operation risk level
5. **Safe operations** → auto-approve
6. **Risky operations** → block or prompt
7. Tracks denial count per conversation
8. After N denials → falls back to user prompting

## Remote Killswitch

```typescript
// bypassPermissionsKillswitch.ts
// GrowthBook feature gate can remotely disable bypass mode:
getFeatureValue('tengu_bypass_permissions_disabled', false)
// If true: bypass mode is disabled globally, overriding user settings
```

## Filesystem Protection

`filesystem.ts` (62KB) enforces:

| Protection | Description |
|-----------|-------------|
| Path canonicalization | Resolves `..`, `.`, symlinks |
| Escape prevention | Blocks path traversal attempts |
| Symlink guards | Prevents following symlinks outside boundary |
| Project root boundary | Files must be within project root |
| UNC path detection | Windows NTLM credential leak prevention |
| `.git/` handling | Special permissions for git internals |
| Read-before-write | Files must be read before editing (timestamp validation) |

## Permission Check Flow

```
Tool invocation
  → Pre-tool-use hooks (can modify input via updatedInput)
  → checkPermissions() on the tool
  → Permission rule evaluation (8 sources, priority order)
  → If auto mode: yoloClassifier ML inference
  → If ask mode: user prompt
  → If bypass: allow (if sandbox validated)
  → If deny: block silently
  → Tool execution proceeds (or not)
  → Post-tool-use hooks
```
