# Tool System Architecture

## Tool Interface (`Tool.ts` — 792 lines)

Every tool implements the `Tool<Input, Output, Progress>` interface:

```typescript
interface Tool<Input, Output, Progress> {
  // Identity
  name: string
  searchHint: string            // For ToolSearchTool discovery

  // Core execution
  call(input: Input, ctx: ToolUseContext): AsyncGenerator<Progress, Output>
  description(ctx): string

  // Schema
  inputSchema: ZodSchema        // Zod schema for validation
  inputJSONSchema?: JSONSchema   // Alternative JSON Schema
  strict: boolean               // Strict schema mode for API

  // Permissions
  checkPermissions(input, ctx): PermissionResult
  validateInput(input): ValidationResult

  // Metadata
  isReadOnly(): boolean         // No side effects
  isDestructive(): boolean      // Irreversible operations
  isConcurrencySafe(): boolean  // Can run in parallel

  // Limits
  maxResultSizeChars: number    // Prevent context explosion
  shouldDefer: boolean          // Lazy-load via ToolSearchTool

  // UI
  renderToolResultMessage(result): ReactElement

  // Security
  toAutoClassifierInput(input): string  // For ML classifier
}
```

## `ToolUseContext` — The Execution Context

Every tool call receives this "god context":

```typescript
type ToolUseContext = {
  // State
  getAppState(): AppState
  setAppState(state: AppState): void
  
  // File tracking
  readFileState: Map<string, FileReadState>     // Edit timestamp validation
  updateFileHistoryState: FileHistoryUpdater     // Undo/redo support
  
  // Available capabilities
  options: {
    tools: Tool[]                                // Full tool pool
    agentDefinitions: AgentDefinition[]          // Available agents
  }
  
  // Session tracking
  querySource: string             // "agent:builtin:fork", etc.
  abortController: AbortController
  sessionMetadata: SessionMetadata
  hooks: HookRegistry
  
  // Notifications
  notifyUser: (msg: string) => void
  notifyProgress: (progress: Progress) => void
}
```

## Tool Registry (`tools.ts` — 389 lines)

### Key Functions

| Function | Purpose |
|----------|---------|
| `getAllBaseTools()` | Exhaustive list of all possible tools |
| `getTools()` | Base tools filtered by permission deny rules |
| `assembleToolPool()` | Merges built-in + MCP tools with deduplication |
| `getMergedTools()` | Built-in + MCP tools unfiltered |
| `filterToolsByDenyRules()` | Permission-based filtering |

### Deduplication Rules

1. Built-in tools ALWAYS take precedence over MCP tools with the same name
2. Deny rules can blanket-block entire MCP server prefixes (`mcp__server__*`)
3. Tools sorted by name for deterministic ordering

### Tool Deferral

Tools marked `shouldDefer = true` are NOT included in the initial API prompt. Instead:
1. The model can use `ToolSearchTool` to discover deferred tools
2. `ToolSearchTool` returns the full schema for matched tools
3. The model can then call the discovered tool

This reduces initial prompt size significantly when there are 39+ built-in tools plus MCP tools.

## Complete Tool Inventory

### File Operations (6)
- `FileReadTool` — Read files, images, PDFs, Jupyter notebooks
- `FileWriteTool` — Create or overwrite files (read-before-write enforced)
- `FileEditTool` — Exact string replacement (timestamp validation, 1GiB limit)
- `GlobTool` — File pattern matching search
- `GrepTool` — ripgrep-based content search
- `NotebookEditTool` — Jupyter notebook cell editing

### Shell Execution (2)
- `BashTool` — Shell command execution (10.8K lines of security)
- `PowerShellTool` — Windows PowerShell (Windows-only, feature-gated)

### Web (2)
- `WebFetchTool` — Fetch URL content
- `WebSearchTool` — Web search

### Agents & Teams (4)
- `AgentTool` — Sub-agent spawning (sync, async, remote, worktree, teammate)
- `SendMessageTool` — Inter-agent messaging
- `TeamCreateTool` — Create named agent teams
- `TeamDeleteTool` — Tear down teams

### Tasks (6)
- `TaskCreateTool`, `TaskGetTool`, `TaskListTool`
- `TaskOutputTool`, `TaskStopTool`, `TaskUpdateTool`

### Skills, Config & Discovery (3)
- `SkillTool` — Execute skills/slash commands
- `ConfigTool` — Settings management (Ant-only)
- `ToolSearchTool` — Deferred tool discovery

### MCP & LSP (4)
- `MCPTool` — MCP server tool invocation
- `McpAuthTool` — MCP OAuth authentication
- `ListMcpResourcesTool` — Enumerate MCP resources
- `ReadMcpResourceTool` — Fetch MCP resource content
- `LSPTool` — Language Server Protocol integration

### Mode Control (4)
- `EnterPlanModeTool` / `ExitPlanModeTool`
- `EnterWorktreeTool` / `ExitWorktreeTool`

### Other (8)
- `AskUserQuestionTool` — Prompt user for input
- `TodoWriteTool` — Write TODO items
- `SleepTool` — Proactive mode wait
- `BriefTool` — Brief notifications (Kairos)
- `SyntheticOutputTool` — Structured output
- `ScheduleCronTool` — Scheduled triggers
- `RemoteTriggerTool` — Remote triggers
- `REPLTool` — REPL mode (Ant-only)

### Feature-Gated (stripped from external builds)
Sleep, Cron, Monitor, WebBrowser, Workflows, Snip, Tungsten, DiscoverSkills
