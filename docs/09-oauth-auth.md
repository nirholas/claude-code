# OAuth & Authentication

**Location:** `src/constants/oauth.ts` + `src/services/oauth/`

## Production Configuration

| Setting | Value |
|---------|-------|
| **Client ID** | `9d1c250a-e61b-44d9-88ed-5944d1962f5e` |
| **Base API URL** | `https://api.anthropic.com` |
| **Console OAuth** | `https://platform.claude.com/oauth/authorize` |
| **Claude.ai OAuth** | `https://claude.com/cai/oauth/authorize` |
| **Claude.ai Origin** | `https://claude.ai` |
| **Token URL** | `https://platform.claude.com/v1/oauth/token` |
| **API Key URL** | `https://api.anthropic.com/api/oauth/claude_cli/create_api_key` |
| **Roles URL** | `https://api.anthropic.com/api/oauth/claude_cli/roles` |
| **Console Success** | `https://platform.claude.com/buy_credits?returnUrl=/oauth/code/success%3Fapp%3Dclaude-code` |
| **MCP Proxy URL** | `https://mcp-proxy.anthropic.com` |
| **MCP Proxy Path** | `/v1/mcp/{server_id}` |
| **MCP Client Metadata** | `https://claude.ai/oauth/claude-code-client-metadata` |

## Staging Configuration (Ant-only)

| Setting | Value |
|---------|-------|
| **Client ID** | `22422756-60c9-4084-8eb7-27705fd5cf9a` |
| **Base API URL** | `https://api-staging.anthropic.com` |
| **Console OAuth** | `https://platform.staging.ant.dev/oauth/authorize` |
| **Claude.ai OAuth** | `https://claude-ai.staging.ant.dev/oauth/authorize` |
| **MCP Proxy** | `https://mcp-proxy-staging.anthropic.com` |

## Local Dev Configuration

```
API:     http://localhost:8000  (api-proxy, started with `api dev start -g ccr`)
Apps:    http://localhost:4000  (claude-ai frontend)
Console: http://localhost:3000  (Console frontend)
MCP:     http://localhost:8205  (MCP proxy, path: /v1/toolbox/shttp/mcp/{server_id})
```

Override via environment variables:
- `CLAUDE_LOCAL_OAUTH_API_BASE`
- `CLAUDE_LOCAL_OAUTH_APPS_BASE`
- `CLAUDE_LOCAL_OAUTH_CONSOLE_BASE`

## Custom OAuth (FedStart)

`CLAUDE_CODE_CUSTOM_OAUTH_URL` only accepts these URLs:

```
https://beacon.claude-ai.staging.ant.dev
https://claude.fedstart.com
https://claude-staging.fedstart.com
```

Any other URL throws: `"CLAUDE_CODE_CUSTOM_OAUTH_URL is not an approved endpoint."`

Client ID can be overridden via `CLAUDE_CODE_OAUTH_CLIENT_ID` (e.g., for Xcode integration).

## OAuth Scopes

### Console Scopes (API key creation)
- `org:create_api_key`
- `user:profile`

### Claude.ai Scopes (Pro/Max/Team/Enterprise subscribers)
- `user:profile`
- `user:inference`
- `user:sessions:claude_code`
- `user:mcp_servers`
- `user:file_upload`

### Combined
When logging in, ALL scopes are requested (union of Console + Claude.ai) to handle redirect flows.

## Auth Flow

1. **OAuth 2.0 PKCE flow** — no client secret
2. Claude.ai OAuth bounces through `claude.com/cai/*` for attribution tracking
3. **macOS Keychain** for credential storage (prefetched at startup)
4. **JWT-based authentication** for IDE bridge sessions
5. **AWS STS** for credential validation
6. Token refresh on 401 errors
7. Mock subscription testing mode available

## MCP OAuth (CIMD / SEP-991)

```
Client Metadata URL: https://claude.ai/oauth/claude-code-client-metadata
Protocol: CIMD (Client ID Metadata Document)
```

When an MCP auth server advertises `client_id_metadata_document_supported: true`, Claude Code uses this URL as its `client_id` instead of Dynamic Client Registration.
