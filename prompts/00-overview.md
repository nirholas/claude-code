# Build-Out Prompt Index

Run these prompts **in order** in separate chat sessions. Each one is self-contained.

| # | File | What It Does | Depends On |
|---|------|-------------|------------|
| 01 | `01-install-bun-and-deps.md` | Install Bun runtime, install all dependencies | — |
| 02 | `02-runtime-shims.md` | Create `bun:bundle` runtime shim + `MACRO` globals so code runs without Bun's bundler | 01 |
| 03 | `03-build-config.md` | Create esbuild-based build system that bundles the CLI to a single runnable file | 01, 02 |
| 04 | `04-fix-mcp-server.md` | Fix TypeScript errors in `mcp-server/` and make it build | 01 |
| 05 | `05-env-and-auth.md` | Set up `.env` file, API key config, OAuth stubs | 01 |
| 06 | `06-ink-react-terminal-ui.md` | Verify and fix the Ink/React terminal rendering pipeline | 01, 02, 03 |
| 07 | `07-tool-system.md` | Audit and wire up the 40+ tool implementations (BashTool, FileEditTool, etc.) | 01–03 |
| 08 | `08-command-system.md` | Audit and wire up the 50+ slash commands (/commit, /review, etc.) | 01–03, 07 |
| 09 | `09-query-engine.md` | Get the core LLM call loop (QueryEngine) functional — streaming, tool calls, retries | 01–03, 05, 07 |
| 10 | `10-context-and-prompts.md` | Wire up system prompt construction, context gathering, memory system | 01–03 |
| 11 | `11-mcp-integration.md` | Get MCP client/server integration working — registry, tool discovery | 01–04 |
| 12 | `12-services-layer.md` | Wire up analytics, policy limits, remote settings, session memory | 01–03, 05 |
| 13 | `13-bridge-ide.md` | Stub out or implement the VS Code / JetBrains bridge layer | 01–03, 09 |
| 14 | `14-dev-runner.md` | Create `npm run dev` / `bun run dev` script that launches the CLI in dev mode | 01–03 |
| 15 | `15-production-bundle.md` | Create production build: minified bundle, platform-specific packaging | 03 |
| 16 | `16-testing.md` | Add test infrastructure (vitest), write smoke tests for core subsystems | All |

## Quick Start

1. Open a new Copilot chat
2. Paste the contents of `01-install-bun-and-deps.md`
3. Follow the instructions / let the agent run
4. Repeat for `02`, `03`, etc.

## Notes

- Prompts 07–13 can be run somewhat in **parallel** (they touch different subsystems)
- If a prompt fails, fix the issue before moving to the next one
- Each prompt is designed to be **independently verifiable** — it tells you how to confirm it worked
