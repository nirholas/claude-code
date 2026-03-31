# Query Engine & Core Loop

## `query.ts` (1,729 lines) — The Main API Loop

### Pattern

Async generator (`async function*`) that yields streaming responses. This is the heart of Claude Code.

### Control Flow

```
User message
  → Build API request (messages + tools + system prompt)
  → Stream to Anthropic Messages API
  → Parse streaming chunks
  │
  ├─ If tool_use blocks detected:
  │   ├── Permission check: canUseTool()
  │   │   └── hooks → classifier → rules → user prompt
  │   ├── Execute tools (parallel where isConcurrencySafe=true)
  │   ├── Collect tool results
  │   ├── Inject tool_result messages
  │   └── Loop back to API call
  │
  ├─ If error:
  │   ├── Prompt too long (413):
  │   │   └── collapse drain → reactive compact → surface error
  │   ├── Max output tokens:
  │   │   └── escalate 8K → 64K automatically (no user intervention)
  │   └── Media size errors: graceful handling
  │
  └─ If done (no more tool_use):
      ├── Yield final response
      ├── Run stop hooks (post-response evaluation)
      └── Generate tool-use summaries (background)
```

### Multi-Level Context Compaction

When context grows too large, each level is tried in order:

| Level | Name | Action |
|-------|------|--------|
| 1 | **Snip** | Remove old messages |
| 2 | **Microcompact** | Clear old function results |
| 3 | **Autocompact** | Summarize conversation history |
| 4 | **Context-collapse** | Most aggressive compaction |

### Error Recovery

| Error | Recovery Strategy |
|-------|-------------------|
| Prompt too long (413) | Collapse drain → reactive compact → surface |
| Max output tokens (8K) | Auto-escalate to 64K without user intervention |
| Media size errors | Graceful handling with user notification |
| Rate limits | Exponential backoff (delegated to withRetry.ts) |
| Thinking mode mismatch | Strip thinking blocks on fallback |

### Streaming Tool Execution

Tools marked `isConcurrencySafe=true` execute in parallel while the model streams. Results are collected asynchronously.

### Abort Handling

When the user interrupts (Ctrl+C), the system:
1. Cancels the API stream
2. Generates synthetic `tool_result` messages for in-progress tools
3. Preserves conversation state for resume

---

## `QueryEngine.ts` (1,295 lines) — Session State Manager

### Purpose

Stateful class that owns one conversation's lifecycle.

### Key Responsibilities

| Responsibility | Details |
|----------------|---------|
| Message management | Maintains mutable message array across turns |
| Transcript persistence | **Eager** — writes to disk BEFORE query completes (crash-safe) |
| Input processing | Slash commands, file attachments, skill discovery |
| System prompt assembly | Custom + memory mechanics + session-specific sections |
| Permission tracking | Tracks denials, orphaned permission recovery on resume |
| Structured output | Tracks StructuredOutputTool calls with retry limits |
| Cost tracking | Coordinates with `cost-tracker.ts` |
| File history | Attribution and undo/redo state |

### Eager Persistence

```typescript
// Transcript is persisted BEFORE query yields result
// This prevents data loss on process kill (Ctrl+C, crash, OOM)
// Pattern: fire-and-forget Promise (no await to avoid blocking)
```

### Orphaned Permission Recovery

When resuming a session, if a permission dialog was interrupted mid-session, QueryEngine recovers the state and re-prompts the user.

### SDKMessage Events

The query engine yields typed SDK events:
- `SDKMessage` — assistant responses, tool calls, tool results
- `SDKPermissionDenial` — when user denies a tool call
- Session tracking metadata
