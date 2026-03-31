# Commands Reference

> Complete catalog of all slash commands in Claude Code.

---

## Overview

Commands are user-facing actions invoked with a `/` prefix in the REPL (e.g., `/commit`, `/review`). They live in `src/commands/` and are registered in `src/commands.ts`.

### Command Types

| Type | Description | Example |
|------|-------------|---------|
| **PromptCommand** | Sends a formatted prompt to the LLM with injected tools | `/review`, `/commit` |
| **LocalCommand** | Runs in-process, returns plain text | `/cost`, `/version` |
| **LocalJSXCommand** | Runs in-process, returns React JSX | `/install`, `/doctor` |

### Command Definition Pattern

```typescript
const command = {
  type: 'prompt',
  name: 'my-command',
  description: 'What this command does',
  progressMessage: 'working...',
  allowedTools: ['Bash(git *)', 'FileRead(*)'],
  source: 'builtin',
  async getPromptForCommand(args, context) {
    return [{ type: 'text', text: '...' }]
  },
} satisfies Command
```

---

## Git & Version Control

| Command | Source | Description |
|---------|--------|-------------|
| `/commit` | `commit.ts` | Create a git commit with an AI-generated message |
| `/commit-push-pr` | `commit-push-pr.ts` | Commit, push, and create a PR in one step |
| `/branch` | `branch/` | Create or switch git branches |
| `/diff` | `diff/` | View file changes (staged, unstaged, or against a ref) |
| `/pr_comments` | `pr_comments/` | View and address PR review comments |
| `/rewind` | `rewind/` | Revert to a previous state |

## Code Quality

| Command | Source | Description |
|---------|--------|-------------|
| `/review` | `review.ts` | AI-powered code review of staged/unstaged changes |
| `/security-review` | `security-review.ts` | Security-focused code review |
| `/advisor` | `advisor.ts` | Get architectural or design advice |
| `/bughunter` | `bughunter/` | Find potential bugs in the codebase |

## Session & Context

| Command | Source | Description |
|---------|--------|-------------|
| `/compact` | `compact/` | Compress conversation context to fit more history |
| `/context` | `context/` | Visualize current context (files, memory, etc.) |
| `/resume` | `resume/` | Restore a previous conversation session |
| `/session` | `session/` | Manage sessions (list, switch, delete) |
| `/share` | `share/` | Share a session via link |
| `/export` | `export/` | Export conversation to a file |
| `/summary` | `summary/` | Generate a summary of the current session |
| `/clear` | `clear/` | Clear the conversation history |

## Configuration & Settings

| Command | Source | Description |
|---------|--------|-------------|
| `/config` | `config/` | View or modify Claude Code settings |
| `/permissions` | `permissions/` | Manage tool permission rules |
| `/theme` | `theme/` | Change the terminal color theme |
| `/output-style` | `output-style/` | Change output formatting style |
| `/color` | `color/` | Toggle color output |
| `/keybindings` | `keybindings/` | View or customize keybindings |
| `/vim` | `vim/` | Toggle vim mode for input |
| `/effort` | `effort/` | Adjust response effort level |
| `/model` | `model/` | Switch the active model |
| `/privacy-settings` | `privacy-settings/` | Manage privacy/data settings |
| `/fast` | `fast/` | Toggle fast mode (shorter responses) |
| `/brief` | `brief.ts` | Toggle brief output mode |

## Memory & Knowledge

| Command | Source | Description |
|---------|--------|-------------|
| `/memory` | `memory/` | Manage persistent memory (CLAUDE.md files) |
| `/add-dir` | `add-dir/` | Add a directory to the project context |
| `/files` | `files/` | List files in the current context |

## MCP & Plugins

| Command | Source | Description |
|---------|--------|-------------|
| `/mcp` | `mcp/` | Manage MCP server connections |
| `/plugin` | `plugin/` | Install, remove, or manage plugins |
| `/reload-plugins` | `reload-plugins/` | Reload all installed plugins |
| `/skills` | `skills/` | View and manage skills |

## Authentication

| Command | Source | Description |
|---------|--------|-------------|
| `/login` | `login/` | Authenticate with Anthropic |
| `/logout` | `logout/` | Sign out |
| `/oauth-refresh` | `oauth-refresh/` | Refresh OAuth tokens |

## Tasks & Agents

| Command | Source | Description |
|---------|--------|-------------|
| `/tasks` | `tasks/` | Manage background tasks |
| `/agents` | `agents/` | Manage sub-agents |
| `/ultraplan` | `ultraplan.tsx` | Generate a detailed execution plan |
| `/plan` | `plan/` | Enter planning mode |

## Diagnostics & Status

| Command | Source | Description |
|---------|--------|-------------|
| `/doctor` | `doctor/` | Run environment diagnostics |
| `/status` | `status/` | Show system and session status |
| `/stats` | `stats/` | Show session statistics |
| `/cost` | `cost/` | Display token usage and estimated cost |
| `/version` | `version.ts` | Show Claude Code version |
| `/usage` | `usage/` | Show detailed API usage |
| `/extra-usage` | `extra-usage/` | Show extended usage details |
| `/rate-limit-options` | `rate-limit-options/` | View rate limit configuration |

## Installation & Setup

| Command | Source | Description |
|---------|--------|-------------|
| `/install` | `install.tsx` | Install or update Claude Code |
| `/upgrade` | `upgrade/` | Upgrade to the latest version |
| `/init` | `init.ts` | Initialize a project (create CLAUDE.md) |
| `/init-verifiers` | `init-verifiers.ts` | Set up verifier hooks |
| `/onboarding` | `onboarding/` | Run the first-time setup wizard |
| `/terminalSetup` | `terminalSetup/` | Configure terminal integration |

## IDE & Desktop Integration

| Command | Source | Description |
|---------|--------|-------------|
| `/bridge` | `bridge/` | Manage IDE bridge connections |
| `/bridge-kick` | `bridge-kick.ts` | Force-restart the IDE bridge |
| `/ide` | `ide/` | Open in IDE |
| `/desktop` | `desktop/` | Hand off to the desktop app |
| `/mobile` | `mobile/` | Hand off to the mobile app |
| `/teleport` | `teleport/` | Transfer session to another device |

## Remote & Environment

| Command | Source | Description |
|---------|--------|-------------|
| `/remote-env` | `remote-env/` | Configure remote environment |
| `/remote-setup` | `remote-setup/` | Set up remote session |
| `/env` | `env/` | View environment variables |
| `/sandbox-toggle` | `sandbox-toggle/` | Toggle sandbox mode |

## Misc

| Command | Source | Description |
|---------|--------|-------------|
| `/help` | `help/` | Show help and available commands |
| `/exit` | `exit/` | Exit Claude Code |
| `/copy` | `copy/` | Copy content to clipboard |
| `/feedback` | `feedback/` | Send feedback to Anthropic |
| `/release-notes` | `release-notes/` | View release notes |
| `/rename` | `rename/` | Rename the current session |
| `/tag` | `tag/` | Tag the current session |
| `/insights` | `insights.ts` | Show codebase insights |
| `/stickers` | `stickers/` | Easter egg — stickers |
| `/good-claude` | `good-claude/` | Easter egg — praise Claude |
| `/voice` | `voice/` | Toggle voice input mode |
| `/chrome` | `chrome/` | Chrome extension integration |
| `/issue` | `issue/` | File a GitHub issue |
| `/statusline` | `statusline.tsx` | Customize the status line |
| `/thinkback` | `thinkback/` | Replay Claude's thinking process |
| `/thinkback-play` | `thinkback-play/` | Animated thinking replay |
| `/passes` | `passes/` | Multi-pass execution |
| `/x402` | `x402/` | x402 payment protocol integration |

## Internal / Debug Commands

| Command | Source | Description |
|---------|--------|-------------|
| `/ant-trace` | `ant-trace/` | Anthropic-internal tracing |
| `/autofix-pr` | `autofix-pr/` | Auto-fix PR issues |
| `/backfill-sessions` | `backfill-sessions/` | Backfill session data |
| `/break-cache` | `break-cache/` | Invalidate caches |
| `/btw` | `btw/` | "By the way" interjection |
| `/ctx_viz` | `ctx_viz/` | Context visualization (debug) |
| `/debug-tool-call` | `debug-tool-call/` | Debug a specific tool call |
| `/heapdump` | `heapdump/` | Dump heap for memory analysis |
| `/hooks` | `hooks/` | Manage hook scripts |
| `/mock-limits` | `mock-limits/` | Mock rate limits for testing |
| `/perf-issue` | `perf-issue/` | Report performance issues |
| `/reset-limits` | `reset-limits/` | Reset rate limit counters |

---

## See Also

- [Architecture](architecture.md) — How the command system fits into the pipeline
- [Tools Reference](tools.md) — Agent tools (different from slash commands)
- [Exploration Guide](exploration-guide.md) — Finding command source code
