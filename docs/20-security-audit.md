# Security Audit

## Strengths

| # | Strength | Details |
|---|----------|---------|
| 1 | No hardcoded secrets | All credentials via environment variables or macOS Keychain |
| 2 | Multi-layered permissions | Rules + hooks + ML classifier + user prompts, 8 priority levels |
| 3 | Comprehensive bash security | 22+ validators, tree-sitter AST, 10.8K lines of security code |
| 4 | Path traversal protection | Canonicalization, symlink guards, UNC detection, boundary enforcement |
| 5 | Tool interface safety | Strict Zod schemas, maxResultSizeChars, timestamp validation |
| 6 | Remote killswitch | GrowthBook can disable bypass mode remotely |
| 7 | PII-guarded telemetry | Type-level markers prevent accidental sensitive data logging |
| 8 | Sandbox integration | Docker/Bubblewrap enforcement for bypass mode |
| 9 | Hook tamper prevention | Snapshot captured at session start |
| 10 | Client attestation | Bun HTTP stack computes attestation token in Zig |
| 11 | OAuth PKCE | No client secret in public client flow |
| 12 | FedStart URL allowlist | Custom OAuth restricted to approved endpoints |

## Areas of Concern

| # | Concern | Risk Level | Mitigation |
|---|---------|-----------|------------|
| 1 | Auto-mode classifier is ML-based | Medium | Falls back to user prompting after N denials |
| 2 | Hooks loaded from filesystem | Low | Snapshot at session start prevents tampering |
| 3 | MCP tools from untrusted servers | Medium | Deny rules block, but no full sandboxing |
| 4 | Attribution header fingerprinting | Low | Message content hash sent to billing |
| 5 | Tool result file persistence | Low | Large outputs written to disk |
| 6 | Architecture now public | High | All security mechanisms exposed |
| 7 | OAuth Client IDs exposed | Low | Public client IDs (PKCE, no secret) |

## Exposed Credentials & URLs

### OAuth

| Item | Value |
|------|-------|
| Production Client ID | `9d1c250a-e61b-44d9-88ed-5944d1962f5e` |
| Staging Client ID | `22422756-60c9-4084-8eb7-27705fd5cf9a` |

### API Endpoints

| Item | URL |
|------|-----|
| MCP Client Metadata | `https://claude.ai/oauth/claude-code-client-metadata` |
| MCP Proxy (prod) | `https://mcp-proxy.anthropic.com` |
| MCP Proxy (staging) | `https://mcp-proxy-staging.anthropic.com` |
| API Key Creation | `https://api.anthropic.com/api/oauth/claude_cli/create_api_key` |
| Roles | `https://api.anthropic.com/api/oauth/claude_cli/roles` |
| Token | `https://platform.claude.com/v1/oauth/token` |

### FedStart URLs

| URL | Purpose |
|-----|---------|
| `https://beacon.claude-ai.staging.ant.dev` | FedStart staging |
| `https://claude.fedstart.com` | FedStart production |
| `https://claude-staging.fedstart.com` | FedStart staging |

## Safeguards Team Ownership

The Cyber Risk Instruction in the system prompt is **owned by the Safeguards team** (David Forsythe, Kyla Guru). Changes require:
1. Safeguards team contact
2. Proper evaluation
3. Explicit approval before merging

## Security-Critical Code Paths

```
User command → BashTool
  → bashSecurity.ts (22+ validators)
  → bashPermissions.ts (rule matching)
  → readOnlyValidation.ts (safe command classification)
  → pathValidation.ts (filesystem safety)
  → permissions.ts (permission check)
  → yoloClassifier.ts (ML classifier, auto mode)
  → sandbox check (if bypass mode)
  → execution
```
