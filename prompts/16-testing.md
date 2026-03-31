# Prompt 16: Add Test Infrastructure & Smoke Tests

## Context

You are working in `/workspaces/claude-code`. The leaked source does not include any test files or test configuration (they were presumably in a separate directory or repo). We need to add a test framework and write smoke tests for core subsystems.

## Task

### Part A: Set up Vitest

```bash
bun add -d vitest @types/node
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      'bun:bundle': resolve(__dirname, 'src/shims/bun-bundle.ts'),
    },
  },
})
```

Create `tests/setup.ts`:
```ts
// Global test setup
import '../src/shims/preload.js'
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Part B: Write unit tests for shims

`tests/shims/bun-bundle.test.ts`:
- Test `feature()` returns `false` for unknown flags
- Test `feature()` returns `false` for disabled flags
- Test `feature()` returns `true` when env var is set
- Test `feature('ABLATION_BASELINE')` always returns `false`

`tests/shims/macro.test.ts`:
- Test `MACRO.VERSION` is a string
- Test `MACRO.PACKAGE_URL` is set
- Test `MACRO.ISSUES_EXPLAINER` is set

### Part C: Write smoke tests for core modules

`tests/smoke/tools.test.ts`:
- Test that `getTools()` returns an array
- Test that each tool has: name, description, inputSchema
- Test that BashTool, FileReadTool, FileWriteTool are present

`tests/smoke/commands.test.ts`:
- Test that `getCommands()` returns an array
- Test that each command has: name, execute function
- Test that /help and /config commands exist

`tests/smoke/context.test.ts`:
- Test that `getSystemContext()` returns OS info
- Test that git status can be collected
- Test that platform detection works on Linux

`tests/smoke/prompt.test.ts`:
- Test that `getSystemPrompt()` returns a non-empty array
- Test that the prompt includes tool descriptions
- Test that MACRO references are resolved (no `undefined`)

### Part D: Write integration tests (if API key available)

`tests/integration/api.test.ts`:
- Skip if `ANTHROPIC_API_KEY` is not set
- Test API client creation
- Test a simple message (hello world)
- Test streaming works
- Test tool use (calculator-style tool call)

`tests/integration/mcp.test.ts`:
- Test MCP server starts
- Test MCP client connects
- Test tool listing
- Test tool execution roundtrip

### Part E: Write build tests

`tests/build/bundle.test.ts`:
- Test that `dist/cli.mjs` exists after build
- Test that it has a shebang
- Test that it's not empty
- Test that `node dist/cli.mjs --version` exits cleanly

### Part F: Add pre-commit hook (optional)

If the project uses git hooks, add:
```bash
# In package.json or a git hook
bun run typecheck && bun run test
```

## Verification

1. `bun run test` runs all tests
2. Shim tests pass
3. Smoke tests pass (tools, commands, context, prompts load)
4. Integration tests are skipped when no API key is set
5. Integration tests pass when API key is available
6. Test output is clear and readable
