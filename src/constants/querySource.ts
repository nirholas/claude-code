/**
 * QuerySource identifies where a query originated from.
 * Used for analytics, retry logic, and cache control decisions.
 */
export type QuerySource =
  | 'repl_main_thread'
  | 'sdk'
  | 'compact'
  | 'side_question'
  | 'agent'
  | 'agent:custom'
  | 'agent:explore'
  | 'agent:plan'
  | 'tool_use_summary'
  | 'advisor'
  | 'hook'
  | 'session_memory'
  | 'magic_docs'
  | 'skill_search'
  | 'classifier'
  | 'bridge'
  | (string & {}) // Allow other string values for extensibility
