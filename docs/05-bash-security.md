# BashTool — Security Deep Dive

**Location:** `src/tools/BashTool/`
**Total:** 10,800+ lines of security validation code

This is the most security-critical component in Claude Code. Every shell command goes through multiple layers of validation before execution.

## File Breakdown

| File | Size | Purpose |
|------|------|---------|
| `BashTool.tsx` | 161KB | Main execution + security orchestration |
| `bashSecurity.ts` | 103KB | 22+ independent security validators |
| `bashPermissions.ts` | 99KB | Permission rule matching and enforcement |
| `readOnlyValidation.ts` | 68KB | Read-only command classification |
| `pathValidation.ts` | 44KB | Filesystem path security checks |
| `sedValidation.ts` | 22KB | sed in-place edit validation |

## Security Architecture — 4 Layers

### Layer 1: Lexical Analysis

Raw text analysis before any parsing:

| Check | What It Catches |
|-------|----------------|
| Quote extraction | Strips quotes to expose hidden metacharacters |
| Unescaped backticks | `` `command` `` injection |
| Command substitution | `$(...)` injection |
| Process substitution | `<()`, `>()` |
| Shell metacharacters | Newlines, control chars, unicode whitespace |
| Brace expansion | `{rm,-rf,/}` tricks |
| IFS injection | Modified Internal Field Separator |
| Mid-word hash | Quote-adjacent `#` symbols |
| Backslash operators | Escaped newlines and operators |
| Zsh blocklist | `zmodload`, `emulate`, `sysopen`, `ztcp`, `mapfile` |

### Layer 2: AST Parsing (Tree-sitter)

Structural understanding via tree-sitter:

- Full AST parsing of command strings
- `parseForSecurityFromAst()` walks the parse tree
- Separate handling per node type:
  - Simple commands
  - Compound commands (if/while/for)
  - Pipelines
  - Command lists (`&&`, `||`, `;`)
  - Subshells
- Heredoc-in-substitution detection
- Correct handling of quoting context

### Layer 3: Semantic Classification

Command-level risk assessment:

**90+ commands classified as safe:**
```
git, grep, find, ls, cat, jq, awk, sed (read-only), head, tail, wc,
sort, uniq, diff, file, stat, du, df, which, whoami, date, echo, printf,
true, false, test, [, pwd, basename, dirname, realpath, readlink,
env (read-only), tee (read-only), tr, cut, paste, column, fold, fmt,
expand, unexpand, nl, od, hexdump, xxd, md5sum, sha256sum, ...
```

**Per-command flag validation:**
| Command | Safe Flags Checked |
|---------|-------------------|
| `git` | `GIT_SAFE_FLAGS` list |
| `docker` | `DOCKER_SAFE_FLAGS` list |
| `fd` | Specific flag validation |
| `xargs` | Flag analysis |
| `file` | Flag analysis |
| `ripgrep` | `RIPGREP_SAFE_FLAGS` list |
| `pyright` | `PYRIGHT_SAFE_FLAGS` list |

**Pipeline validation:** ALL parts of a pipeline must be safe.
**Logical operators:** `&&`, `||` don't break read-only classification.

### Layer 4: Permission Rules

Pattern-based rule matching:

| Pattern Type | Example | Match Behavior |
|-------------|---------|----------------|
| Glob | `git add *` | Wildcard matching |
| Prefix | `npm run:*` | Allows `npm run X` but not `npm X` |
| Exact | `rm -rf /` | Exact string match |
| MCP tool | `mcp__server__*` | Server-level blocking |
| Content | Regex patterns | Content inspection |

Compound commands are split and each subcommand validated independently.

## Dangerous Patterns Detected

| Pattern | Risk |
|---------|------|
| Newlines in commands | Command injection |
| Backticks | Command substitution injection |
| `$(...)` unescaped | Command substitution |
| `<()`, `>()` | Process substitution (file descriptor tricks) |
| Zsh `=cmd` | Equals expansion (path resolution attack) |
| Brace expansion | `{malicious,args}` expansion |
| UNC paths (Windows) | NTLM credential leak |
| IFS modification | Field separator manipulation |
| Unicode whitespace | Visual deception |

## Sandbox Integration

```typescript
shouldUseSandbox()           // Determines if command needs sandboxing
detectBannedCommands()       // Commands requiring sandbox bypass
dangerouslyDisableSandbox    // User parameter to force-bypass

// Sandbox detection:
// - Docker container detection
// - Bubblewrap detection
// - IS_SANDBOX environment variable
```

## Input/Output Schema

```typescript
type BashToolInput = {
  command: string              // The shell command
  timeout?: number             // Timeout in milliseconds (max 600000)
  description?: string         // Human-readable description
  run_in_background?: boolean  // Fire-and-forget
  dangerouslyDisableSandbox?: boolean  // Force-bypass sandbox
}

type BashToolOutput = {
  stdout: string
  stderr: string
  isImage?: boolean
  backgroundTaskId?: string
  persistedOutputPath?: string  // For large outputs
  persistedOutputSize?: number
}
```
