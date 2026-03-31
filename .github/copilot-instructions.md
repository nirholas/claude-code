# Claude Code CLI — Agent Instructions

## What This Is

This is the **leaked source code** of Anthropic's Claude Code CLI (leaked 2026-03-31). It is a read-only reference codebase — there is no build system, no tests, and no package.json included. Treat it as a study/exploration resource.

- **Language**: TypeScript / TSX
- **Runtime**: Bun (not Node.js)
- **Terminal UI**: React + Ink (React for CLI)
- **Scale**: ~1,900 files, 512,000+ lines across `src/`

## Architecture

### Core Pipeline

1. **Entrypoint** — `src/main.tsx`: Commander.js CLI parser, service initialization, lazy feature loading via Bun feature flags
2. **Query Engine** — `src/QueryEngine.ts` (~46K lines): LLM API call handler — streaming, tool loops, thinking mode, retries, token counting
3. **Tool System** — `src/Tool.ts` (~29K lines) + `src/tools/`: ~50 tools (BashTool, FileEditTool, AgentTool, etc.), each self-contained with input schema, permissions, and execution logic
4. **Command System** — `src/commands.ts` (~25K lines) + `src/commands/`: ~50 slash commands (`/commit`, `/review`, `/config`, etc.)
5. **Context** — `src/context.ts`: Collects OS, shell, git, and user context for prompt construction

### Key Subsystems

| Directory | Purpose |
|-----------|---------|
| `src/bridge/` | IDE integration layer (VS Code, JetBrains) — bidirectional messaging, JWT auth, session management |
| `src/coordinator/` | Multi-agent orchestration |
| `src/services/` | External integrations — Anthropic API, MCP, OAuth, LSP, analytics, plugins |
| `src/hooks/` | React hooks including `toolPermission/` for per-tool permission checks |
| `src/components/` | ~140 Ink UI components |
| `src/plugins/` | Plugin system |
| `src/skills/` | Skill system |
| `src/tasks/` | Task management |
| `src/types/` | Centralized TypeScript type definitions |
| `src/utils/` | Shared utilities |
| `src/schemas/` | Zod-based config schemas |
| `src/memdir/` | Persistent memory directory |
| `src/voice/` | Voice input |
| `src/vim/` | Vim mode |
| `src/buddy/` | Companion sprite (Easter egg) |

### Feature Flags (Dead Code Elimination)

Bun strips inactive code at build time via `import { feature } from 'bun:bundle'`. Notable flags: `PROACTIVE`, `KAIROS`, `BRIDGE_MODE`, `DAEMON`, `VOICE_MODE`, `AGENT_TRIGGERS`, `MONITOR_TOOL`, `COORDINATOR_MODE`.

## Code Style & Conventions

- **Imports**: ESM with explicit `.js` extensions (e.g., `from './commands.js'`)
- **Files/Dirs**: kebab-case (`commit-push-pr.ts`, `add-dir/`)
- **Classes/Components**: PascalCase (`BashTool`, `QueryEngine`)
- **Functions**: camelCase (`getCommands()`, `getAllTools()`)
- **Constants**: UPPER_SNAKE_CASE (`ALLOWED_TOOLS`, `FRAME_INTERVAL_MS`)
- **Linter**: Biome (not ESLint). Look for `biome-ignore` directives
- **Ant-only code**: Some imports/features are gated behind `process.env.USER_TYPE === 'ant'` (Anthropic internal)
- **Index pattern**: Features export via `index.ts` files

## Navigation Tips

- **Find a tool**: Look in `src/tools/<ToolName>/` — each tool is a directory with its implementation, UI, and permissions co-located
- **Find a command**: Look in `src/commands/<command-name>/` or `src/commands/<command-name>.ts`
- **Understand permissions**: Start at `src/hooks/toolPermission/`
- **Trace an API call**: Start at `src/QueryEngine.ts` → `src/services/api/`
- **Understand types**: Centralized in `src/types/`, tool-specific types in `src/Tool.ts`
- **Follow the bridge**: IDE integration starts at `src/bridge/bridgeMain.ts`
- **MCP integration**: `src/services/mcp/`

## Terminal Management

- **Always use background terminals** (`isBackground: true`) for every command so a terminal ID is returned
- **Always kill the terminal** after the command completes, whether it succeeds or fails — never leave terminals open
- Do not reuse foreground shell sessions — stale sessions block future terminal operations in Codespaces
- In GitHub Codespaces, agent-spawned terminals may be hidden — they still work. Do not assume a terminal is broken if you cannot see it
- If a terminal appears unresponsive, kill it and create a new one rather than retrying in the same terminal


