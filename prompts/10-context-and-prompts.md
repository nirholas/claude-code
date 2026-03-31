# Prompt 10: Wire Up System Prompt, Context Gathering & Memory System

## Context

You are working in `/workspaces/claude-code`. The CLI constructs a detailed system prompt before each conversation. This prompt includes:
1. **Static instructions** — core behavior rules (from `src/constants/prompts.ts`)
2. **Dynamic context** — OS, shell, git status, working directory (from `src/context.ts`)
3. **Tool descriptions** — auto-generated from tool schemas
4. **Memory** — persistent `.claude.md` files (from `src/memdir/`)
5. **User context** — config, preferences, project settings

## Key Files

- `src/constants/prompts.ts` — System prompt construction
- `src/constants/system.ts` — System identity strings
- `src/context.ts` — OS/shell/git context collection
- `src/context/` — Additional context modules
- `src/memdir/` — Memory directory system (reads `.claude.md`, `CLAUDE.md` files)
- `src/utils/messages.ts` — Message construction helpers

## Task

### Part A: Trace the system prompt construction

Read `src/constants/prompts.ts` and map:
1. What is `getSystemPrompt()`'s signature and return type?
2. What sections does the system prompt contain?
3. How are tools described in the prompt?
4. What model-specific variations exist?
5. Where does the `MACRO.ISSUES_EXPLAINER` reference resolve to?

### Part B: Fix the context gathering

Read `src/context.ts` and:
1. Understand `getSystemContext()` and `getUserContext()`
2. These collect OS info, shell version, git status, etc.
3. Verify they work on Linux (this codebase was likely developed on macOS, so some paths may be macOS-specific)
4. Fix any platform-specific issues

### Part C: Wire up the memory system

Read `src/memdir/` directory:
1. How does it find `.claude.md` / `CLAUDE.md` files?
2. How is memory content injected into the system prompt?
3. Does it support project-level, user-level, and session-level memory?

Verify it works by:
1. Creating a test `CLAUDE.md` in the project root
2. Running the system prompt builder
3. Checking the memory appears in the output

### Part D: Create a prompt inspection script

Create `scripts/test-prompt.ts`:
```ts
// scripts/test-prompt.ts
// Dump the full system prompt that would be sent to the API
// Usage: bun scripts/test-prompt.ts

import './src/shims/preload.js'

async function main() {
  // Import the prompt builder
  const { getSystemPrompt } = await import('./src/constants/prompts.js')
  
  // May need to pass tools list and model name
  // Check the function signature
  const prompt = await getSystemPrompt([], 'claude-sonnet-4-20250514')
  
  console.log('=== SYSTEM PROMPT ===')
  console.log(prompt.join('\n'))
  console.log('=== END ===')
  console.log(`\nTotal length: ${prompt.join('\n').length} characters`)
}

main().catch(err => {
  console.error('Prompt test failed:', err)
  process.exit(1)
})
```

### Part E: Fix MACRO references in prompts

The prompt system references `MACRO.ISSUES_EXPLAINER`. Make sure our `MACRO` global (from `src/shims/macro.ts`) provides this value. If the prompt references other `MACRO` fields, add them too.

### Part F: Context module audit

Check `src/context/` for additional context modules:
- Project detection (language, framework)
- Git integration (branch, status, recent commits)
- Environment detection (CI, container, SSH)

Verify these work in our dev environment.

## Verification

1. `bun scripts/test-prompt.ts` dumps a complete system prompt
2. The prompt includes: tool descriptions, OS context, memory content
3. No `undefined` or `MACRO.` references in the output
4. Memory system reads `.claude.md` from the project root
