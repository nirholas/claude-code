// src/shims/bun-bundle.ts

// Map of feature flags to their enabled state.
// In production Bun builds, these are compile-time constants.
// For our dev build, we read from env vars with sensible defaults.
const FEATURE_FLAGS: Record<string, boolean> = {
  PROACTIVE: envBool('CLAUDE_CODE_PROACTIVE', false),
  KAIROS: envBool('CLAUDE_CODE_KAIROS', false),
  KAIROS_BRIEF: envBool('CLAUDE_CODE_KAIROS_BRIEF', false),
  KAIROS_GITHUB_WEBHOOKS: envBool('CLAUDE_CODE_KAIROS_GITHUB_WEBHOOKS', false),
  BRIDGE_MODE: envBool('CLAUDE_CODE_BRIDGE_MODE', false),
  DAEMON: envBool('CLAUDE_CODE_DAEMON', false),
  VOICE_MODE: envBool('CLAUDE_CODE_VOICE_MODE', false),
  AGENT_TRIGGERS: envBool('CLAUDE_CODE_AGENT_TRIGGERS', false),
  MONITOR_TOOL: envBool('CLAUDE_CODE_MONITOR_TOOL', false),
  COORDINATOR_MODE: envBool('CLAUDE_CODE_COORDINATOR_MODE', false),
  ABLATION_BASELINE: false, // always off for external builds
  DUMP_SYSTEM_PROMPT: envBool('CLAUDE_CODE_DUMP_SYSTEM_PROMPT', false),
  BG_SESSIONS: envBool('CLAUDE_CODE_BG_SESSIONS', false),
  HISTORY_SNIP: envBool('CLAUDE_CODE_HISTORY_SNIP', false),
  WORKFLOW_SCRIPTS: envBool('CLAUDE_CODE_WORKFLOW_SCRIPTS', false),
  CCR_REMOTE_SETUP: envBool('CLAUDE_CODE_CCR_REMOTE_SETUP', false),
  EXPERIMENTAL_SKILL_SEARCH: envBool('CLAUDE_CODE_EXPERIMENTAL_SKILL_SEARCH', false),
  ULTRAPLAN: envBool('CLAUDE_CODE_ULTRAPLAN', false),
  TORCH: envBool('CLAUDE_CODE_TORCH', false),
  UDS_INBOX: envBool('CLAUDE_CODE_UDS_INBOX', false),
  FORK_SUBAGENT: envBool('CLAUDE_CODE_FORK_SUBAGENT', false),
  BUDDY: envBool('CLAUDE_CODE_BUDDY', false),
  MCP_SKILLS: envBool('CLAUDE_CODE_MCP_SKILLS', false),
  REACTIVE_COMPACT: envBool('CLAUDE_CODE_REACTIVE_COMPACT', false),
}

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key]
  if (v === undefined) return fallback
  return v === '1' || v === 'true'
}

export function feature(name: string): boolean {
  return FEATURE_FLAGS[name] ?? false
}
