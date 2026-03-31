# Prompt 01: Install Bun Runtime & Dependencies

## Context

You are working in `/workspaces/claude-code`, which contains the leaked source code of Anthropic's Claude Code CLI. It's a TypeScript/TSX project that uses **Bun** as its runtime (not Node.js). The `package.json` specifies `"engines": { "bun": ">=1.1.0" }`.

There is no `bun.lockb` lockfile — it was not included in the leak.

## Task

1. **Install Bun** (if not already installed):
   ```
   curl -fsSL https://bun.sh/install | bash
   ```
   Then ensure `bun` is on the PATH.

2. **Run `bun install`** in the project root (`/workspaces/claude-code`) to install all dependencies. This will generate a `bun.lockb` lockfile.

3. **Verify the install** — confirm that:
   - `node_modules/` exists and has the major packages: `@anthropic-ai/sdk`, `react`, `chalk`, `@commander-js/extra-typings`, `ink` (may not exist separately — check `@anthropic-ai/sdk`, `zod`, `@modelcontextprotocol/sdk`)
   - `bun --version` returns 1.1.0+

4. **Run the typecheck** to see current state:
   ```
   bun run typecheck
   ```
   Report any errors — don't fix them yet, just capture the output.

5. **Also install deps for the mcp-server sub-project**:
   ```
   cd mcp-server && npm install && cd ..
   ```

## Verification

- `bun --version` outputs >= 1.1.0
- `ls node_modules/@anthropic-ai/sdk` succeeds
- `bun run typecheck` runs (errors are expected at this stage, just report them)
