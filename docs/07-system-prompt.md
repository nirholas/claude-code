# System Prompt Architecture

**Location:** `src/constants/prompts.ts` (54KB) + `src/constants/systemPromptSections.ts`

## Cache-Aware Section System

The system prompt is split into **static** (cacheable) and **dynamic** (per-session) sections, separated by `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`:

```
┌─── Static Content (cacheScope: 'global', 1h TTL) ──┐
│ Introduction                                         │
│ System section                                       │
│ Doing Tasks                                          │
│ Actions                                              │
│ Using Your Tools                                     │
│ Tone and Style                                       │
│ Output Efficiency                                    │
├─── __SYSTEM_PROMPT_DYNAMIC_BOUNDARY__ ──────────────┤
│ Session-Specific Guidance (varies per session)       │
│ Memory (CLAUDE.md files)                             │
│ Environment Info (CWD, model, platform)              │
│ Language Preference                                  │
│ Output Style                                         │
│ MCP Instructions (connected servers)                 │
│ Scratchpad Directory                                 │
│ Function Result Clearing                             │
│ Token Budget (if active)                             │
│ Numeric Length Anchors (Ant-only)                    │
└──────────────────────────────────────────────────────┘
```

## Implementation

```typescript
// Cacheable section:
systemPromptSection('name', () => content)

// Dynamic section (invalidates cache):
DANGEROUS_uncachedSystemPromptSection('name', () => content, 'reason')
```

## Full Prompt Sections

### 1. Introduction

> You are Claude Code, Anthropic's official CLI for Claude.
> You are an interactive agent that helps users with software engineering tasks.

Includes the Cyber Risk Instruction (owned by Safeguards team — requires review from David Forsythe, Kyla Guru to modify):

> Assist with authorized security testing, defensive security, CTF challenges, and educational contexts. Refuse requests for destructive techniques, DoS attacks, mass targeting, supply chain compromise, or detection evasion for malicious purposes.

### 2. System Section

- All text output is displayed to the user (markdown, CommonMark)
- Tools execute in user-selected permission mode
- `<system-reminder>` tags are system-injected
- Prompt injection detection guidance
- Hook feedback treated as user input
- Automatic conversation compression

### 3. Doing Tasks

Core rules:
- Read code before proposing changes
- Don't create unnecessary files
- Don't give time estimates
- Diagnose before switching tactics
- Avoid security vulnerabilities

Code style rules:
- Don't add unrequested features/refactoring
- Don't add error handling for impossible scenarios
- Don't create one-time abstractions
- No backwards-compatibility hacks

**Ant-only additions:**
- No comments by default (only when WHY is non-obvious)
- Verify work actually works before reporting complete
- Spot misconceptions and adjacent bugs
- Report outcomes faithfully — never claim false success

### 4. Executing Actions with Care

Risk assessment framework:
- **Freely take:** Local, reversible actions (editing files, running tests)
- **Confirm first:** Destructive, hard-to-reverse, or shared-state actions
- Examples: `git push`, `rm -rf`, creating PRs, sending messages

### 5. Using Your Tools

Dedicated tool precedence:
- Read → FileReadTool (not cat/head/tail)
- Edit → FileEditTool (not sed/awk)
- Write → FileWriteTool (not cat heredoc)
- Search → GlobTool/GrepTool (not find/grep)
- Bash → only for system commands

Parallel tool calls when independent; sequential when dependent.

### 6. Tone and Style

- No emojis unless requested
- Concise responses (external) / flowing prose (Ant)
- `file_path:line_number` for code references
- `owner/repo#123` for GitHub references
- No colon before tool calls

### 7. Output Efficiency

**External users:** "Go straight to the point. Be extra concise."
**Ant users:** Extended guidance on communicating like a thoughtful colleague, inverted pyramid structure, no fluff.

### 8. Session-Specific Guidance (Dynamic)

- Agent tool usage patterns
- Explore vs. direct search guidance
- Skill invocation syntax (`/<skill-name>`)
- Verification agent contract (Ant-only, feature-gated)

### 9. Environment Info (Dynamic)

- Working directory, git status, platform, shell, OS version
- Model name, ID, knowledge cutoff
- Available platforms (CLI, desktop, web, IDE extensions)
- Fast mode information

### 10. Memory (Dynamic)

CLAUDE.md files loaded and injected. Filtered for auto-injection to prevent circular inclusion.

### 11. MCP Instructions (Dynamic)

Per-connected-server instructions injected under `# MCP Server Instructions`.

### 12. Scratchpad (Dynamic)

Per-session temp directory for agent file operations.

### 13. Function Result Clearing (Dynamic)

Old tool results auto-cleared to free context. Recent N results always kept.

## Ant-Only Features

| Feature | Description |
|---------|-------------|
| Numeric length anchors | ≤25 words between tool calls, ≤100 in final responses |
| No-comment default | Only comment when WHY is non-obvious |
| Assertiveness | "You're a collaborator, not just an executor" |
| Verification agent | Adversarial verification for 3+ file edits |
| Faithful reporting | Never claim false success |
| `/issue` and `/share` | Recommend for Claude Code bugs |
| Slack feedback | Offer to post ccshare links to #claude-code-feedback |

## Proactive Mode Prompt

When proactive mode is active, the system prompt switches to autonomous agent instructions with tick-based wake-up, sleep management, terminal focus awareness, and bias toward action.

## Undercover Mode

When `isUndercover()` is true (Ant-only), ALL model names and IDs are stripped from the system prompt to prevent leaking internal model names into public artifacts.
