# Context & Memory Management

## Context Assembly (`context.ts`)

Two memoized functions provide context for each conversation:

### `getSystemContext()`
- Git branch name, status (truncated at 2K chars), recent commits
- Git user name
- Cache-breaker injection (via `/break-cache` command, Ant-only)

### `getUserContext()`
- CLAUDE.md memory files (filtered for auto-injection)
- Current date
- Language preference

Both are cached for the conversation's duration.

## Memory System (`src/memdir/`)

### Structure
```
~/.claude/projects/{hash}/memory/
  ├── MEMORY.md          # Index file (always loaded into context)
  └── *.md               # Individual memory files with YAML frontmatter
```

### Memory File Format
```markdown
---
name: memory-name
description: One-line description (used for relevance matching)
type: user|feedback|project|reference
---

Memory content here...
```

### Memory Types
| Type | Purpose |
|------|---------|
| `user` | User's role, preferences, knowledge |
| `feedback` | Guidance on approach (what to do/avoid) |
| `project` | Ongoing work, goals, decisions |
| `reference` | Pointers to external resources |

### Auto-Memory Extraction
`src/services/extractMemories/` automatically extracts memories from conversations.

## Compaction System (`src/services/compact/`)

Multi-level compaction when context grows too large:

| Level | Name | Action | Impact |
|-------|------|--------|--------|
| 1 | **Snip** | Remove old messages | Least aggressive |
| 2 | **Microcompact** | Clear old function results | Medium |
| 3 | **Autocompact** | Summarize conversation history | Aggressive |
| 4 | **Context-collapse** | Full context reconstruction | Most aggressive |

### Function Result Clearing

When `CACHED_MICROCOMPACT` feature is enabled:
- Old tool results automatically cleared from context
- Most recent N results always preserved
- Model informed via system prompt section

## Session History (`history.ts`)

| Property | Value |
|----------|-------|
| **Format** | JSONL |
| **Location** | `~/.claude/history.jsonl` |
| **Max items** | 100 per project |
| **File permissions** | `0o600` (owner only) |

### History Entry
```typescript
{
  display: string           // Display text (up-arrow history)
  pastedContent: Map        // Inline or hash-referenced paste data
  timestamp: number         // Unix timestamp
  projectPath: string       // Project directory
  sessionId: string         // Session identifier
}
```

### Large Paste Handling
- Large pastes stored separately by content hash
- Referenced in history entry by hash
- Prevents inlining secrets in history file

### Write Safety
- Deferred flush: entries queued in memory, async-flushed to disk
- Skip-set: tracks already-flushed timestamps to prevent race conditions
