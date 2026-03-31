# Prompt 04: Fix MCP Server Build

## Context

You are working in `/workspaces/claude-code/mcp-server/`. This is a separate sub-project that provides an MCP (Model Context Protocol) server for exploring the Claude Code source. It's a simpler, self-contained TypeScript project.

Currently `npm run build` (which runs `tsc`) fails with TypeScript errors.

## Task

1. **Run the build and capture errors**:
   ```bash
   cd /workspaces/claude-code/mcp-server
   npm run build 2>&1
   ```

2. **Fix all TypeScript errors** in `mcp-server/src/server.ts` and `mcp-server/src/index.ts`. Common issues include:
   - Duplicate function implementations
   - Missing imports
   - Type mismatches with the MCP SDK types

3. **Verify the fix**:
   ```bash
   npm run build
   ```
   Should complete with zero errors and produce output in `mcp-server/dist/`.

4. **Test the MCP server runs**:
   ```bash
   node dist/index.js --help 2>&1 || node dist/index.js 2>&1 | head -5
   ```
   It may hang waiting for stdio input (that's normal for an MCP server) — just verify it starts without crashing.

## Key Files

- `mcp-server/package.json` — build script and dependencies
- `mcp-server/tsconfig.json` — TypeScript config  
- `mcp-server/src/server.ts` — Main server logic (tools, resources, prompts)
- `mcp-server/src/index.ts` — Entrypoint (stdio transport)

## Verification

1. `cd mcp-server && npm run build` succeeds with zero errors
2. `ls mcp-server/dist/` shows compiled `.js` files
3. `node mcp-server/dist/index.js` starts without immediate crash

---

## Fix: GitHub Push Protection Blocked Push

`git push origin main` is rejected because commits `5e99ad6` and `7adaa5d` contain a **GitHub OAuth token** in `.mcpregistry_github_token`. The file was deleted from disk but still exists in git history. You must rewrite history to remove it.

### Step 1: Scrub secrets from history

```bash
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .mcpregistry_github_token .mcpregistry_registry_token mcp-server/.mcpregistry_github_token mcp-server/.mcpregistry_registry_token' \
  --prune-empty HEAD~5..HEAD
```

### Step 2: Push

```bash
git push origin main
```

### Alternative: Interactive rebase

```bash
git rebase -i HEAD~5
# Change "pick" to "edit" for commits 5e99ad6 and 7adaa5d
# At each stop, run:
git rm --cached .mcpregistry_github_token .mcpregistry_registry_token 2>/dev/null
git rm --cached mcp-server/.mcpregistry_github_token mcp-server/.mcpregistry_registry_token 2>/dev/null
git commit --amend --no-edit
git rebase --continue
```

### Step 3: Prevent future leaks

```bash
echo ".mcpregistry_github_token" >> .gitignore
echo ".mcpregistry_registry_token" >> .gitignore
git add .gitignore && git commit -m "chore: gitignore token files"
```
