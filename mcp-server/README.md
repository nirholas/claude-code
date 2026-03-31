# Claude Code Explorer — MCP Server

A standalone [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that lets any MCP-compatible client explore the Claude Code source code. Supports **STDIO**, **Streamable HTTP**, and **SSE** transports.

## What It Does

Exposes 8 tools, 3 resources, and 5 prompts for navigating the ~1,900-file, 512K+ line Claude Code codebase:

### Transports

| Transport | Endpoint | Best For |
|-----------|----------|----------|
| **STDIO** | `node dist/index.js` | Claude Desktop, local Claude Code, VS Code |
| **Streamable HTTP** | `POST/GET /mcp` | Modern MCP clients, remote hosting |
| **Legacy SSE** | `GET /sse` + `POST /messages` | Older MCP clients |

### Tools

| Tool | Description |
|------|-------------|
| `list_tools` | List all 40+ agent tools (BashTool, FileEditTool, etc.) |
| `list_commands` | List all 50+ slash commands (/commit, /review, etc.) |
| `get_tool_source` | Read a specific tool's implementation |
| `get_command_source` | Read a specific command's implementation |
| `read_source_file` | Read any file from `src/` by relative path |
| `search_source` | Regex search across the entire source tree |
| `list_directory` | List contents of any directory under `src/` |
| `get_architecture` | Get a full architecture overview |

### Resources

| URI | Description |
|-----|-------------|
| `claude-code://architecture` | README / architecture overview |
| `claude-code://tools` | Tool registry (JSON) |
| `claude-code://commands` | Command registry (JSON) |
| `claude-code://source/{path}` | Any source file (template) |

### Prompts

| Prompt | Description |
|--------|-------------|
| `explain_tool` | Deep-dive explanation of a specific tool's purpose, schema, permissions, and flow |
| `explain_command` | Explanation of a specific slash command's behavior and implementation |
| `architecture_overview` | Guided tour of the full Claude Code architecture |
| `how_does_it_work` | Explain a feature/subsystem (permissions, MCP, bridge, etc.) |
| `compare_tools` | Side-by-side comparison of two tools |

## Setup

```bash
cd mcp-server
npm install
npm run build
```

### Run Locally (STDIO)

```bash
npm start
# or with custom source path:
CLAUDE_CODE_SRC_ROOT=/path/to/src npm start
```

### Run Locally (HTTP)

```bash
npm run start:http
# Streamable HTTP at http://localhost:3000/mcp
# Legacy SSE at http://localhost:3000/sse
# Health check at http://localhost:3000/health
```

### With Authentication

```bash
MCP_API_KEY=your-secret-token npm run start:http
# Clients must include: Authorization: Bearer your-secret-token
```

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "claude-code-explorer": {
      "command": "node",
      "args": ["/absolute/path/to/claude-code/mcp-server/dist/index.js"],
      "env": {
        "CLAUDE_CODE_SRC_ROOT": "/absolute/path/to/claude-code/src"
      }
    }
  }
}
```

### VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "claude-code-explorer": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/mcp-server/dist/index.js"],
      "env": {
        "CLAUDE_CODE_SRC_ROOT": "${workspaceFolder}/src"
      }
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "claude-code-explorer": {
      "command": "node",
      "args": ["/absolute/path/to/claude-code/mcp-server/dist/index.js"],
      "env": {
        "CLAUDE_CODE_SRC_ROOT": "/absolute/path/to/claude-code/src"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_CODE_SRC_ROOT` | `../src` (relative to dist/) | Path to the Claude Code `src/` directory |
| `PORT` | `3000` | HTTP server port (HTTP mode only) |
| `MCP_API_KEY` | _(none)_ | Bearer token for HTTP auth (optional) |

## Remote HTTP Client Configuration

For Claude Desktop connecting to a remote server:

```json
{
  "mcpServers": {
    "claude-code-explorer": {
      "url": "https://your-deployment.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer your-secret-key"
      }
    }
  }
}
```

## Deployment

### Railway

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Railway automatically detects the `mcp-server/Dockerfile`
3. Set environment variables in the Railway dashboard:
   - `MCP_API_KEY` — a secret bearer token
   - `PORT` is set automatically by Railway
4. Deploy — available at `your-app.railway.app`

Or via CLI:

```bash
railway init
railway up
```

### Vercel

```bash
npx vercel
```

Set environment variables in the Vercel dashboard:
- `CLAUDE_CODE_SRC_ROOT` — path where src/ files are bundled
- `MCP_API_KEY` — bearer token

> **Note**: Vercel functions are stateless with execution time limits (10s hobby / 60s pro). Best for simple tool calls. For persistent SSE streams, use Railway or Docker.

### Docker

```bash
# From repo root
docker build -f mcp-server/Dockerfile -t claude-code-mcp .
docker run -p 3000:3000 -e MCP_API_KEY=your-secret claude-code-mcp
```

Works on any Docker host: Fly.io, Render, AWS ECS, Google Cloud Run, etc.

## Prompts

The server also exposes prompt templates for guided exploration:

| Prompt | Description |
|--------|-------------|
| `explain_tool` | Deep-dive explanation of a specific tool (input schema, permissions, execution flow) |
| `explain_command` | Explain how a slash command works |
| `architecture_overview` | Guided tour of the entire Claude Code architecture |
| `how_does_it_work` | Explain a feature or subsystem (e.g. "permission system", "MCP client", "query engine") |
| `compare_tools` | Side-by-side comparison of two tools |

## Example Usage

Once connected, you can ask your AI assistant things like:

- "List all Claude Code tools"
- "Show me the BashTool implementation"
- "Search for how permissions are checked"
- "What files are in the bridge directory?"
- "Read the QueryEngine.ts file, lines 1-100"
- "How does the MCP client connection work?"
- Use the `explain_tool` prompt with "FileEditTool" to get a full breakdown
- Use `how_does_it_work` with "bridge" to understand IDE integration

## Publishing to MCP Registry

This server is published to the [MCP Registry](https://registry.modelcontextprotocol.io) via GitHub Actions. On a tagged release (`v*`), the workflow:

1. Publishes the npm package to npmjs.org
2. Authenticates with the MCP Registry using GitHub OIDC
3. Publishes the `server.json` metadata to the registry

To publish manually:

```bash
# Install the MCP Publisher CLI
curl -L "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/').tar.gz" | tar xz mcp-publisher

# Authenticate (GitHub OAuth)
./mcp-publisher login github

# Publish
cd mcp-server
../mcp-publisher publish
```

Registry name: `io.github.nirholas/claude-code-explorer-mcp`

## Development

```bash
npm install
npm run dev    # Watch mode TypeScript compilation
npm run build  # Compile TypeScript to dist/
npm start      # Run STDIO server
npm run start:http  # Run HTTP server
```

## Architecture

```
mcp-server/
├── src/
│   ├── server.ts    — Shared MCP server (tools, resources, prompts) — transport-agnostic
│   ├── index.ts     — STDIO entrypoint (local)
│   └── http.ts      — HTTP + SSE entrypoint (remote)
├── api/
│   ├── index.ts     — Vercel serverless function
│   └── vercelApp.ts — Express app for Vercel
├── Dockerfile       — Docker build (Railway, Fly.io, etc.)
├── railway.json     — Railway deployment config
├── package.json
└── tsconfig.json
```


