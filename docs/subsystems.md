# Subsystems Guide

> Detailed documentation of Claude Code's major subsystems.

---

## Table of Contents

- [Bridge (IDE Integration)](#bridge-ide-integration)
- [MCP (Model Context Protocol)](#mcp-model-context-protocol)
- [Permission System](#permission-system)
- [Plugin System](#plugin-system)
- [Skill System](#skill-system)
- [Task System](#task-system)
- [Memory System](#memory-system)
- [Coordinator (Multi-Agent)](#coordinator-multi-agent)
- [Voice System](#voice-system)
- [Service Layer](#service-layer)

---

## Bridge (IDE Integration)

**Location:** `src/bridge/`

The bridge is a bidirectional communication layer connecting Claude Code's CLI with IDE extensions (VS Code, JetBrains). It allows the CLI to run as a backend for IDE-based interfaces.

### Architecture

```
┌──────────────────┐         ┌──────────────────────┐
│   IDE Extension  │◄───────►│   Bridge Layer       │
│  (VS Code, JB)   │  JWT    │  (src/bridge/)       │
│                  │  Auth   │                      │
│  - UI rendering  │         │  - Session mgmt      │
│  - File watching │         │  - Message routing    │
│  - Diff display  │         │  - Permission proxy   │
└──────────────────┘         └──────────┬───────────┘
                                        │
                                        ▼
                              ┌──────────────────────┐
                              │   Claude Code Core   │
                              │  (QueryEngine, Tools) │
                              └──────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `bridgeMain.ts` | Main bridge loop — starts the bidirectional channel |
| `bridgeMessaging.ts` | Message protocol (serialize/deserialize) |
| `bridgePermissionCallbacks.ts` | Routes permission prompts to the IDE |
| `bridgeApi.ts` | API surface exposed to the IDE |
| `bridgeConfig.ts` | Bridge configuration |
| `replBridge.ts` | Connects the REPL session to the bridge |
| `jwtUtils.ts` | JWT-based authentication between CLI and IDE |
| `sessionRunner.ts` | Manages bridge session execution |
| `createSession.ts` | Creates new bridge sessions |
| `trustedDevice.ts` | Device trust verification |
| `workSecret.ts` | Workspace-scoped secrets |
| `inboundMessages.ts` | Handles messages coming from the IDE |
| `inboundAttachments.ts` | Handles file attachments from the IDE |
| `types.ts` | TypeScript types for the bridge protocol |

### Feature Flag

The bridge is gated behind the `BRIDGE_MODE` feature flag and is stripped from non-IDE builds.

---

## MCP (Model Context Protocol)

**Location:** `src/services/mcp/`

Claude Code acts as both an **MCP client** (consuming tools/resources from MCP servers) and can run as an **MCP server** (exposing its own tools via `src/entrypoints/mcp.ts`).

### Client Features

- **Tool discovery** — Enumerates tools from connected MCP servers
- **Resource browsing** — Lists and reads MCP-exposed resources
- **Dynamic tool loading** — `ToolSearchTool` discovers tools at runtime
- **Authentication** — `McpAuthTool` handles MCP server auth flows
- **Connectivity monitoring** — `useMcpConnectivityStatus` hook tracks connection health

### Server Mode

When launched via `src/entrypoints/mcp.ts`, Claude Code exposes its own tools and resources via the MCP protocol, allowing other AI agents to use Claude Code as a tool server.

### Related Tools

| Tool | Purpose |
|------|---------|
| `MCPTool` | Invoke tools on connected MCP servers |
| `ListMcpResourcesTool` | List available MCP resources |
| `ReadMcpResourceTool` | Read a specific MCP resource |
| `McpAuthTool` | Authenticate with an MCP server |
| `ToolSearchTool` | Discover deferred tools from MCP servers |

### Configuration

MCP servers are configured via `/mcp` command or settings files. The server approval flow lives in `src/services/mcpServerApproval.tsx`.

---

## Permission System

**Location:** `src/hooks/toolPermission/`

Every tool invocation passes through a centralized permission check before execution.

### Permission Modes

| Mode | Behavior |
|------|----------|
| `default` | Prompts the user for each potentially destructive operation |
| `plan` | Shows the full execution plan, asks once for batch approval |
| `bypassPermissions` | Auto-approves all operations (dangerous — for trusted environments) |
| `auto` | ML-based classifier automatically decides (experimental) |

### How It Works

1. Tool is invoked by the Query Engine
2. `checkPermissions(input, context)` is called on the tool
3. Permission handler checks against configured rules
4. If not auto-approved, user is prompted via terminal or IDE

### Permission Rules

Rules use wildcard patterns to match tool invocations:

```
Bash(git *)           # Allow all git commands without prompt
Bash(npm test)        # Allow 'npm test' specifically
FileEdit(/src/*)      # Allow edits to anything under src/
FileRead(*)           # Allow reading any file
```

### Key Files

| File | Path |
|------|------|
| Permission context | `src/hooks/toolPermission/PermissionContext.ts` |
| Permission handlers | `src/hooks/toolPermission/handlers/` |
| Permission logging | `src/hooks/toolPermission/permissionLogging.ts` |
| Permission types | `src/types/permissions.ts` |

---

## Plugin System

**Location:** `src/plugins/`, `src/services/plugins/`

Claude Code supports installable plugins that can extend its capabilities.

### Structure

| Component | Location | Purpose |
|-----------|----------|---------|
| Plugin loader | `src/services/plugins/` | Discovers and loads plugins |
| Built-in plugins | `src/plugins/builtinPlugins.ts` | Plugins that ship with Claude Code |
| Bundled plugins | `src/plugins/bundled/` | Plugin code bundled into the binary |
| Plugin types | `src/types/plugin.ts` | TypeScript types for plugin API |

### Plugin Lifecycle

1. **Discovery** — Scans plugin directories and marketplace
2. **Installation** — Downloaded and registered (`/plugin` command)
3. **Loading** — Initialized at startup or on-demand
4. **Execution** — Plugins can contribute tools, commands, and prompts
5. **Auto-update** — `usePluginAutoupdateNotification` handles updates

### Related Commands

| Command | Purpose |
|---------|---------|
| `/plugin` | Install, remove, or manage plugins |
| `/reload-plugins` | Reload all installed plugins |

---

## Skill System

**Location:** `src/skills/`

Skills are reusable, named workflows that bundle prompts and tool configurations for specific tasks.

### Structure

| Component | Location | Purpose |
|-----------|----------|---------|
| Bundled skills | `src/skills/bundled/` | Skills that ship with Claude Code |
| Skill loader | `src/skills/loadSkillsDir.ts` | Loads skills from disk |
| MCP skill builders | `src/skills/mcpSkillBuilders.ts` | Creates skills from MCP resources |
| Skill registry | `src/skills/bundledSkills.ts` | Registration of all bundled skills |

### Bundled Skills (16)

| Skill | Purpose |
|-------|---------|
| `batch` | Batch operations across multiple files |
| `claudeApi` | Direct Anthropic API interaction |
| `claudeInChrome` | Chrome extension integration |
| `debug` | Debugging workflows |
| `keybindings` | Keybinding configuration |
| `loop` | Iterative refinement loops |
| `loremIpsum` | Generate placeholder text |
| `remember` | Persist information to memory |
| `scheduleRemoteAgents` | Schedule agents for remote execution |
| `simplify` | Simplify complex code |
| `skillify` | Create new skills from workflows |
| `stuck` | Get unstuck when blocked |
| `updateConfig` | Modify configuration programmatically |
| `verify` / `verifyContent` | Verify code correctness |

### Execution

Skills are invoked via the `SkillTool` or the `/skills` command. Users can also create custom skills.

---

## Task System

**Location:** `src/tasks/`

Manages background and parallel work items — shell tasks, agent tasks, and teammate agents.

### Task Types

| Type | Location | Purpose |
|------|----------|---------|
| `LocalShellTask` | `LocalShellTask/` | Background shell command execution |
| `LocalAgentTask` | `LocalAgentTask/` | Sub-agent running locally |
| `RemoteAgentTask` | `RemoteAgentTask/` | Agent running on a remote machine |
| `InProcessTeammateTask` | `InProcessTeammateTask/` | Parallel teammate agent |
| `DreamTask` | `DreamTask/` | Background "dreaming" process |
| `LocalMainSessionTask` | `LocalMainSessionTask.ts` | Main session as a task |

### Task Tools

| Tool | Purpose |
|------|---------|
| `TaskCreateTool` | Create a new background task |
| `TaskUpdateTool` | Update task status |
| `TaskGetTool` | Retrieve task details |
| `TaskListTool` | List all tasks |
| `TaskOutputTool` | Get task output |
| `TaskStopTool` | Stop a running task |

---

## Memory System

**Location:** `src/memdir/`

Claude Code's persistent memory system, based on `CLAUDE.md` files.

### Memory Hierarchy

| Scope | Location | Purpose |
|-------|----------|---------|
| Project memory | `CLAUDE.md` in project root | Project-specific facts, conventions |
| User memory | `~/.claude/CLAUDE.md` | User preferences, cross-project |
| Extracted memories | `src/services/extractMemories/` | Auto-extracted from conversations |
| Team memory sync | `src/services/teamMemorySync/` | Shared team knowledge |

### Related

- `/memory` command for managing memories
- `remember` skill for persisting information
- `useMemoryUsage` hook for tracking memory size

---

## Coordinator (Multi-Agent)

**Location:** `src/coordinator/`

Orchestrates multiple agents working in parallel on different aspects of a task.

### How It Works

- `coordinatorMode.ts` manages the coordinator lifecycle
- `TeamCreateTool` and `TeamDeleteTool` manage agent teams
- `SendMessageTool` enables inter-agent communication
- `AgentTool` spawns sub-agents

Gated behind the `COORDINATOR_MODE` feature flag.

---

## Voice System

**Location:** `src/voice/`

Voice input/output support for hands-free interaction.

### Components

| File | Location | Purpose |
|------|----------|---------|
| Voice service | `src/services/voice.ts` | Core voice processing |
| STT streaming | `src/services/voiceStreamSTT.ts` | Speech-to-text streaming |
| Key terms | `src/services/voiceKeyterms.ts` | Domain-specific vocabulary |
| Voice hooks | `src/hooks/useVoice.ts`, `useVoiceEnabled.ts`, `useVoiceIntegration.tsx` | React hooks |
| Voice command | `src/commands/voice/` | `/voice` slash command |

Gated behind the `VOICE_MODE` feature flag.

---

## Service Layer

**Location:** `src/services/`

External integrations and shared services.

| Service | Path | Purpose |
|---------|------|---------|
| **API** | `api/` | Anthropic SDK client, file uploads, bootstrap |
| **MCP** | `mcp/` | MCP client connections and tool discovery |
| **OAuth** | `oauth/` | OAuth 2.0 authentication flow |
| **LSP** | `lsp/` | Language Server Protocol manager |
| **Analytics** | `analytics/` | GrowthBook feature flags, telemetry |
| **Plugins** | `plugins/` | Plugin loader and marketplace |
| **Compact** | `compact/` | Conversation context compression |
| **Policy Limits** | `policyLimits/` | Organization rate limits/quota |
| **Remote Settings** | `remoteManagedSettings/` | Enterprise managed settings sync |
| **Token Estimation** | `tokenEstimation.ts` | Token count estimation |
| **Team Memory** | `teamMemorySync/` | Team knowledge synchronization |
| **Tips** | `tips/` | Contextual usage tips |
| **Agent Summary** | `AgentSummary/` | Agent work summaries |
| **Prompt Suggestion** | `PromptSuggestion/` | Suggested follow-up prompts |
| **Session Memory** | `SessionMemory/` | Session-level memory |
| **Magic Docs** | `MagicDocs/` | Documentation generation |
| **Auto Dream** | `autoDream/` | Background ideation |
| **x402** | `x402/` | x402 payment protocol |

---

## See Also

- [Architecture](architecture.md) — How subsystems connect in the core pipeline
- [Tools Reference](tools.md) — Tools related to each subsystem
- [Commands Reference](commands.md) — Commands for managing subsystems
- [Exploration Guide](exploration-guide.md) — Finding subsystem source code
