/**
 * Pure message type definitions extracted to break import cycles.
 *
 * This file contains only type definitions with no runtime dependencies.
 * Message types are discriminated unions based on `.type` field.
 * System messages are further discriminated by `.subtype`.
 */

import type { UUID } from 'crypto'
import type {
  BetaContentBlock,
  BetaMessage,
  BetaRawMessageStreamEvent,
} from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import type {
  ContentBlockParam,
} from '@anthropic-ai/sdk/resources/messages.mjs'
import type { APIError } from '@anthropic-ai/sdk'
import type { PermissionMode } from './permissions.js'

// ============================================================================
// Scalar / Enum Types
// ============================================================================

/** Where a message originated. undefined = human (typed at keyboard). */
export type MessageOrigin =
  | 'agent'
  | 'teammate'
  | 'command'
  | 'system'
  | 'hook'
  | undefined

/** Direction for partial compact summarization. */
export type PartialCompactDirection = 'earlier' | 'later'

/** System message severity levels. */
export type SystemMessageLevel = 'info' | 'warning' | 'error'

/** Hook execution info for stop hooks. */
export interface StopHookInfo {
  hookName: string
  executionTime?: number
  success: boolean
  error?: string
}

// ============================================================================
// Progress Types
// ============================================================================

/** Generic progress data for ongoing tool operations. */
export interface Progress {
  type: string
  [key: string]: unknown
}

/** Progress message for streaming tool execution updates. */
export interface ProgressMessage<P extends Progress = Progress> {
  type: 'progress'
  data: P
  toolUseID: string
  parentToolUseID: string
  uuid: UUID
  timestamp: string
}

// ============================================================================
// AssistantMessage
// ============================================================================

export interface AssistantMessage {
  type: 'assistant'
  uuid: UUID
  timestamp: string
  message: BetaMessage
  requestId?: string
  isMeta?: true
  isVirtual?: true
  isApiErrorMessage?: boolean
  apiError?: string
  error?: unknown
  errorDetails?: string
  advisorModel?: string
  /** AgentId of the agent that produced this message. */
  agentId?: string
  /** Caller info for debugging/display. */
  caller?: string
}

// ============================================================================
// UserMessage
// ============================================================================

export interface UserMessage {
  type: 'user'
  message: {
    role: 'user'
    content: string | ContentBlockParam[]
  }
  uuid: UUID
  timestamp: string
  isMeta?: true
  isVisibleInTranscriptOnly?: true
  isVirtual?: true
  isCompactSummary?: true
  toolUseResult?: unknown
  mcpMeta?: {
    _meta?: Record<string, unknown>
    structuredContent?: Record<string, unknown>
  }
  imagePasteIds?: number[]
  sourceToolAssistantUUID?: UUID
  permissionMode?: PermissionMode
  summarizeMetadata?: {
    messagesSummarized: number
    userContext?: string
    direction?: PartialCompactDirection
  }
  origin?: MessageOrigin
}

// ============================================================================
// SystemMessage (base) + all subtypes
// ============================================================================

/** Base fields shared by all system messages. */
interface SystemMessageBase {
  type: 'system'
  uuid: UUID
  timestamp: string
  isMeta?: boolean
  content?: string
  level?: SystemMessageLevel
  toolUseID?: string
}

export interface SystemInformationalMessage extends SystemMessageBase {
  subtype: 'informational'
  content: string
  level: SystemMessageLevel
  preventContinuation?: boolean
}

export interface SystemAPIErrorMessage extends SystemMessageBase {
  subtype: 'api_error'
  level: 'error'
  error: APIError
  cause?: Error
  retryInMs: number
  retryAttempt: number
  maxRetries: number
}

export interface SystemLocalCommandMessage extends SystemMessageBase {
  subtype: 'local_command'
  content: string
  level?: SystemMessageLevel
}

export interface SystemStopHookSummaryMessage extends SystemMessageBase {
  subtype: 'stop_hook_summary'
  hookCount: number
  hookInfos: StopHookInfo[]
  hookErrors: string[]
  preventedContinuation: boolean
  stopReason: string | undefined
  hasOutput: boolean
  level: SystemMessageLevel
  hookLabel?: string
  totalDurationMs?: number
}

export interface SystemBridgeStatusMessage extends SystemMessageBase {
  subtype: 'bridge_status'
  content: string
  url: string
  upgradeNudge?: string
}

export interface SystemTurnDurationMessage extends SystemMessageBase {
  subtype: 'turn_duration'
  durationMs: number
  budgetTokens?: number
  budgetLimit?: number
  budgetNudges?: number
  messageCount?: number
}

export interface SystemThinkingMessage extends SystemMessageBase {
  subtype: 'thinking'
  content: string
}

export interface SystemMemorySavedMessage extends SystemMessageBase {
  subtype: 'memory_saved'
  writtenPaths: string[]
}

export interface SystemAwaySummaryMessage extends SystemMessageBase {
  subtype: 'away_summary'
  content: string
}

export interface SystemAgentsKilledMessage extends SystemMessageBase {
  subtype: 'agents_killed'
}

export interface SystemCompactBoundaryMessage extends SystemMessageBase {
  subtype: 'compact_boundary'
  content: string
  compactMetadata?: {
    trigger: 'manual' | 'auto'
    preTokens: number
    userContext?: string
    messagesSummarized?: number
    preservedSegment?: {
      tailUuid?: string
      headUuid?: string
    }
  }
  logicalParentUuid?: UUID
}

export interface SystemMicrocompactBoundaryMessage extends SystemMessageBase {
  subtype: 'microcompact_boundary'
  content: string
  microcompactMetadata?: {
    trigger: 'auto'
    preTokens: number
    tokensSaved: number
    compactedToolIds: string[]
    clearedAttachmentUUIDs: string[]
  }
}

export interface SystemPermissionRetryMessage extends SystemMessageBase {
  subtype: 'permission_retry'
  content: string
  commands: string[]
}

export interface SystemScheduledTaskFireMessage extends SystemMessageBase {
  subtype: 'scheduled_task_fire'
  content: string
}

export interface SystemApiMetricsMessage extends SystemMessageBase {
  subtype: 'api_metrics'
  ttftMs: number
  otps: number
  isP50?: boolean
  hookDurationMs?: number
  turnDurationMs?: number
  toolDurationMs?: number
  classifierDurationMs?: number
  toolCount?: number
  hookCount?: number
  classifierCount?: number
  configWriteCount?: number
}

/** Discriminated union of all system message subtypes. */
export type SystemMessage =
  | SystemInformationalMessage
  | SystemAPIErrorMessage
  | SystemLocalCommandMessage
  | SystemStopHookSummaryMessage
  | SystemBridgeStatusMessage
  | SystemTurnDurationMessage
  | SystemThinkingMessage
  | SystemMemorySavedMessage
  | SystemAwaySummaryMessage
  | SystemAgentsKilledMessage
  | SystemCompactBoundaryMessage
  | SystemMicrocompactBoundaryMessage
  | SystemPermissionRetryMessage
  | SystemScheduledTaskFireMessage
  | SystemApiMetricsMessage

// ============================================================================
// AttachmentMessage
// ============================================================================

export interface AttachmentMessage<A extends Record<string, unknown> = Record<string, unknown>> {
  type: 'attachment'
  attachment: A & { type: string }
  uuid: UUID
  timestamp: string
  isMeta?: true
}

// ============================================================================
// TombstoneMessage
// ============================================================================

export interface TombstoneMessage {
  type: 'tombstone'
  originalType: 'assistant' | 'user' | 'system'
  uuid: UUID
  timestamp: string
}

// ============================================================================
// ToolUseSummaryMessage
// ============================================================================

export interface ToolUseSummaryMessage {
  type: 'tool_use_summary'
  summary: string
  precedingToolUseIds: string[]
  uuid: UUID
  timestamp: string
}

// ============================================================================
// HookResultMessage
// ============================================================================

export interface HookResultMessage {
  type: 'user'
  message: {
    role: 'user'
    content: ContentBlockParam[]
  }
  uuid: UUID
  timestamp: string
  isMeta?: true
}

// ============================================================================
// Discriminated Message Union
// ============================================================================

/** Union of all message types used in the conversation history. */
export type Message =
  | AssistantMessage
  | UserMessage
  | SystemMessage
  | AttachmentMessage
  | ProgressMessage
  | TombstoneMessage

// ============================================================================
// Grouped / Collapsed display types
// ============================================================================

export interface GroupedToolUseMessage {
  type: 'assistant'
  uuid: UUID
  timestamp: string
  message: BetaMessage
  toolUseCount: number
}

export interface CollapsedReadSearchGroup {
  type: 'assistant'
  uuid: UUID
  timestamp: string
  message: BetaMessage
  collapsedCount: number
}

/** Messages that can be rendered in UI. */
export type RenderableMessage =
  | AssistantMessage
  | UserMessage
  | SystemMessage
  | AttachmentMessage
  | GroupedToolUseMessage
  | CollapsedReadSearchGroup

// ============================================================================
// Normalized Message Types
// ============================================================================

/** Normalized assistant message with single content block. */
export interface NormalizedAssistantMessage extends AssistantMessage {
  message: BetaMessage & {
    content: [BetaContentBlock]
  }
}

/** Normalized user message with content always as array. */
export interface NormalizedUserMessage extends UserMessage {
  message: {
    role: 'user'
    content: ContentBlockParam[]
  }
}

/** Union of all normalized message types for API processing. */
export type NormalizedMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage
  | SystemMessage
  | AttachmentMessage
  | ProgressMessage
  | TombstoneMessage

// ============================================================================
// Stream / Event Types
// ============================================================================

/** Event fired at the start of a stream request. */
export interface RequestStartEvent {
  type: 'stream_request_start'
}

/** Wrapper for streaming events from the Anthropic API. */
export interface StreamEvent {
  type: 'stream_event'
  event: BetaRawMessageStreamEvent
  ttftMs?: number
}
