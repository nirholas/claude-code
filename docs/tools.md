# Tools Reference

> Complete catalog of all ~40 agent tools in Claude Code.

---

## Overview

Every tool lives in `src/tools/<ToolName>/` as a self-contained module. Each tool defines:

- **Input schema** — Zod-validated parameters
- **Permission model** — What requires user approval
- **Execution logic** — The tool's implementation
- **UI components** — Terminal rendering for invocation and results
- **Concurrency safety** — Whether it can run in parallel

Tools are registered in `src/tools.ts` and invoked by the Query Engine during LLM tool-call loops.

### Tool Definition Pattern

```typescript
export const MyTool = buildTool({
  name: 'MyTool',
  aliases: ['my_tool'],
  description: 'What this tool does',
  inputSchema: z.object({
    param: z.string(),
  }),
  async call(args, context, canUseTool, parentMessage, onProgress) {
    // Execute and return { data: result, newMessages?: [...] }
  },
  async checkPermissions(input, context) { /* Permission checks */ },
  isConcurrencySafe(input) { /* Can run in parallel? */ },
  isReadOnly(input) { /* Non-destructive? */ },
  prompt(options) { /* System prompt injection */ },
  renderToolUseMessage(input, options) { /* UI for invocation */ },
  renderToolResultMessage(content, progressMessages, options) { /* UI for result */ },
})
```

**Directory structure per tool:**

```
src/tools/MyTool/
├── MyTool.ts        # Main implementation
├── UI.tsx           # Terminal rendering
├── prompt.ts        # System prompt contribution
└── utils.ts         # Tool-specific helpers
```

---

## File System Tools

| Tool | Description | Read-Only |
|------|-------------|-----------|
| **FileReadTool** | Read file contents (text, images, PDFs, notebooks). Supports line ranges | Yes |
| **FileWriteTool** | Create or overwrite files | No |
| **FileEditTool** | Partial file modification via string replacement | No |
| **GlobTool** | Find files matching glob patterns (e.g. `**/*.ts`) | Yes |
| **GrepTool** | Content search using ripgrep (regex-capable) | Yes |
| **NotebookEditTool** | Edit Jupyter notebook cells | No |
| **TodoWriteTool** | Write to a structured todo/task file | No |

## Shell & Execution Tools

| Tool | Description | Read-Only |
|------|-------------|-----------|
| **BashTool** | Execute shell commands in bash | No |
| **PowerShellTool** | Execute PowerShell commands (Windows) | No |
| **REPLTool** | Run code in a REPL session (Python, Node, etc.) | No |

## Agent & Orchestration Tools

| Tool | Description | Read-Only |
|------|-------------|-----------|
| **AgentTool** | Spawn a sub-agent for complex tasks | No |
| **SendMessageTool** | Send messages between agents | No |
| **TeamCreateTool** | Create a team of parallel agents | No |
| **TeamDeleteTool** | Remove a team agent | No |
| **EnterPlanModeTool** | Switch to planning mode (no execution) | No |
| **ExitPlanModeTool** | Exit planning mode, resume execution | No |
| **EnterWorktreeTool** | Isolate work in a git worktree | No |
| **ExitWorktreeTool** | Exit worktree isolation | No |
| **SleepTool** | Pause execution (proactive mode) | Yes |
| **SyntheticOutputTool** | Generate structured output | Yes |

## Task Management Tools

| Tool | Description | Read-Only |
|------|-------------|-----------|
| **TaskCreateTool** | Create a new background task | No |
| **TaskUpdateTool** | Update a task's status or details | No |
| **TaskGetTool** | Get details of a specific task | Yes |
| **TaskListTool** | List all tasks | Yes |
| **TaskOutputTool** | Get output from a completed task | Yes |
| **TaskStopTool** | Stop a running task | No |

## Web Tools

| Tool | Description | Read-Only |
|------|-------------|-----------|
| **WebFetchTool** | Fetch content from a URL | Yes |
| **WebSearchTool** | Search the web | Yes |

## MCP (Model Context Protocol) Tools

| Tool | Description | Read-Only |
|------|-------------|-----------|
| **MCPTool** | Invoke tools on connected MCP servers | Varies |
| **ListMcpResourcesTool** | List resources exposed by MCP servers | Yes |
| **ReadMcpResourceTool** | Read a specific MCP resource | Yes |
| **McpAuthTool** | Handle MCP server authentication | No |
| **ToolSearchTool** | Discover deferred/dynamic tools from MCP servers | Yes |

## Integration Tools

| Tool | Description | Read-Only |
|------|-------------|-----------|
| **LSPTool** | Language Server Protocol operations (go-to-definition, find references, etc.) | Yes |
| **SkillTool** | Execute a registered skill | Varies |

## Scheduling & Triggers

| Tool | Description | Read-Only |
|------|-------------|-----------|
| **ScheduleCronTool** | Create a scheduled cron trigger | No |
| **RemoteTriggerTool** | Fire a remote trigger | No |

## Utility Tools

| Tool | Description | Read-Only |
|------|-------------|-----------|
| **AskUserQuestionTool** | Prompt the user for input during execution | Yes |
| **BriefTool** | Generate a brief/summary | Yes |
| **ConfigTool** | Read or modify Claude Code configuration | No |

---

## Permission Model

Every tool invocation passes through the permission system (`src/hooks/toolPermission/`). Permission modes:

| Mode | Behavior |
|------|----------|
| `default` | Prompt the user for each potentially destructive operation |
| `plan` | Show the full plan, ask once |
| `bypassPermissions` | Auto-approve everything (dangerous) |
| `auto` | ML-based classifier decides |

Permission rules use wildcard patterns:

```
Bash(git *)           # Allow all git commands
FileEdit(/src/*)      # Allow edits to anything in src/
FileRead(*)           # Allow reading any file
```

Each tool implements `checkPermissions()` returning `{ granted: boolean, reason?, prompt? }`.

---

## Tool Presets

Tools are grouped into presets in `src/tools.ts` for different contexts (e.g. read-only tools for code review, full toolset for development).

---

## See Also

- [Architecture](architecture.md) — How tools fit into the overall pipeline
- [Subsystems Guide](subsystems.md) — MCP, permissions, and other tool-related subsystems
- [Exploration Guide](exploration-guide.md) — How to read tool source code
