# Exploration Guide

> How to navigate and study the Claude Code source code.

---

## Quick Start

This is a **read-only reference codebase** — there's no build system or test suite. The goal is to understand how a production AI coding assistant is built.

### Orientation

| What | Where |
|------|-------|
| CLI entrypoint | `src/main.tsx` |
| Core LLM engine | `src/QueryEngine.ts` (~46K lines) |
| Tool definitions | `src/Tool.ts` (~29K lines) |
| Command registry | `src/commands.ts` (~25K lines) |
| Tool registry | `src/tools.ts` |
| Context collection | `src/context.ts` |
| All tool implementations | `src/tools/` (40 subdirectories) |
| All command implementations | `src/commands/` (~85 subdirectories + 15 files) |

---

## Finding Things

### "How does tool X work?"

1. Go to `src/tools/{ToolName}/`
2. Main implementation is `{ToolName}.ts` or `.tsx`
3. UI rendering is in `UI.tsx`
4. System prompt contribution is in `prompt.ts`

Example — understanding BashTool:
```
src/tools/BashTool/
├── BashTool.ts      ← Core execution logic
├── UI.tsx           ← How bash output renders in terminal
├── prompt.ts        ← What the system prompt says about bash
└── ...
```

### "How does command X work?"

1. Check `src/commands/{command-name}/` (directory) or `src/commands/{command-name}.ts` (file)
2. Look for the `getPromptForCommand()` function (PromptCommands) or direct implementation (LocalCommands)

### "How does feature X work?"

| Feature | Start Here |
|---------|-----------|
| Permissions | `src/hooks/toolPermission/` |
| IDE bridge | `src/bridge/bridgeMain.ts` |
| MCP client | `src/services/mcp/` |
| Plugin system | `src/plugins/` + `src/services/plugins/` |
| Skills | `src/skills/` |
| Voice input | `src/voice/` + `src/services/voice.ts` |
| Multi-agent | `src/coordinator/` |
| Memory | `src/memdir/` |
| Authentication | `src/services/oauth/` |
| Config schemas | `src/schemas/` |
| State management | `src/state/` |

### "How does an API call flow?"

Trace from user input to API response:

```
src/main.tsx                    ← CLI parsing
  → src/replLauncher.tsx        ← REPL session start
    → src/QueryEngine.ts        ← Core engine
      → src/services/api/       ← Anthropic SDK client
        → (Anthropic API)       ← HTTP/streaming
      ← Tool use response
      → src/tools/{ToolName}/   ← Tool execution
      ← Tool result
      → (feed back to API)      ← Continue the loop
```

---

## Code Patterns to Recognize

### `buildTool()` — Tool Factory

Every tool uses this pattern:

```typescript
export const MyTool = buildTool({
  name: 'MyTool',
  inputSchema: z.object({ ... }),
  async call(args, context) { ... },
  async checkPermissions(input, context) { ... },
})
```

### Feature Flag Gates

```typescript
import { feature } from 'bun:bundle'

if (feature('VOICE_MODE')) {
  // This code is stripped at build time if VOICE_MODE is off
}
```

### Anthropic-Internal Gates

```typescript
if (process.env.USER_TYPE === 'ant') {
  // Anthropic employee-only features
}
```

### Index Re-exports

Most directories have an `index.ts` that re-exports the public API:

```typescript
// src/tools/BashTool/index.ts
export { BashTool } from './BashTool.js'
```

### Lazy Dynamic Imports

Heavy modules are loaded only when needed:

```typescript
const { OpenTelemetry } = await import('./heavy-module.js')
```

### ESM with `.js` Extensions

Bun convention — all imports use `.js` extensions even for `.ts` files:

```typescript
import { something } from './utils.js'  // Actually imports utils.ts
```

---

## Key Files by Size

The largest files contain the most logic and are worth studying:

| File | Lines | What's Inside |
|------|-------|---------------|
| `QueryEngine.ts` | ~46K | Streaming, tool loops, retries, token counting |
| `Tool.ts` | ~29K | Tool types, `buildTool`, permission models |
| `commands.ts` | ~25K | Command registry, conditional loading |
| `main.tsx` | — | CLI parser, startup optimization |
| `context.ts` | — | OS, shell, git, user context assembly |

---

## Study Paths

### Path 1: "How does a tool work end-to-end?"

1. Read `src/Tool.ts` — understand the `buildTool` interface
2. Pick a simple tool like `FileReadTool` in `src/tools/FileReadTool/`
3. Trace how `QueryEngine.ts` calls tools during the tool loop
4. See how permissions are checked in `src/hooks/toolPermission/`

### Path 2: "How does the UI work?"

1. Read `src/screens/REPL.tsx` — the main screen
2. Explore `src/components/` — pick a few components
3. See `src/hooks/useTextInput.ts` — how user input is captured
4. Check `src/ink/` — the Ink renderer wrapper

### Path 3: "How does the IDE integration work?"

1. Start at `src/bridge/bridgeMain.ts`
2. Follow `bridgeMessaging.ts` for the message protocol
3. See `bridgePermissionCallbacks.ts` for how permissions route to the IDE
4. Check `replBridge.ts` for REPL session bridging

### Path 4: "How do plugins extend Claude Code?"

1. Read `src/types/plugin.ts` — the plugin API surface
2. See `src/services/plugins/` — how plugins are loaded
3. Check `src/plugins/builtinPlugins.ts` — built-in examples
4. Look at `src/plugins/bundled/` — bundled plugin code

### Path 5: "How does MCP work?"

1. Read `src/services/mcp/` — the MCP client
2. See `src/tools/MCPTool/` — how MCP tools are invoked
3. Check `src/entrypoints/mcp.ts` — Claude Code as an MCP server
4. Look at `src/skills/mcpSkillBuilders.ts` — skills from MCP

---

## Using the MCP Server for Exploration

This repo includes a standalone MCP server (`mcp-server/`) that lets any MCP-compatible client explore the source code. See the [MCP Server README](../mcp-server/README.md) for setup.

Once connected, you can ask an AI assistant to explore the source:

- "How does the BashTool work?"
- "Search for where permissions are checked"
- "List all files in the bridge directory"
- "Read QueryEngine.ts lines 1-100"

---

## Grep Patterns

Useful grep/ripgrep patterns for finding things:

```bash
# Find all tool definitions
rg "buildTool\(" src/tools/

# Find all command definitions
rg "satisfies Command" src/commands/

# Find feature flag usage
rg "feature\(" src/

# Find Anthropic-internal gates
rg "USER_TYPE.*ant" src/

# Find all React hooks
rg "^export function use" src/hooks/

# Find all Zod schemas
rg "z\.object\(" src/schemas/

# Find all system prompt contributions
rg "prompt\(" src/tools/*/prompt.ts

# Find permission rule patterns
rg "checkPermissions" src/tools/
```

---

## See Also

- [Architecture](architecture.md) — Overall system design
- [Tools Reference](tools.md) — Complete tool catalog
- [Commands Reference](commands.md) — All slash commands
- [Subsystems Guide](subsystems.md) — Deep dives into Bridge, MCP, Permissions, etc.
