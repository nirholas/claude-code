# Bridge Layer (VS Code / JetBrains IDE Integration)

## Architecture Overview

The bridge (`src/bridge/`, ~31 files) connects Claude Code CLI sessions to
remote IDE extensions (VS Code, JetBrains) and the claude.ai web UI. It is
gated behind `feature('BRIDGE_MODE')` which defaults to `false`.

### Protocols

The bridge uses **two transport generations**:

| Version | Read Path | Write Path | Negotiation |
|---------|-----------|------------|-------------|
| **v1 (env-based)** | WebSocket to Session-Ingress (`ws(s)://.../v1/session_ingress/ws/{sessionId}`) | HTTP POST to Session-Ingress | Environments API poll/ack/dispatch |
| **v2 (env-less)** | SSE stream via `SSETransport` | `CCRClient` → `/worker/*` endpoints | Direct `POST /v1/code/sessions/{id}/bridge` → worker JWT |

Both wrapped behind `ReplBridgeTransport` interface (`replBridgeTransport.ts`).

The v1 path: register environment → poll for work → acknowledge → spawn session.
The v2 path: create session → POST `/bridge` for JWT → SSE + CCRClient directly.

### Authentication

1. **OAuth tokens** — claude.ai subscription required (`isClaudeAISubscriber()`)
2. **JWT** — Session-Ingress tokens (`sk-ant-si-` prefixed) with `exp` claims.
   `jwtUtils.ts` decodes and schedules proactive refresh before expiry.
3. **Trusted Device token** — `X-Trusted-Device-Token` header for elevated
   security tier sessions. Enrolled via `trustedDevice.ts`.
4. **Environment secret** — base64url-encoded `WorkSecret` containing
   `session_ingress_token`, `api_base_url`, git sources, auth tokens.

Dev override: `CLAUDE_BRIDGE_OAUTH_TOKEN` and `CLAUDE_BRIDGE_BASE_URL`
(ant-only, `process.env.USER_TYPE === 'ant'`).

### Message Flow (IDE ↔ CLI)

```
IDE / claude.ai  ──WebSocket/SSE──→  Session-Ingress  ──→  CLI (replBridge)
   ←── POST / CCRClient writes ────  Session-Ingress  ←──  CLI
```

**Inbound** (server → CLI):
- `user` messages (prompts from web UI) → `handleIngressMessage()` → enqueued to REPL
- `control_request` (initialize, set_model, interrupt, set_permission_mode, set_max_thinking_tokens)
- `control_response` (permission decisions from IDE)

**Outbound** (CLI → server):
- `assistant` messages (Claude's responses)
- `user` messages (echoed for sync)
- `result` messages (turn completion)
- System events, tool starts, activities

Dedup: `BoundedUUIDSet` tracks recent posted/inbound UUIDs to reject echoes
and re-deliveries.

### Lifecycle

1. **Entitlement check**: `isBridgeEnabled()` / `isBridgeEnabledBlocking()` →
   GrowthBook gate `tengu_ccr_bridge` + OAuth subscriber check
2. **Session creation**: `createBridgeSession()` → POST to API
3. **Transport init**: v1 `HybridTransport` or v2 `SSETransport` + `CCRClient`
4. **Message pump**: Read inbound via transport, write outbound via batch
5. **Token refresh**: Proactive JWT refresh via `createTokenRefreshScheduler()`
6. **Teardown**: `teardown()` → flush pending → close transport → archive session

Spawn modes for `claude remote-control`:
- `single-session`: One session in cwd, bridge tears down when it ends
- `worktree`: Persistent server, each session gets an isolated git worktree
- `same-dir`: Persistent server, sessions share cwd

### Key Types

- `BridgeConfig` — Full bridge configuration (dir, auth, URLs, spawn mode, timeouts)
- `WorkSecret` — Decoded work payload (token, API URL, git sources, MCP config)
- `SessionHandle` — Running session (kill, activities, stdin, token update)
- `ReplBridgeHandle` — REPL bridge API (write messages, control requests, teardown)
- `BridgeState` — `'ready' | 'connected' | 'reconnecting' | 'failed'`
- `SpawnMode` — `'single-session' | 'worktree' | 'same-dir'`

---

## Feature Gate Analysis

### Must Work (currently works correctly)

The `feature('BRIDGE_MODE')` gate in `src/shims/bun-bundle.ts` defaults to
`false` (reads `CLAUDE_CODE_BRIDGE_MODE` env var). All critical code paths
are properly guarded:

| Location | Guard |
|----------|-------|
| `src/entrypoints/cli.tsx:112` | `feature('BRIDGE_MODE') && args[0] === 'remote-control'` |
| `src/main.tsx:2246` | `feature('BRIDGE_MODE') && remoteControlOption !== undefined` |
| `src/main.tsx:3866` | `if (feature('BRIDGE_MODE'))` (Commander subcommand) |
| `src/hooks/useReplBridge.tsx:79-88` | All `useAppState` calls gated by `feature('BRIDGE_MODE')` ternary |
| `src/hooks/useReplBridge.tsx:99` | `useEffect` body gated by `feature('BRIDGE_MODE')` |
| `src/components/PromptInput/PromptInputFooter.tsx:160` | `if (!feature('BRIDGE_MODE')) return null` |
| `src/components/Settings/Config.tsx:930` | `feature('BRIDGE_MODE') && isBridgeEnabled()` spread |
| `src/tools/BriefTool/upload.ts:99` | `if (feature('BRIDGE_MODE'))` |
| `src/tools/ConfigTool/supportedSettings.ts:153` | `feature('BRIDGE_MODE')` spread |

### Can Defer (full bridge functionality)

All of the following are behind the feature gate and inactive:
- `runBridgeLoop()` — Full bridge orchestration in `bridgeMain.ts`
- `initReplBridge()` — REPL bridge initialization
- `initBridgeCore()` / `initEnvLessBridgeCore()` — Transport negotiation
- `createBridgeApiClient()` — Environments API calls
- `BridgeUI` — Bridge status display and QR codes
- Token refresh scheduling
- Multi-session management (worktree mode)
- Permission delegation to IDE

### Won't Break

Static imports of bridge modules from outside `src/bridge/` do NOT crash because:

1. **All bridge files exist** — they're in the repo, so imports resolve.
2. **No side effects at import time** — bridge modules define functions/types
   but don't execute bridge logic on import.
3. **Runtime guards** — Functions like `isBridgeEnabled()` return `false`
   when `feature('BRIDGE_MODE')` is false. `getReplBridgeHandle()` returns
   `null`. `useReplBridge` short-circuits via ternary operators.

Files with unguarded static imports (safe because files exist):
- `src/hooks/useReplBridge.tsx` — imports types and utils from bridge
- `src/components/Settings/Config.tsx` — imports `isBridgeEnabled` (returns false)
- `src/components/PromptInput/PromptInputFooter.tsx` — early-returns null
- `src/tools/SendMessageTool/SendMessageTool.ts` — `getReplBridgeHandle()` returns null
- `src/tools/BriefTool/upload.ts` — guarded at call site
- `src/commands/logout/logout.tsx` — `clearTrustedDeviceTokenCache` is a no-op

---

## Bridge Stub

Created `src/bridge/stub.ts` with:
- `isBridgeAvailable()` → always returns `false`
- `noopBridgeHandle` — silent no-op `ReplBridgeHandle`
- `noopBridgeLogger` — silent no-op `BridgeLogger`

Available for any future code that needs a safe fallback when bridge is off.

---

## Bridge Activation (Future Work)

To enable the bridge:

### 1. Environment Variable
```bash
export CLAUDE_CODE_BRIDGE_MODE=true
```

### 2. Authentication Requirements
- Must be logged in to claude.ai with an active subscription
  (`isClaudeAISubscriber()` must return `true`)
- OAuth tokens obtained via `claude auth login` (needs `user:profile` scope)
- GrowthBook gate `tengu_ccr_bridge` must be enabled for the user's org

### 3. IDE Extension
- VS Code: Claude Code extension (connects via the bridge's Session-Ingress layer)
- JetBrains: Similar integration (same protocol)
- Web: `claude.ai/code?bridge={environmentId}` URL

### 4. Network / Ports
- **Session-Ingress**: WebSocket (`wss://`) or SSE for reads; HTTPS POST for writes
- **API base**: Production `api.claude.ai` (configured via OAuth config)
- Dev overrides: `CLAUDE_BRIDGE_BASE_URL`, localhost uses `ws://` and `/v2/` paths
- QR code displayed in terminal links to `claude.ai/code?bridge={envId}`

### 5. Running Remote Control
```bash
# Single session (tears down when session ends)
claude remote-control

# Named session
claude remote-control "my-project"

# With specific spawn mode (requires tengu_ccr_bridge_multi_session gate)
claude remote-control --spawn worktree
claude remote-control --spawn same-dir
```

### 6. Additional Flags
- `--remote-control [name]` / `--rc [name]` — Start REPL with bridge pre-enabled
- `--debug-file <path>` — Write debug log to file
- `--session-id <id>` — Resume an existing session

---

## Chrome Extension Bridge

### `--claude-in-chrome-mcp` (cli.tsx:72)

Launches a **Claude-in-Chrome MCP server** via `runClaudeInChromeMcpServer()` from
`src/utils/claudeInChrome/mcpServer.ts`. This:
- Creates a `StdioServerTransport` (MCP over stdin/stdout)
- Uses `@ant/claude-for-chrome-mcp` package to create an MCP server
- Bridges between Claude Code and the Chrome extension
- Supports both native socket (local) and WebSocket bridge (`wss://bridge.claudeusercontent.com`)
- Gated by `tengu_copper_bridge` GrowthBook flag (or `USER_TYPE=ant`)

**Not gated by `feature('BRIDGE_MODE')`** — this is a separate subsystem. It only
runs when explicitly invoked with `--claude-in-chrome-mcp` flag.

### `--chrome-native-host` (cli.tsx:79)

Launches the **Chrome Native Messaging Host** via `runChromeNativeHost()` from
`src/utils/claudeInChrome/chromeNativeHost.ts`. This:
- Implements Chrome's native messaging protocol (4-byte length prefix + JSON over stdin/stdout)
- Creates a Unix domain socket server at a secure path
- Proxies MCP messages between Chrome extension and local Claude Code instances
- Has its own debug logging to `~/.claude/debug/chrome-native-host.txt` (ant-only)

**Not gated by `feature('BRIDGE_MODE')`** — separate entry point. Only activated
when Chrome calls the registered native messaging host binary.

### Safety

Both Chrome paths:
- Are **dynamic imports** — only loaded when the specific flag is passed
- Return immediately after their own `await` — no side effects on normal CLI startup
- Cannot crash normal operation because they're entirely separate code paths
- Have no dependency on the bridge feature flag

---

## Verification Summary

| Check | Status |
|-------|--------|
| `feature('BRIDGE_MODE')` returns `false` by default | ✅ Verified in `src/shims/bun-bundle.ts` |
| Bridge code not executed when disabled | ✅ All call sites use `feature()` guard |
| No bridge-related errors on startup | ✅ Imports resolve (files exist), no side effects |
| CLI works in terminal-only mode | ✅ Bridge is purely additive |
| Chrome paths don't crash | ✅ Separate dynamic imports, only on explicit flags |
| Stub available for safety | ✅ Created `src/bridge/stub.ts` |
