# Analytics & Telemetry

**Location:** `src/services/analytics/`

## Architecture

```
Event Queue → Sink Attachment → Async Drain
             ↓
    ┌────────┴────────┐
    ▼                 ▼
Datadog           First-Party
(datadog.ts)      Event Logger
  9KB             (15KB + 41KB exporter)
    
    ┌─────────┐
    │GrowthBook│  ← Feature flags + A/B testing (41KB)
    └─────────┘
    
    ┌──────────────┐
    │ OpenTelemetry │  ← Spans, counters (lazy-loaded ~400KB)
    │    + gRPC     │  ← Transport (lazy-loaded ~700KB)
    └──────────────┘
```

Events buffer in a queue before sink attachment. Once attached, events drain asynchronously. No import cycles — isolated module graph.

## Events Logged

| Event | Data Fields |
|-------|------------|
| `tengu_api_query` | Model, message count, temperature, betas, permission mode, query source, thinking type, effort value, fast mode, previous request ID |
| `tengu_started` | Session start metadata |
| `tengu_exit` | Session end metadata |
| `tengu_worktree_created` | Worktree creation |
| Permission decisions | Tool name, deny/allow/ask, reason, source |
| Hook execution | Duration, output length |
| Classifier usage | Tokens, latency, stage breakdown |
| Tool execution | Sanitized tool name, duration, success/failure |

## PII Protection

Type-level guards prevent accidental sensitive data logging:

```typescript
// These marker types force developers to verify data is safe:
AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
AnalyticsMetadata_I_VERIFIED_THIS_IS_PII_TAGGED
```

The metadata sanitization module (`metadata.ts`, 33KB) scrubs sensitive data before logging.

## GrowthBook Integration

`growthbook.ts` (41KB) provides:
- Feature flag evaluation
- A/B test assignment
- Cached feature values: `getFeatureValue_CACHED_MAY_BE_STALE()`
- Used for: bypass killswitch, attribution header control, verification agent gating

## OpenTelemetry

- **Lazy-loaded** — ~400KB OTel + ~700KB gRPC only loaded when needed
- Provides spans for API call tracing
- Counters for cost and token tracking
- Exporters for backend telemetry collection
