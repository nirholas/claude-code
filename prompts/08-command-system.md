# Prompt 08: Audit and Wire Up the Command System

## Context

You are working in `/workspaces/claude-code`. The CLI has ~50 slash commands (e.g., `/commit`, `/review`, `/init`, `/config`). These are registered in `src/commands.ts` and implemented in `src/commands/`.

Key files:
- `src/commands.ts` (~25K lines) — Command registry (`getCommands()`)
- `src/commands/` — Individual command implementations
- `src/types/command.ts` — Command type definition

## Task

### Part A: Understand the Command interface

Read `src/types/command.ts` and the top of `src/commands.ts`. Document:
1. The `Command` type (name, description, execute, args, etc.)
2. How commands are registered
3. How command execution is triggered (from the REPL? from CLI args?)

### Part B: Audit the command registry

Read `src/commands.ts` fully. Create a complete inventory of all commands, organized by category:

**Essential commands** (needed for basic operation):
- `/help` — show help
- `/config` — view/edit configuration
- `/init` — initialize a project
- `/commit` — git commit
- `/review` — code review

**Feature-gated commands** (behind feature flags or USER_TYPE):
- List which flag enables each

**Potentially broken commands** (reference missing imports or services):
- List any that can't resolve their imports

### Part C: Verify core commands compile

For the essential commands listed above, read their implementations and check:
1. All imports resolve
2. They don't depend on unavailable services
3. The function signatures match the Command type

### Part D: Fix import issues

Similar to the tool system, commands may have:
- Feature-gated imports that need the `bun:bundle` shim
- Ant-only code paths
- Dynamic imports that need correct paths

Fix whatever is broken.

### Part E: Handle "moved to plugin" commands

There's a file `src/commands/createMovedToPluginCommand.ts`. Read it — some commands have been migrated to the plugin system. These should gracefully tell the user the command has moved, not crash.

### Part F: Create a command smoke test

Create `scripts/test-commands.ts`:
```ts
// scripts/test-commands.ts
// Verify all commands load without errors
// Usage: bun scripts/test-commands.ts

import './src/shims/preload.js'

async function main() {
  const { getCommands } = await import('./src/commands.js')
  
  const commands = getCommands(/* check signature */)
  
  console.log(`Loaded ${commands.length} commands:\n`)
  for (const cmd of commands) {
    console.log(`  /${cmd.name} — ${cmd.description || '(no description)'}`)
  }
}

main().catch(err => {
  console.error('Command loading failed:', err)
  process.exit(1)
})
```

## Verification

1. `scripts/test-commands.ts` lists all available commands
2. Core commands (`/help`, `/config`, `/init`, `/commit`) are present
3. No runtime crashes from missing imports
4. Moved-to-plugin commands show a friendly message instead of crashing
