# Architecture Overview

## System Diagram

```
                          ┌─────────────────────────────┐
                          │        main.tsx (804KB)      │
                          │   Commander.js CLI + React/  │
                          │   Ink terminal UI renderer   │
                          └──────────┬──────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
             ┌──────────┐    ┌───────────┐    ┌──────────┐
             │ setup.ts │    │ commands/ │    │ screens/ │
             │ (init)   │    │ (80+ /cmd)│    │ (Doctor, │
             └────┬─────┘    └─────┬─────┘    │  Resume) │
                  │                │           └──────────┘
                  ▼                ▼
          ┌───────────────────────────────┐
          │       QueryEngine.ts          │
          │  Session lifecycle, message   │
          │  management, transcript I/O   │
          └──────────┬────────────────────┘
                     │
                     ▼
          ┌───────────────────────────────┐
          │         query.ts              │
          │  Main API loop (async gen)    │
          │  Streaming, tool execution,   │
          │  compaction, error recovery   │
          └──────────┬────────────────────┘
                     │
        ┌────────────┼──────────────┐
        ▼            ▼              ▼
  ┌──────────┐ ┌──────────┐  ┌───────────┐
  │ Tool.ts  │ │services/ │  │  hooks/   │
  │ tools.ts │ │  api/    │  │permission │
  │ tools/   │ │  mcp/    │  │ system    │
  │ (39+     │ │  oauth/  │  │           │
  │  tools)  │ │  lsp/    │  └───────────┘
  └──────────┘ │analytics/│
               └──────────┘
```

## Data Flow

```
User Input → REPL (Ink/React)
  → QueryEngine.ask()
    → Pre-process (slash commands, file attachments, skill discovery)
    → query() async generator
      → claude.ts → Anthropic Messages API (streaming)
      → Parse streaming response chunks
      → If tool_use blocks: canUseTool() → Tool execution (parallel if safe)
      → Inject tool_results → Loop back to API
      → If no more tool_use: yield final response
    → Run stop hooks
    → Persist transcript to disk (eager, before completion)
  → Render response via Ink components
```

## Tech Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Runtime** | Bun | `bun:bundle` for compile-time feature flags and dead code elimination |
| **Language** | TypeScript (strict) | Full strict mode, Zod v4 schema validation |
| **Terminal UI** | React 18+ / Ink | React components for terminal rendering |
| **CLI Parser** | Commander.js | `@commander-js/extra-typings` for typed CLI args |
| **Schema Validation** | Zod v4 | All tool inputs validated via Zod schemas |
| **Code Search** | ripgrep | Invoked via GrepTool as external binary |
| **API Client** | `@anthropic-ai/sdk` | Official Anthropic SDK |
| **Protocols** | MCP SDK, LSP | Model Context Protocol + Language Server Protocol |
| **Telemetry** | OpenTelemetry + gRPC | Lazy-loaded (~400KB OTel, ~700KB gRPC) |
| **Feature Flags** | GrowthBook | Runtime A/B testing and feature gates |
| **Auth** | OAuth 2.0, JWT | macOS Keychain for credential storage |

## Codebase Scale

- **~1,900 files** of TypeScript source
- **512,000+ lines** of code
- **39 tools**, **80+ commands**, **140+ UI components**
- **Internal codename:** "Tengu"

## Key Design Patterns

1. **Async Generator Loop** — `query.ts` is an `async function*` that yields streaming responses
2. **React/Ink Terminal UI** — Full React component tree for terminal rendering
3. **Compile-Time Dead Code Elimination** — `feature('FLAG')` from `bun:bundle` strips code at build time
4. **Modular Tool System** — 39 tools with standardized interface, Zod schemas, permission checks
5. **Multi-Level Compaction** — snip → microcompact → autocompact → context-collapse
6. **Eager Transcript Persistence** — Writes to disk BEFORE query completes for crash safety
7. **Cache-Aware System Prompt** — Static/dynamic boundary for Anthropic's prompt caching (1h TTL)
8. **MCP as First-Class** — Tools dynamically exposed from connected MCP servers with auth
9. **Plugin Extensibility** — Skills, hooks, and MCP servers bundled as named plugins
10. **Multi-Agent Orchestration** — Coordinator spawns workers with task isolation

## Directory Structure

```
src/
├── main.tsx              # CLI entry (804KB monolith)
├── query.ts              # Main API loop (async generator)
├── QueryEngine.ts        # Session lifecycle
├── Tool.ts               # Tool interface definitions
├── tools.ts              # Tool registry
├── commands.ts           # Command registry
├── setup.ts              # Pre-query initialization
├── context.ts            # Context collection
├── cost-tracker.ts       # Cost tracking
├── history.ts            # Session history
│
├── commands/             # 80+ slash commands
├── tools/                # 39 tool implementations
├── services/             # API, MCP, OAuth, analytics, compact
├── components/           # 140+ React/Ink UI components
├── hooks/                # React hooks (70+ files)
├── bridge/               # IDE integration (VS Code, JetBrains)
├── coordinator/          # Multi-agent coordination
├── plugins/              # Plugin system
├── skills/               # Skill definitions
├── utils/                # Utilities (permissions, settings, auth)
│   └── permissions/      # 27 files, 400KB
├── constants/            # Prompts, OAuth, betas, system
├── keybindings/          # Key bindings
├── vim/                  # Vim mode
├── voice/                # Voice I/O
├── remote/               # Remote sessions
├── server/               # Server mode
├── memdir/               # Persistent memory
├── tasks/                # Task management
├── state/                # State management
├── migrations/           # Config migrations (v1-v11)
├── schemas/              # Zod validation schemas
└── ...                   # 36 directories total
```
