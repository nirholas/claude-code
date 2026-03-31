# Prompt 07: Audit and Wire Up the Tool System

## Context

You are working in `/workspaces/claude-code`. The Claude Code CLI has ~40 tools that the LLM can invoke during conversations. Each tool is in `src/tools/<ToolName>/` and follows a consistent pattern.

Key files:
- `src/Tool.ts` (~29K lines) — Tool type definitions, `ToolUseContext`, `PermissionResult`, etc.
- `src/tools.ts` — Tool registry (`getTools()` function that returns all available tools)
- `src/tools/` — Individual tool directories

## Task

### Part A: Understand the Tool interface

Read `src/Tool.ts` and document the `Tool` interface. Key questions:
1. What fields does a `Tool` have? (name, description, inputSchema, execute, etc.)
2. What is `ToolUseContext`? What does it provide to tool execution?
3. How do tool permissions work? (`PermissionResult`, `needsPermission`)
4. How do tools declare their input schema? (JSON Schema / Zod)

### Part B: Audit the tool registry

Read `src/tools.ts` fully. It dynamically imports tools behind feature flags and env checks:
```ts
const REPLTool = process.env.USER_TYPE === 'ant' ? ... : null
const SleepTool = feature('PROACTIVE') || feature('KAIROS') ? ... : null
```

Create a complete inventory of:
1. **Always-available tools** — imported unconditionally
2. **Feature-gated tools** — which feature flag enables them
3. **Ant-only tools** — gated behind `USER_TYPE === 'ant'` (Anthropic internal)
4. **Broken/missing tools** — any tools referenced but not found

### Part C: Verify each tool compiles

For each tool directory in `src/tools/`, check:
1. Does it have an `index.ts` or main file?
2. Does it export a tool definition matching the `Tool` interface?
3. Are its imports resolvable?

Focus on the **core 10 tools** that are essential for basic operation:
- `BashTool` — shell command execution
- `FileReadTool` — read files
- `FileWriteTool` — write files  
- `FileEditTool` — edit files (search & replace)
- `GlobTool` — find files by pattern
- `GrepTool` — search file contents
- `AgentTool` — spawn sub-agent
- `WebFetchTool` — HTTP requests
- `AskUserQuestionTool` — ask the user for input
- `TodoWriteTool` — todo list management

### Part D: Fix import issues

The tool registry (`src/tools.ts`) uses dynamic imports with `bun:bundle` feature flags. With our runtime shim, these should work — but verify:

1. Feature-gated imports resolve when the flag is `false` (should be skipped)
2. Feature-gated imports resolve when the flag is `true` (should load)
3. Ant-only tools gracefully handle `process.env.USER_TYPE !== 'ant'`

Fix any import resolution errors.

### Part E: Create a tool smoke test

Create `scripts/test-tools.ts`:
```ts
// scripts/test-tools.ts
// Verify all tools load without errors
// Usage: bun scripts/test-tools.ts

import './src/shims/preload.js'

async function main() {
  const { getTools } = await import('./src/tools.js')
  
  // getTools() may need arguments — check its signature
  const tools = getTools(/* ... */)
  
  console.log(`Loaded ${tools.length} tools:\n`)
  for (const tool of tools) {
    console.log(`  ✓ ${tool.name}`)
  }
}

main().catch(err => {
  console.error('Tool loading failed:', err)
  process.exit(1)
})
```

Adapt the script to match the actual `getTools()` signature.

### Part F: Stub Anthropic-internal tools

Any tools gated behind `USER_TYPE === 'ant'` should be cleanly excluded. Verify the null checks work and don't cause runtime errors when these tools are missing from the registry.

## Verification

1. `scripts/test-tools.ts` runs and lists all available tools without errors
2. The core 10 tools listed above are all present
3. No TypeScript errors in `src/tools/` or `src/tools.ts`
4. Ant-only tools are cleanly excluded (no crashes)
