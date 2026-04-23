# Bash Tool Analysis

## Scope

This document analyzes the Bash feature inside `claude-code` end to end, from
user entry in bash mode to permission evaluation, sandboxing, process spawn,
output persistence, and background task lifecycle.

This analysis is based on static review of the leaked `src/` snapshot in this
repository, not on a full product build or runtime verification.

## Architecture At A Glance

The Bash path is split across five layers:

1. Input UX and bash mode entry
2. Bash permission UI
3. Permission and security engine
4. Shell execution and output capture
5. Foreground/background task management

Primary files:

- `src/components/PromptInput/PromptInput.tsx`
- `src/components/permissions/BashPermissionRequest/BashPermissionRequest.tsx`
- `src/tools/BashTool/BashTool.tsx`
- `src/tools/BashTool/bashPermissions.ts`
- `src/tools/BashTool/pathValidation.ts`
- `src/tools/BashTool/readOnlyValidation.ts`
- `src/tools/BashTool/bashCommandHelpers.ts`
- `src/utils/bash/ast.ts`
- `src/utils/Shell.ts`
- `src/utils/shell/bashProvider.ts`
- `src/utils/ShellCommand.ts`
- `src/tasks/LocalShellTask/LocalShellTask.tsx`

## 1. Entry UX And Public Surface

### Bash mode

- Pasting `!cmd` into an empty prompt switches the input into bash mode.
- The footer explicitly advertises `! for bash mode`.

### Tool schema

`BashTool` exposes:

- `command`
- `timeout`
- `description`
- `run_in_background`
- `dangerouslyDisableSandbox`

The internal `_simulatedSedEdit` field is intentionally omitted from the
model-facing schema. That prevents a model from pairing an innocent command
with an arbitrary file write and bypassing the normal approval path.

### Special cases

- `sed` preview approval is applied as a direct file write, not by re-running
  the shell command. This makes the previewed edit and the committed edit
  identical.
- Leading `sleep N` patterns are treated as suspicious polling and pushed
  toward a monitor-style workflow instead of unattended waiting.

## 2. Permission Pipeline

The permission engine is centered in `src/tools/BashTool/bashPermissions.ts`.
Its main design choice is fail-closed behavior when static analysis is not
trustworthy.

### High-level flow

1. Parse with tree-sitter when available.
2. If parsing succeeds, run semantic checks on the extracted commands.
3. If parsing is unavailable, fall back to legacy shell-quote and regex checks.
4. Apply sandbox auto-allow only after honoring explicit deny and ask rules.
5. Evaluate exact rules, classifier rules, operator handling, subcommands, and
   path validation.
6. Merge subcommand outcomes into a final permission result.

### Precedence

| Layer | Behavior |
| --- | --- |
| AST `too-complex` | `ask`, unless an earlier explicit deny already applies |
| AST semantic failure | `ask`, with deny preserved |
| Sandbox auto-allow | Only after explicit deny and ask checks |
| Exact rules | `deny > ask > allow > passthrough` |
| Classifier | high-confidence `deny > ask` |
| Compound `cd + git` | forced `ask` before subcommand shortcuts |
| Redirect/path validation | re-run on the original command after splitting |

### Why the AST path matters

The tree-sitter path is not just a nicer parser. It is the main anti-misparse
security boundary.

The AST pre-checks reject:

- control characters
- Unicode whitespace
- backslash-escaped whitespace
- zsh `~[...]` dynamic directory syntax
- zsh `=cmd` expansion
- quote-obfuscated brace expansion
- parser aborts and resource-limit failures

If the AST returns `too-complex`, the system asks for approval instead of
pretending that partial parsing is good enough.

### Read-only fast path

Read-only auto-allow exists, but it is conservative. It will not auto-allow if
any of these are true:

- the command cannot be parsed safely
- the command looks injection-prone
- it contains a vulnerable UNC path
- it combines `cd` and `git`
- the current directory looks like a bare or exploited git repo
- the command writes to git-internal paths and also runs `git`
- sandboxing is enabled and `git` is running outside the original cwd

Only when every split subcommand is individually read-only does the command get
fast-pathed as allowed.

## 3. Operator And Path Handling

Operators are handled before ordinary subcommand permission checks.

### Why operators are separate

Pipes and compound structures create a blind spot if permission evaluation only
checks split subcommands. In particular, redirections can disappear from the
split representation.

Example risk:

- `echo x | xargs printf '%s' >> file`

If the system only checked the two pipe segments, the append redirection on the
original command could be skipped. The implementation compensates by validating
the original command again after segment-level checks.

### Cross-segment `cd + git`

`bashCommandHelpers.ts` also repeats the `cd + git` defense across pipe
segments, because `cd sub && echo | git status` can otherwise evade the
single-command version of that check.

### Path validation responsibilities

`pathValidation.ts` enforces:

- output redirection boundaries
- process substitution approval
- shell expansion in redirect targets
- path-command argument validation for filesystem operations
- dangerous removal targets such as critical system directories

When AST redirects and argv are available, the validator prefers them over
legacy reparsing to avoid shell-quote edge cases.

## 4. Execution Pipeline

Execution starts in `runShellCommand()` and flows into `exec()` in
`src/utils/Shell.ts`.

### Shell resolution

Only bash and zsh are supported. The selection order is:

1. `CLAUDE_CODE_SHELL`
2. `$SHELL`
3. discovered executable paths

### Command construction

The bash provider:

- sources the shell snapshot when available
- sources session environment hooks
- disables `extglob`
- runs the command via `eval`
- writes `pwd -P` into a sidecar file

It also contains targeted compatibility fixes, including Windows `2>nul`
rewriting and pipe/stdin redirect rearrangement.

### Output model

By default both stdout and stderr are written to the same output file handle.
The user-visible tool result is reconstructed from that merged stream.

Large output is persisted into the tool-results area so that later reads can
inspect the complete output without flooding the inline tool response.

The Bash layer also post-processes:

- semantic exit-code interpretation
- sandbox failure annotation
- `claude-code-hint` stripping
- image output resizing and fallback

## 5. Background And Task Lifecycle

The task layer is file-backed rather than stream-native.

### Background entry points

- explicit `run_in_background`
- timeout-driven auto-background
- assistant blocking-budget auto-background
- manual `Ctrl+B`

### Foreground to background transition

Foreground commands are registered as tasks once they survive an initial
progress threshold. If they later get backgrounded, the system converts the
existing task in place instead of re-registering it.

That avoids:

- duplicate task registrations
- duplicate notifications
- leaked cleanup callbacks

### Runtime safety

Two runtime protections stand out:

- a stall watchdog that inspects output tails for interactive prompts
- a size watchdog that kills background tasks whose output file grows without
  bound

The size watchdog exists because once a process is backgrounded there is no
foreground timeout left to cap a runaway append loop.

## 6. Security Mechanisms Worth Calling Out

The strongest safeguards are:

- AST `too-complex -> ask`
- AST semantic fail -> ask
- exact deny preservation on ambiguous commands
- sandbox auto-allow that still respects explicit deny and ask
- original-command redirect revalidation after pipe splitting
- `cd + git` checks both within and across segments
- read-only fast path hardening for git and working-directory edge cases
- process-substitution rejection
- dangerous removal path checks
- background prompt detection and output size watchdogs

## 7. Complexity Hotspots

The code is strong on defensive fixes, but expensive to reason about.

### Hotspot 1: dual security paths

The system still carries both:

- the AST-first path
- the legacy shell-quote and regex path

That means logic is sometimes expressed twice, and downstream code still
re-tokenizes command strings in places where AST data already exists.

### Hotspot 2: wrapper and env stripping duplication

Safe-wrapper stripping is implemented in several forms:

- string-based stripping for rule matching
- argv-based stripping for AST-derived commands
- semantic wrapper stripping inside `checkSemantics`

The code comments explicitly warn that these implementations must stay in sync.

### Hotspot 3: precedence concentration

`bashToolHasPermission()` carries too much precedence logic in one place:

- AST result handling
- sandbox auto-allow
- exact rules
- classifier calls
- operator handling
- legacy misparse checks
- subcommand splitting
- `cd + git`
- original-command path checks
- merged suggestion synthesis

It works, but it is high-risk to modify.

## 8. Recommended Follow-ups

1. Push AST-derived argv and redirect data further downstream so path and rule
   evaluation stop reparsing strings when the AST already succeeded.
2. Consolidate wrapper and env stripping into one shared source of truth.
3. Split `bashToolHasPermission()` into smaller phases with explicit contracts.
4. Add golden tests for precedence-heavy regressions.

Suggested regression cases:

- `cd sub && git status`
- `cd sub && echo x | git status`
- `echo x | xargs printf '%s' >> file`
- `nohup FOO=bar timeout 5 cmd`
- `timeout .5 eval 'id'`
- `rm -- -/../file`
- `echo secret > >(tee .git/config)`

## Validation Notes

This repository is a leaked source snapshot, not a complete product checkout.
The root does not expose the usual top-level build metadata for a full
application build, so this document should be read as a static architecture and
security analysis of the available source tree.
