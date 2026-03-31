# Prompt 13: Bridge Layer (VS Code / JetBrains IDE Integration)

## Context

You are working in `/workspaces/claude-code`. The "Bridge" is the subsystem that connects Claude Code to IDE extensions (VS Code, JetBrains). It enables:
- Remote control of Claude Code from an IDE
- Sharing file context between IDE and CLI
- Permission approvals from the IDE UI
- Session management across IDE and terminal

The Bridge is **gated behind `feature('BRIDGE_MODE')`** and is the most complex optional subsystem (~30 files in `src/bridge/`).

## Key Files

- `src/bridge/bridgeMain.ts` — Main bridge orchestration
- `src/bridge/bridgeApi.ts` — Bridge API endpoints
- `src/bridge/bridgeMessaging.ts` — WebSocket/HTTP messaging
- `src/bridge/bridgeConfig.ts` — Bridge configuration
- `src/bridge/bridgeUI.ts` — Bridge UI rendering
- `src/bridge/jwtUtils.ts` — JWT authentication for bridge connections
- `src/bridge/types.ts` — Bridge types
- `src/bridge/initReplBridge.ts` — REPL integration
- `src/bridge/replBridge.ts` — REPL bridge handle

## Task

### Part A: Understand the bridge architecture

Read `src/bridge/types.ts` and `src/bridge/bridgeMain.ts` (first 100 lines). Document:
1. What protocols does the bridge use? (WebSocket, HTTP polling, etc.)
2. How does authentication work? (JWT)
3. What messages flow between IDE and CLI?
4. How is the bridge lifecycle managed?

### Part B: Assess what's needed vs. what can be deferred

The bridge is a **nice-to-have** for initial build-out. Categorize:
1. **Must work**: Feature flag gate (`feature('BRIDGE_MODE')` returns `false` → bridge code is skipped)
2. **Can defer**: Full bridge functionality
3. **Might break**: Code paths that assume bridge is available even when disabled

### Part C: Verify the feature gate works

Ensure that when `CLAUDE_CODE_BRIDGE_MODE=false` (or unset):
1. Bridge code is not imported
2. Bridge initialization is skipped  
3. No bridge-related errors appear
4. The CLI works normally in terminal-only mode

### Part D: Stub the bridge for safety

If any code paths reference bridge functionality outside the feature gate:
1. Create `src/bridge/stub.ts` with no-op implementations
2. Make sure imports from `src/bridge/` resolve without crashing
3. Ensure the REPL works without bridge

### Part E: Document bridge activation

For future work, document what would be needed to enable the bridge:
1. Set `CLAUDE_CODE_BRIDGE_MODE=true`
2. What IDE extension is needed?
3. What authentication setup is required?
4. What ports/sockets does it use?

### Part F: Check the Chrome extension bridge

There's a `--claude-in-chrome-mcp` and `--chrome-native-host` mode referenced in `src/entrypoints/cli.tsx`. Read these paths and document what they do. These can be deferred — just make sure they don't crash when not in use.

## Verification

1. CLI works normally with bridge disabled (default)
2. No bridge-related errors in stdout/stderr
3. `feature('BRIDGE_MODE')` correctly returns `false`
4. Bridge architecture is documented for future enablement
5. No dangling imports that crash when bridge is off
