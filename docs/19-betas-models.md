# Beta Headers & Model Configuration

**Location:** `src/constants/betas.ts` + `src/constants/prompts.ts`

## Active Beta Headers

| Header | Date | Purpose |
|--------|------|---------|
| `claude-code-20250219` | 2025-02-19 | Base Claude Code beta |
| `interleaved-thinking-2025-05-14` | 2025-05-14 | Thinking mode (extended thinking) |
| `context-1m-2025-08-07` | 2025-08-07 | 1M context window |
| `context-management-2025-06-27` | 2025-06-27 | Context management features |
| `structured-outputs-2025-12-15` | 2025-12-15 | Structured JSON outputs |
| `web-search-2025-03-05` | 2025-03-05 | Web search capability |
| `advanced-tool-use-2025-11-20` | 2025-11-20 | Tool search (1P: Claude API/Foundry) |
| `tool-search-tool-2025-10-19` | 2025-10-19 | Tool search (3P: Vertex/Bedrock) |
| `effort-2025-11-24` | 2025-11-24 | Effort control parameter |
| `fast-mode-2026-02-01` | 2026-02-01 | Fast mode output |
| `task-budgets-2026-03-13` | 2026-03-13 | Task token budgets |
| `prompt-caching-scope-2026-01-05` | 2026-01-05 | Global prompt cache scope |
| `redact-thinking-2026-02-12` | 2026-02-12 | Thinking block redaction |
| `token-efficient-tools-2026-03-28` | 2026-03-28 | Token-efficient tool schemas |
| `advisor-tool-2026-03-01` | 2026-03-01 | Advisor tool |
| `afk-mode-2026-01-31` | 2026-01-31 | AFK mode (gated: TRANSCRIPT_CLASSIFIER) |
| `cli-internal-2026-02-09` | 2026-02-09 | CLI internal (Ant-only) |
| `summarize-connector-text-2026-03-13` | 2026-03-13 | Connector text (gated: CONNECTOR_TEXT) |

## Provider-Specific Handling

### Bedrock
Limited beta support — uses `extraBodyParams` instead of headers:
- `interleaved-thinking-2025-05-14`
- `context-1m-2025-08-07`
- `tool-search-tool-2025-10-19`

### Vertex AI countTokens
Only allows these betas:
- `claude-code-20250219`
- `interleaved-thinking-2025-05-14`
- `context-management-2025-06-27`

## Model Configuration

### Model IDs & Knowledge Cutoffs

| Model | ID | Knowledge Cutoff |
|-------|-----|-----------------|
| **Claude Opus 4.6** | `claude-opus-4-6` | May 2025 |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | August 2025 |
| **Claude Opus 4.5** | `claude-opus-4-5` | May 2025 |
| **Claude Haiku 4.5** | `claude-haiku-4-5-20251001` | February 2025 |
| Claude Opus 4 | `claude-opus-4` | January 2025 |
| Claude Sonnet 4 | `claude-sonnet-4` | January 2025 |

### Frontier Model
```typescript
const FRONTIER_MODEL_NAME = 'Claude Opus 4.6'
```

### Upcoming Models
Code comments reference:
- **Numbat** — `@[MODEL LAUNCH]: Remove this section when we launch numbat.`
- **Capybara v8** — `@[MODEL LAUNCH]: capy v8 thoroughness counterweight`

## Attribution Header

```
x-anthropic-billing-header: cc_version={version}.{fingerprint}; cc_entrypoint={entrypoint}; cch=00000; cc_workload={workload};
```

| Field | Description |
|-------|-------------|
| `cc_version` | Claude Code version + fingerprint (message content hash) |
| `cc_entrypoint` | Entry point: `cli`, `ide`, `web`, `unknown` |
| `cch` | Native client attestation (Bun/Zig overwrites placeholder) |
| `cc_workload` | Turn hint: `cron` or absent (interactive) |

## Native Client Attestation

The `cch=00000` placeholder is overwritten by Bun's native HTTP stack (`Attestation.zig`) with a computed hash before the request is sent. The server verifies this to confirm the request came from a legitimate Claude Code client. Same-length replacement avoids Content-Length changes.
