# Feature Flag System

## Compile-Time Flags (Bun Dead Code Elimination)

```typescript
import { feature } from 'bun:bundle'

// Code is completely stripped at build time if flag is false
const voiceCommand = feature('VOICE_MODE')
  ? require('./commands/voice/index.js').default
  : null
```

This is critical to Claude Code's build architecture. Features gated this way are completely absent from external (non-Anthropic) builds.

### Known Compile-Time Flags

| Flag | Purpose |
|------|---------|
| `VOICE_MODE` | Voice input/output |
| `PROACTIVE` | Proactive agent mode |
| `KAIROS` | Assistant/time-based features |
| `KAIROS_BRIEF` | Brief tool in Kairos mode |
| `BRIDGE_MODE` | IDE bridge integration |
| `DAEMON` | Daemon mode |
| `AGENT_TRIGGERS` | Agent trigger system |
| `MONITOR_TOOL` | Tool monitoring |
| `UDS_INBOX` | Unix Domain Socket peer messaging |
| `REACTIVE_COMPACT` | Advanced context compaction |
| `COORDINATOR_MODE` | Multi-agent coordinator |
| `HISTORY_SNIP` | Message history snipping |
| `CONTEXT_COLLAPSE` | Context management optimization |
| `WORKFLOW_SCRIPTS` | Workflow automation |
| `WEB_BROWSER_TOOL` | Browser control tool |
| `CACHED_MICROCOMPACT` | Cached microcompact configuration |
| `EXPERIMENTAL_SKILL_SEARCH` | Skill discovery tool |
| `MCP_SKILLS` | Model-invocable MCP skills |
| `TOKEN_BUDGET` | Token budget system |
| `NATIVE_CLIENT_ATTESTATION` | Client attestation in headers |
| `TRANSCRIPT_CLASSIFIER` | AFK mode transcript classifier |
| `CONNECTOR_TEXT` | Connector text summarization |
| `VERIFICATION_AGENT` | Adversarial verification agent |

### Build Types

| Build | Feature Flags | Audience |
|-------|--------------|----------|
| **External** | Most flags = false, stripped | Public npm package |
| **Ant (Internal)** | All flags available | Anthropic employees |

The `process.env.USER_TYPE === 'ant'` check is also used for build-time elimination. It MUST be inlined at each callsite (not hoisted to a const) so the bundler can constant-fold it.

## Runtime Feature Gates (GrowthBook)

| Gate | Default | Purpose |
|------|---------|---------|
| `tengu_bypass_permissions_disabled` | `false` | Remotely disable bypass mode |
| `tengu_attribution_header` | `true` | Enable/disable attribution headers |
| `tengu_hive_evidence` | `false` | Verification agent (Ant-only A/B) |

GrowthBook values are accessed via:
```typescript
getFeatureValue_CACHED_MAY_BE_STALE('gate_name', defaultValue)
```

The `CACHED_MAY_BE_STALE` suffix is a reminder that the value might be from a previous fetch cycle.
