# PR Draft: Bash Tool Analysis

## Title

`docs: add Bash tool architecture and permission analysis`

## Summary

Add a repository document that explains how the Bash feature works end to end.

The new document covers:

- bash mode entry UX
- BashTool schema and special cases
- permission and sandbox precedence
- AST security parsing and legacy fallback
- shell execution and output persistence
- foreground and background task lifecycle

## Why

The Bash path is one of the most security-sensitive and behaviorally complex
parts of the codebase. Its logic is spread across UI, permission, parsing,
shell, and task modules. The new document makes the current architecture easier
to review and safer to change.

## Key Findings

### 1. The Bash path is layered, not monolithic

The behavior is distributed across:

- input UX
- permission UI
- permission and security engine
- shell execution layer
- task and background management

### 2. The permission model is intentionally fail-closed

- AST `too-complex` becomes `ask`
- semantic ambiguity becomes `ask`
- sandbox auto-allow still honors explicit deny and ask rules
- compound `cd + git` is blocked before read-only shortcuts

### 3. Operator handling is security-critical

Pipe and compound handling must validate the original command again after
segment processing so that redirect targets do not disappear during splitting.

### 4. Background execution is task-driven

The runtime supports explicit backgrounding, timeout-based backgrounding,
assistant auto-backgrounding, prompt-stall detection, and output-size
watchdogs.

## Risks

### Structural risks

- dual AST and legacy security paths
- repeated string reparsing after successful AST analysis
- precedence logic concentrated in one large function

### Maintenance risks

- wrapper and environment stripping logic exists in multiple forms
- regression fixes are spread across several layers and are easy to desync

## Follow-ups

1. Use AST-derived argv and redirects farther downstream.
2. Consolidate wrapper and env stripping into one shared implementation.
3. Split `bashToolHasPermission()` into smaller phases.
4. Add golden tests for precedence-heavy cases.

## Validation

- static source review only
- no full product build performed
- repository is a leaked `src/` snapshot, not a complete application checkout

## Files

- `docs/bash-tool-analysis.md`
