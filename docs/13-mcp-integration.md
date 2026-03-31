# MCP Integration (Model Context Protocol)

**Location:** `src/services/mcp/`

## Key Files

| File | Size | Purpose |
|------|------|---------|
| `client.ts` | 119KB | Client implementation and tool discovery |
| `auth.ts` | 89KB | OAuth, token refresh, session management |
| `config.ts` | 51KB | Configuration parsing and merging |
| `useManageMCPConnections.ts` | 45KB | React hooks for connection management |

## Transport Types

| Type | Description |
|------|-------------|
| **Stdio** | Child process servers (command-based) |
| **SSE** | HTTP Server-Sent Events |
| **WebSocket** | Bidirectional websocket |
| **HTTP** | StreamableHTTPClientTransport |
| **SDK** | Native Node.js SDK transports |

## Configuration Sources

Configuration is merged from multiple sources:

```
1. Global:     ~/.claude/config.json
2. Project:    .mcp.json (project root)
3. Settings:   ~/.claude/settings.json (can be policy-managed)
4. Enterprise: Managed policy file (MDM)
5. Claude.ai:  Web-UI connectors with OAuth
6. Plugins:    Per-plugin MCP server configurations
```

## Key Features

### Deduplication
- Plugin servers deduplicated by signature (command array or URL)
- Claude.ai manual servers win over connector twins
- Suppression tracked with logging

### Tool Extraction
- `MCPTool` wraps individual MCP server tools
- Tool descriptions truncated to 2048 characters
- Large results persisted to disk, truncated in context
- Error types: `McpToolCallError`, `McpAuthError`, `McpSessionExpiredError`

### Authentication
- OAuth flow for Claude.ai connectors
- Token refresh on 401 errors
- 15-minute TTL for cached tokens
- Step-up detection for permission escalation

### Resources & Prompts
- `ListMcpResourcesTool` — enumerate server resources
- `ReadMcpResourceTool` — fetch specific resource content
- MCP prompts exposed as "Skills" (when `loadedFrom === 'mcp'`)

## MCP Client Metadata (CIMD)

```
URL: https://claude.ai/oauth/claude-code-client-metadata
Protocol: CIMD / SEP-991 (Client ID Metadata Document)

When an MCP auth server advertises client_id_metadata_document_supported: true,
Claude Code uses this URL as its client_id instead of Dynamic Client Registration.
```

## MCP Proxy

| Environment | URL |
|------------|-----|
| Production | `https://mcp-proxy.anthropic.com/v1/mcp/{server_id}` |
| Staging | `https://mcp-proxy-staging.anthropic.com/v1/mcp/{server_id}` |
| Local | `http://localhost:8205/v1/toolbox/shttp/mcp/{server_id}` |
