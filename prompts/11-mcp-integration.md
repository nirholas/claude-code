# Prompt 11: MCP Client/Server Integration

## Context

You are working in `/workspaces/claude-code`. The CLI has built-in MCP (Model Context Protocol) support:
- **MCP Client** — connects to external MCP servers (tools, resources)
- **MCP Server** — exposes Claude Code itself as an MCP server

MCP lets the CLI use tools provided by external servers and lets other clients use Claude Code as a tool provider.

## Key Files

- `src/services/mcp/` — MCP client implementation
- `src/services/mcp/types.ts` — MCP config types
- `src/entrypoints/mcp.ts` — MCP server mode entrypoint
- `src/tools/MCPTool/` — Tool that calls MCP servers
- `src/tools/ListMcpResourcesTool/` — Lists MCP resources
- `src/tools/ReadMcpResourceTool/` — Reads MCP resources
- `src/tools/McpAuthTool/` — MCP server authentication
- `mcp-server/` — Standalone MCP server sub-project (from Prompt 04)

## Task

### Part A: Understand MCP client architecture

Read `src/services/mcp/` directory:
1. How are MCP servers discovered? (`.mcp.json` config file?)
2. How are MCP server connections established? (stdio, HTTP, SSE?)
3. How are MCP tools registered and made available?
4. What is the `ScopedMcpServerConfig` type?

### Part B: Understand MCP config format

Search for `.mcp.json` or MCP config loading code. Document:
1. Where does the config file live? (`~/.claude/.mcp.json`? project root?)
2. What's the config schema? (server name, command, args, env?)
3. How are multiple servers configured?

Example config you might find:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {}
    }
  }
}
```

### Part C: Verify MCP SDK integration

The project uses `@modelcontextprotocol/sdk` (^1.12.1). Check:
1. Is it installed in `node_modules/`?
2. Does the import work: `import { Client } from '@modelcontextprotocol/sdk/client/index.js'`
3. Are there version compatibility issues?

### Part D: Test MCP client with our own server

Create a test that:
1. Starts the `mcp-server/` we fixed in Prompt 04 as a child process
2. Connects to it via stdio using the MCP client from `src/services/mcp/`
3. Lists available tools
4. Calls one tool (e.g., `list_files` or `search_code`)

Create `scripts/test-mcp.ts`:
```ts
// scripts/test-mcp.ts
// Test MCP client/server roundtrip
// Usage: bun scripts/test-mcp.ts

import './src/shims/preload.js'

// TODO: 
// 1. Spawn mcp-server as a child process (stdio transport)
// 2. Create MCP client from src/services/mcp/
// 3. Connect client to server
// 4. List tools
// 5. Call a tool
// 6. Print results
```

### Part E: Test MCP server mode

The CLI can run as an MCP server itself (`src/entrypoints/mcp.ts`). Read this file and verify:
1. What tools does it expose?
2. What resources does it provide?
3. Can it be started with `bun src/entrypoints/mcp.ts`?

### Part F: Create sample MCP config

Create a `.mcp.json` in the project root (or wherever the app looks for it) that configures the local MCP server:
```json
{
  "mcpServers": {
    "claude-code-explorer": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "CLAUDE_CODE_SRC_ROOT": "./src"
      }
    }
  }
}
```

## Verification

1. MCP client code in `src/services/mcp/` loads without errors
2. MCP server mode (`src/entrypoints/mcp.ts`) starts without crashing
3. A roundtrip test (client → server → response) works
4. `.mcp.json` config file is created and parseable
