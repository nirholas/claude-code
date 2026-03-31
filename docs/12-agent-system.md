# Agent & Multi-Agent System

## AgentTool (`src/tools/AgentTool/` — 234KB)

### Key Files

| File | Size | Purpose |
|------|------|---------|
| `AgentTool.tsx` | 234KB | Main agent tool implementation |
| `runAgent.ts` | 36KB | Async agent lifecycle management |
| `loadAgentsDir.ts` | 26KB | Agent discovery and loading |
| `agentToolUtils.ts` | 23KB | Result extraction and handoff |
| `prompt.ts` | 17KB | Agent capability advertisement |
| `forkSubagent.ts` | 8.7KB | Fork subagent (experimental) |

### Agent Definition Format

```yaml
---
name: my-agent
description: What this agent does
model: claude-sonnet-4-6       # Optional model override
background: true                # Run asynchronously
effort: high                    # Effort level
allowedTools:                   # Tool restrictions
  - Read
  - Grep
  - Glob
requiredMcpServers:             # MCP server requirements
  - github
---

Agent prompt content here...
```

### Execution Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **Sync** | Wait for completion, direct result | Simple research tasks |
| **Async** | Fire-and-forget, background tracking | Long-running operations |
| **Remote** | CCR (Cloud Code Runtime) isolation | Untrusted execution |
| **Worktree** | Isolated git worktree per agent | Parallel code changes |
| **Teammate** | Named agents in teams | Coordinated parallel work |

### Agent Discovery & Loading

```
1. Built-in agents (general-purpose, explore, plan, verification, etc.)
2. Project agents (.claude/agents/)
3. User agents (~/.claude/agents/)
4. Plugin-provided agents
```

### Permission Model

- `Agent(name)` — allow/deny specific agents
- `Agent(*)` — blanket allow/deny all
- Agents disabled if required MCP server is missing
- Auto-wait for pending MCP servers (30s timeout)

### Recursive Fork Guard

Prevents infinite agent spawning:
- Detects `agent:builtin:fork` in querySource chain
- Fork-child cannot spawn another fork
- Compaction-resistant (survives message rewrites)

### Default Agent Prompt

```
You are an agent for Claude Code, Anthropic's official CLI for Claude.
Given the user's message, you should use the tools available to complete
the task. Complete the task fully—don't gold-plate, but don't leave it
half-done. When you complete the task, respond with a concise report
covering what was done and any key findings.
```

## Coordinator Mode

**Location:** `src/coordinator/coordinatorMode.ts` (19KB)

Primary agent spawns named worker agents for parallel execution.

### Worker Results

Delivered as XML in user-role messages:

```xml
<task-notification>
  <task-id>abc123</task-id>
  <status>completed|failed|killed</status>
  <summary>What the worker did</summary>
  <result>Detailed output</result>
  <usage>Token usage stats</usage>
</task-notification>
```

### Coordinator Rules

- Answer questions directly (no unnecessary delegation)
- Workers are async — no inter-worker polling
- Parallel research tasks, serial write-heavy implementation
- Synthesize findings before delegating follow-up

## Team System

- `TeamCreateTool` — create named teams
- `TeamDeleteTool` — tear down teams
- `SendMessageTool` — inter-agent messaging (via UDS)
- Flat roster enforcement (no nested teammates)
- In-process teammates cannot spawn background agents
