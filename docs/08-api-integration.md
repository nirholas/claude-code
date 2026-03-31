# API Integration & Client

**Location:** `src/services/api/`

## Key Files

| File | Size | Purpose |
|------|------|---------|
| `claude.ts` | 126KB | Main API orchestration |
| `withRetry.ts` | 28KB | Retry logic with exponential backoff |
| `errors.ts` | 42KB | Error classification and handling |
| `client.ts` | 16KB | Anthropic SDK client configuration |
| `logging.ts` | 24KB | API call logging (scrubbed) |
| `filesApi.ts` | 22KB | File/image upload and validation |

## Request Chain

```
query.ts → claude.ts → client.ts → Anthropic SDK → Messages API
                                       ↓
                                  withRetry.ts (exponential backoff)
```

## `claude.ts` — Main Orchestrator

- Builds and sends messages to Anthropic Messages API
- Streaming response handling with real-time token counting
- Tool execution and result integration
- Prompt cache management with TTL tracking (1-hour allowlist)
- Microcompact function result clearing
- VCR support for recording/replaying requests (debugging)

## `client.ts` — SDK Configuration

- Uses official `@anthropic-ai/sdk`
- API key from environment (`ANTHROPIC_API_KEY`) or macOS Keychain
- Supports 3rd-party providers (custom base URLs)
- Bedrock and Vertex AI support with separate beta headers

## Error Handling

| Error Type | Classification | Recovery |
|-----------|---------------|----------|
| Rate limit (429) | Transient | Exponential backoff, retry |
| Auth error (401/403) | Fatal | Surface to user |
| Prompt too long (413) | Recoverable | Reactive compact |
| Max output tokens | Recoverable | Escalate 8K → 64K |
| Connection error | Transient | Retry with backoff |
| Media size error | Recoverable | Graceful notification |
| Server error (5xx) | Transient | Retry |

## `withRetry.ts` — Retry Logic

- Exponential backoff for transient failures
- Rate limit quota tracking
- Configurable retry budget (max retries, max duration)
- Fallback to timeout when budget exhausted

## VCR (Video Cassette Recorder)

`src/services/vcr.ts` provides API call recording/replay:
- Records request/response pairs to disk
- Replays for debugging and testing
- Useful for reproducing issues without live API calls
