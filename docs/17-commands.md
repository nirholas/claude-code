# Command System

**Location:** `src/commands/` + `src/commands.ts`

## Command Sources (loading order)

```
1. Bundled skills (synchronous at startup)
2. Built-in plugin skills
3. Skill directory commands (.claude/skills/)
4. Workflow commands (.claude/workflows/)
5. Plugin commands
6. Plugin skills
7. Built-in commands (80+)
```

## Command Types

| Type | Description | Example |
|------|-------------|---------|
| `prompt` | Text that expands to model prompts | Skills |
| `local` | TUI-only commands | `/clear`, `/theme` |
| `local-jsx` | React/Ink UI commands | `/install`, `/statusline` |
| `workflow` | Workflow automation scripts | Custom workflows |

## Availability Filtering

| Requirement | Who Can Use |
|------------|-------------|
| `claude-ai` | Claude.ai subscribers (Pro/Max/Team/Enterprise) |
| `console` | Direct API customers |
| `ant` | Anthropic employees only (stripped from external builds) |

## Complete Command List

### Core Workflow
`/commit`, `/commit-push-pr`, `/review`, `/security-review`, `/diff`, `/compact`, `/plan`

### Configuration
`/config`, `/permissions`, `/mcp`, `/hooks`, `/theme`, `/vim`, `/keybindings`, `/model`, `/effort`, `/output-style`, `/color`

### Session Management
`/resume`, `/session`, `/share`, `/export`, `/rewind`, `/clear`, `/exit`

### Authentication
`/login`, `/logout`, `/oauth-refresh`

### Diagnostics
`/doctor`, `/debug-tool-call`, `/perf-issue`, `/heapdump`, `/stats`, `/status`, `/cost`, `/usage`

### Navigation & Context
`/files`, `/context`, `/agents`, `/memory`, `/skills`, `/tasks`

### Plugin & Extension
`/plugin`, `/mcp`, `/install`, `/install-github-app`, `/install-slack-app`

### Platform
`/desktop`, `/mobile`, `/chrome`, `/ide`, `/bridge`

### Information
`/help`, `/version`, `/release-notes`, `/onboarding`, `/upgrade`

### Fun & Easter Eggs
`/good-claude`, `/stickers`, `/buddy`, `/thinkback`, `/thinkback-play`

### Voice
`/voice`

### Advanced
`/ultraplan`, `/bughunter`, `/insights`, `/advisor`, `/teleport`, `/tag`, `/rename`, `/branch`, `/env`, `/remote-setup`, `/remote-env`, `/summary`, `/feedback`, `/privacy-settings`

### Ant-Only
`/ant-trace`, `/mock-limits`, `/sandbox-toggle`, `/extra-usage`, `/passes`, `/autofix-pr`, `/backfill-sessions`, `/break-cache`, `/btw`, `/rate-limit-options`, `/reset-limits`, `/fast`, `/ctx_viz`
