# Codebase Statistics & Metrics

## Overview

| Metric | Value |
|--------|-------|
| **Total TypeScript files** | 1,884 |
| **Total lines of code** | 512,664 |
| **Directories** | 36 under `src/` |
| **UI components** | 144 |
| **React hooks** | 85 |
| **Slash commands** | 101 |
| **Tools** | 43 (39 active + shared/testing/utils) |
| **Services** | 36 |
| **Utility modules** | 329 |
| **Config migrations** | 11 (v1 through v11) |
| **GitNexus symbols** | 15,025 |
| **GitNexus relationships** | 48,358 |
| **GitNexus execution flows** | 300 |
| **GitNexus clusters** | 1,122 |

---

## Lines of Code by Directory

| Lines | Files | Directory | Description |
|------:|------:|-----------|-------------|
| 180,472 | 564 | `src/utils/` | Utilities (permissions, settings, auth, bash, shell, config) |
| 81,546 | 389 | `src/components/` | React/Ink UI components |
| 53,680 | 130 | `src/services/` | API, MCP, OAuth, analytics, compact, plugins |
| 50,828 | 184 | `src/tools/` | Tool implementations (BashTool, AgentTool, etc.) |
| 26,428 | 189 | `src/commands/` | Slash command implementations |
| 19,842 | 96 | `src/ink/` | Ink renderer and terminal primitives |
| 19,204 | 104 | `src/hooks/` | React hooks |
| 12,613 | 31 | `src/bridge/` | IDE integration (VS Code, JetBrains) |
| 12,353 | 19 | `src/cli/` | CLI utilities and printing |
| 11,968 | 18 | `src/*.ts/tsx` | Top-level core engine files |
| 5,977 | 3 | `src/screens/` | Full-screen UIs (REPL, Doctor, Resume) |
| 4,081 | 4 | `src/native-ts/` | Native TypeScript (yoga-layout, color-diff, file-index) |
| 4,066 | 20 | `src/skills/` | Skill system |
| 4,051 | 8 | `src/entrypoints/` | SDK entry points and schemas |
| 3,446 | 11 | `src/types/` | TypeScript type definitions |
| 3,286 | 12 | `src/tasks/` | Task management |
| 3,159 | 14 | `src/keybindings/` | Key binding configuration |
| 2,648 | 21 | `src/constants/` | Prompts, OAuth, betas, system constants |
| 1,758 | 1 | `src/bootstrap/` | Bootstrap state |
| 1,736 | 8 | `src/memdir/` | Persistent memory system |
| 1,513 | 5 | `src/vim/` | Vim mode |
| 1,298 | 6 | `src/buddy/` | Companion sprite Easter egg |
| 1,190 | 6 | `src/state/` | State management (AppState) |
| 1,127 | 4 | `src/remote/` | Remote session management |
| 1,004 | 9 | `src/context/` | React context providers |
| 740 | 2 | `src/upstreamproxy/` | Proxy configuration |
| 652 | 4 | `src/query/` | Query pipeline modules |
| 603 | 11 | `src/migrations/` | Config migrations |
| 369 | 1 | `src/coordinator/` | Multi-agent coordinator |
| 358 | 3 | `src/server/` | Server mode |
| 222 | 1 | `src/schemas/` | Zod validation schemas |
| 182 | 2 | `src/plugins/` | Plugin registry |
| 98 | 1 | `src/outputStyles/` | Output styling |
| 87 | 1 | `src/assistant/` | Assistant/Kairos mode |
| 54 | 1 | `src/voice/` | Voice mode |
| 25 | 1 | `src/moreright/` | Unknown subsystem |

---

## Top 30 Largest Files

| Lines | File | Description |
|------:|------|-------------|
| 5,594 | `src/cli/print.ts` | Terminal output printing |
| 5,512 | `src/utils/messages.ts` | Message utilities |
| 5,105 | `src/utils/sessionStorage.ts` | Session storage management |
| 5,022 | `src/utils/hooks.ts` | Hook system implementation |
| 5,005 | `src/screens/REPL.tsx` | Main REPL screen |
| 4,683 | `src/main.tsx` | CLI entry point (Commander.js + React/Ink) |
| 4,436 | `src/utils/bash/bashParser.ts` | Bash command parser |
| 3,997 | `src/utils/attachments.ts` | File attachment handling |
| 3,419 | `src/services/api/claude.ts` | Anthropic API orchestration |
| 3,348 | `src/services/mcp/client.ts` | MCP client implementation |
| 3,302 | `src/utils/plugins/pluginLoader.ts` | Plugin loader |
| 3,200 | `src/commands/insights.ts` | Insights command |
| 2,999 | `src/bridge/bridgeMain.ts` | IDE bridge main loop |
| 2,679 | `src/utils/bash/ast.ts` | Bash AST analysis |
| 2,643 | `src/utils/plugins/marketplaceManager.ts` | Marketplace plugin manager |
| 2,621 | `src/tools/BashTool/bashPermissions.ts` | Bash permission rules |
| 2,592 | `src/tools/BashTool/bashSecurity.ts` | Bash security validators |
| 2,578 | `src/native-ts/yoga-layout/index.ts` | Yoga layout engine |
| 2,465 | `src/services/mcp/auth.ts` | MCP OAuth authentication |
| 2,406 | `src/bridge/replBridge.ts` | REPL bridge |
| 2,338 | `src/components/PromptInput/PromptInput.tsx` | Prompt input component |
| 2,214 | `src/commands/plugin/ManagePlugins.tsx` | Plugin management UI |
| 2,049 | `src/tools/PowerShellTool/pathValidation.ts` | PowerShell path validation |
| 2,002 | `src/utils/auth.ts` | Authentication utilities |
| 1,990 | `src/tools/BashTool/readOnlyValidation.ts` | Read-only command classification |
| 1,893 | `src/utils/shell/readOnlyCommandValidation.ts` | Shell read-only validation |
| 1,889 | `src/entrypoints/sdk/coreSchemas.ts` | SDK core Zod schemas |
| 1,823 | `src/tools/PowerShellTool/readOnlyValidation.ts` | PowerShell read-only validation |
| 1,821 | `src/components/Settings/Config.tsx` | Settings config UI |
| 1,817 | `src/utils/config.ts` | Config management |

---

## Core Engine Files

| Lines | File | Purpose |
|------:|------|---------|
| 4,683 | `src/main.tsx` | CLI entry, Commander.js + React/Ink |
| 1,729 | `src/query.ts` | Main API loop (async generator) |
| 1,295 | `src/QueryEngine.ts` | Session lifecycle, message management |
| 792 | `src/Tool.ts` | Tool interface definitions |
| 754 | `src/commands.ts` | Command registry and dispatch |
| 477 | `src/setup.ts` | Pre-query initialization |
| 464 | `src/history.ts` | Session history management |
| 389 | `src/tools.ts` | Tool registry and filtering |
| 365 | `src/interactiveHelpers.tsx` | REPL rendering helpers |
| 323 | `src/cost-tracker.ts` | Token cost tracking |
| 189 | `src/context.ts` | System/user context collection |
| 132 | `src/dialogLaunchers.tsx` | Dialog launching |
| 125 | `src/Task.ts` | Task model definition |
| 85 | `src/ink.ts` | Ink renderer wrapper |
| 83 | `src/projectOnboardingState.ts` | Onboarding state |
| 39 | `src/tasks.ts` | Task utilities |
| 22 | `src/replLauncher.tsx` | REPL launcher |
| 22 | `src/costHook.ts` | Cost React hook |

---

## External Dependencies

Most imported npm packages (by import count across codebase):

| Imports | Package | Purpose |
|--------:|---------|---------|
| 756 | `react` | UI framework |
| 253 | `path` | File path utilities |
| 146 | `fs/promises` | Filesystem operations |
| 125 | `zod/v4` | Schema validation |
| 122 | `crypto` | Cryptographic operations |
| 89 | `figures` | Unicode symbols |
| 65 | `lodash-es/memoize.js` | Memoization |
| 59 | `os` | OS utilities |
| 57 | `axios` | HTTP client |
| 53 | `@anthropic-ai/sdk` | Anthropic API client |
| 47 | `chalk` | Terminal color |
| 25 | `child_process` | Process spawning |
| 20 | `@modelcontextprotocol/sdk` | MCP protocol |
| 19 | `diff` | Text diffing |

---

## Most Imported Internal Modules

| Imports | Module | Purpose |
|--------:|--------|---------|
| 442 | `ink` | Ink renderer |
| 350 | `index` | Module entry points |
| 349 | `debug` | Debug logging |
| 283 | `types` | Type definitions |
| 257 | `errors` | Error handling |
| 236 | `Tool` | Tool interface |
| 232 | `state` | State management |
| 226 | `log` | Logging |
| 214 | `envUtils` | Environment utilities |
| 207 | `slowOperations` | Slow operation tracking |
| 204 | `constants` | Constants |
| 188 | `commands` | Command registry |
| 186 | `config` | Configuration |
| 163 | `message` | Message types |
| 151 | `prompt` | Prompt utilities |
| 134 | `settings` | Settings management |
| 129 | `messages` | Message utilities |
| 126 | `AppState` | Application state |
| 113 | `growthbook` | Feature flags |
| 101 | `auth` | Authentication |

---

## UI Components (144)

<details>
<summary>Click to expand full component list</summary>

### Core UI
- `App.tsx` — Root application component
- `Messages.tsx` — Message list
- `Message.tsx` — Single message
- `MessageRow.tsx` — Message row layout
- `MessageResponse.tsx` — Response rendering
- `MessageModel.tsx` — Model badge
- `MessageSelector.tsx` — Message selection
- `MessageTimestamp.tsx` — Timestamp display
- `PromptInput/PromptInput.tsx` — Main prompt input (2,338 lines)
- `VirtualMessageList.tsx` — Virtualized message scrolling
- `Spinner.tsx` / `Spinner/` — Loading spinners
- `StatusLine.tsx` — Status bar
- `StatusNotices.tsx` — Status notices
- `ToolUseLoader.tsx` — Tool execution loading
- `HighlightedCode.tsx` / `HighlightedCode/` — Syntax highlighting
- `Markdown.tsx` — Markdown rendering
- `MarkdownTable.tsx` — Table rendering
- `TextInput.tsx` — Text input
- `VimTextInput.tsx` — Vim-mode text input
- `BaseTextInput.tsx` — Base text input

### Dialogs & Modals
- `AutoModeOptInDialog.tsx` — Auto-mode opt-in
- `BridgeDialog.tsx` — IDE bridge connection
- `BypassPermissionsModeDialog.tsx` — Bypass mode warning
- `ChannelDowngradeDialog.tsx` — Channel downgrade
- `ClaudeMdExternalIncludesDialog.tsx` — External includes approval
- `ConsoleOAuthFlow.tsx` — OAuth flow
- `CostThresholdDialog.tsx` — Cost warning
- `DevChannelsDialog.tsx` — Dev channels
- `ExportDialog.tsx` — Export session
- `GlobalSearchDialog.tsx` — Global search
- `HistorySearchDialog.tsx` — History search
- `IdeAutoConnectDialog.tsx` — IDE auto-connect
- `IdeOnboardingDialog.tsx` — IDE onboarding
- `IdleReturnDialog.tsx` — Return from idle
- `InvalidConfigDialog.tsx` — Invalid config warning
- `InvalidSettingsDialog.tsx` — Invalid settings
- `MCPServerApprovalDialog.tsx` — MCP approval
- `MCPServerDesktopImportDialog.tsx` — MCP import
- `MCPServerDialogCopy.tsx` — MCP dialog copy
- `MCPServerMultiselectDialog.tsx` — MCP multi-select
- `QuickOpenDialog.tsx` — Quick open
- `WorkflowMultiselectDialog.tsx` — Workflow selection
- `WorktreeExitDialog.tsx` — Worktree exit

### Settings & Config
- `Settings/Config.tsx` — Settings config (1,821 lines)
- `ModelPicker.tsx` — Model selection
- `ThemePicker.tsx` — Theme selection
- `LanguagePicker.tsx` — Language selection
- `OutputStylePicker.tsx` — Output style

### Diff & Code
- `diff/` — Diff display components
- `StructuredDiff.tsx` / `StructuredDiff/` — Structured diff
- `StructuredDiffList.tsx` — Diff list
- `FileEditToolDiff.tsx` — File edit diff
- `FileEditToolUpdatedMessage.tsx` — Edit confirmation
- `FilePathLink.tsx` — Clickable file paths

### Agent & Task
- `agents/` — Agent UI components
- `tasks/` — Task UI components
- `TaskListV2.tsx` — Task list
- `CoordinatorAgentStatus.tsx` — Coordinator status
- `TeammateViewHeader.tsx` — Teammate view
- `teams/` — Team UI components
- `AgentProgressLine.tsx` — Agent progress

### MCP & Plugins
- `mcp/` — MCP UI components
- `skills/` — Skills UI components
- `Onboarding.tsx` — Onboarding flow
- `permissions/` — Permission UI

### Shell & Sandbox
- `shell/` — Shell UI components
- `sandbox/` — Sandbox UI
- `SandboxViolationExpandedView.tsx` — Sandbox violations
- `BashModeProgress.tsx` — Bash progress

### Misc
- `LogoV2/` — Logo rendering
- `HelpV2/` — Help display
- `Feedback.tsx` — Feedback
- `FeedbackSurvey/` — Feedback survey
- `SkillImprovementSurvey.tsx` — Skill survey
- `Stats.tsx` — Stats display
- `MemoryUsageIndicator.tsx` — Memory usage
- `TokenWarning.tsx` — Token warning
- `PrBadge.tsx` — PR badge
- `SessionPreview.tsx` — Session preview
- `ResumeTask.tsx` — Resume task
- `DesktopHandoff.tsx` — Desktop handoff
- `RemoteCallout.tsx` — Remote callout
- `TeleportProgress.tsx` / `TeleportError.tsx` / `TeleportStash.tsx` — Teleport
- `buddy/` → `src/buddy/` — Companion sprite
- `grove/` — Unknown UI subsystem
- `Passes/` — Passes display
- `TrustDialog/` — Trust approval
- `wizard/` — Wizard flows
- `design-system/` — Design system primitives
- `ui/` — Low-level UI primitives
- `ClaudeCodeHint/` — Hint display
- `LspRecommendation/` — LSP recommendations
- `ManagedSettingsSecurityDialog/` — Managed settings

</details>

---

## React Hooks (85)

<details>
<summary>Click to expand full hooks list</summary>

### Core Session
- `useCanUseTool.tsx` — Tool permission checking
- `useCancelRequest.ts` — Request cancellation
- `useExitOnCtrlCD.ts` — Exit handling
- `useInputBuffer.ts` — Input buffering
- `useTextInput.ts` — Text input management
- `useVimInput.ts` — Vim input mode
- `useTerminalSize.ts` — Terminal dimensions
- `useElapsedTime.ts` — Time tracking
- `useTimeout.ts` — Timeout management

### History & Navigation
- `useArrowKeyHistory.tsx` — Arrow key history
- `useAssistantHistory.ts` — Assistant history
- `useHistorySearch.ts` — History search
- `useBackgroundTaskNavigation.ts` — Background task nav
- `useVirtualScroll.ts` — Virtual scrolling

### IDE Integration
- `useIDEIntegration.tsx` — IDE integration
- `useIdeConnectionStatus.ts` — IDE connection status
- `useIdeAtMentioned.ts` — IDE @ mentions
- `useIdeLogging.ts` — IDE logging
- `useIdeSelection.ts` — IDE selection sync
- `useMailboxBridge.ts` — Mailbox bridge
- `useReplBridge.tsx` — REPL bridge

### Tools & Plugins
- `useMergedTools.ts` — Merged tool pool
- `useMergedCommands.ts` — Merged commands
- `useMergedClients.ts` — Merged MCP clients
- `useManagePlugins.ts` — Plugin management
- `useDiffData.ts` — Diff data
- `useDiffInIDE.ts` — Diff in IDE
- `useTurnDiffs.ts` — Turn diffs

### Settings & Config
- `useSettings.ts` — Settings state
- `useSettingsChange.ts` — Settings change detection
- `useSkillsChange.ts` — Skills change detection
- `useDynamicConfig.ts` — Dynamic config
- `useMainLoopModel.ts` — Model selection

### Session Management
- `useSessionBackgrounding.ts` — Background sessions
- `useRemoteSession.ts` — Remote sessions
- `useSSHSession.ts` — SSH sessions
- `useScheduledTasks.ts` — Scheduled tasks
- `useSwarmInitialization.ts` — Swarm init
- `useSwarmPermissionPoller.ts` — Swarm permissions
- `useTaskListWatcher.ts` — Task watching
- `useTasksV2.ts` — Task management
- `useTeammateViewAutoExit.ts` — Teammate auto-exit

### UI & UX
- `useBlink.ts` — Blinking animation
- `useCopyOnSelect.ts` — Copy on select
- `useDoublePress.ts` — Double press detection
- `usePasteHandler.ts` — Paste handling
- `useSearchInput.ts` — Search input
- `useTypeahead.tsx` — Typeahead
- `useMinDisplayTime.ts` — Minimum display time
- `useGlobalKeybindings.tsx` — Global keybindings
- `useCommandKeybindings.tsx` — Command keybindings
- `useAfterFirstRender.ts` — Post-first-render hook

### Notifications & Suggestions
- `useNotifyAfterTimeout.ts` — Timeout notifications
- `usePromptSuggestion.ts` — Prompt suggestions
- `useContextSuggestions.ts` → `fileSuggestions.ts` + `unifiedSuggestions.ts`
- `useUpdateNotification.ts` — Update notifications
- `useIssueFlagBanner.ts` — Issue flag banner

### Specialized
- `useVoice.ts` — Voice input
- `useVoiceEnabled.ts` — Voice feature check
- `useVoiceIntegration.tsx` — Voice integration
- `useMemoryUsage.ts` — Memory monitoring
- `useAwaySummary.ts` — Away summary
- `useApiKeyVerification.ts` — API key verification
- `useDirectConnect.ts` — Direct connect
- `useInboxPoller.ts` — Inbox polling
- `useFileHistorySnapshotInit.ts` — File history
- `usePrStatus.ts` — PR status
- `useQueueProcessor.ts` — Queue processing
- `useClipboardImageHint.ts` — Clipboard image hint
- `useClaudeCodeHintRecommendation.tsx` — Hint recommendations
- `useLspPluginRecommendation.tsx` — LSP recommendations
- `useOfficialMarketplaceNotification.tsx` — Marketplace notifications
- `useClaudeInChromeNotification` → `usePromptsFromClaudeInChrome.tsx`
- `useTeleportResume.tsx` — Teleport resume
- `useSkillImprovementSurvey.ts` — Skill survey
- `useDeferredHookMessages.ts` — Deferred hook messages
- `useLogMessages.ts` — Log messages

### Permission Hooks
- `toolPermission/` — Tool permission hooks (directory)
- `notifs/` — Notification hooks (directory)

</details>

---

## Security-Critical Code Volume

| Lines | Files | Area |
|------:|------:|------|
| ~10,800 | 6 | BashTool security validators |
| ~3,900 | 6 | PowerShell security validators |
| ~1,900 | 2 | Shell read-only command validation |
| ~4,400 | 2 | Bash AST/parser |
| ~2,000 | 1 | Auth utilities |
| ~5,000 | 1 | Hook system |
| **~28,000** | **18** | **Total security-critical code** |

Plus ~400KB (27 files) in `src/utils/permissions/`.

---

## Build Configuration

| Property | Value |
|----------|-------|
| **Runtime** | Bun |
| **Bundler** | Bun bundler with `bun:bundle` |
| **Dead code elimination** | `feature('FLAG')` compile-time gates |
| **Build variants** | External (public npm) vs. Ant (internal) |
| **Compile-time flags** | 23 known |
| **Migration version** | 11 |
| **Config format** | JSON with Zod v4 validation |

---

*Stats generated from source analysis on 2026-03-31.*
