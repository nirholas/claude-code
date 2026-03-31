# Plugin System

**Location:** `src/plugins/`

## Architecture

Plugins bundle three types of components:
1. **Skills** — slash commands and prompt-based workflows
2. **Hooks** — lifecycle event handlers
3. **MCP Servers** — Model Context Protocol server configurations

## Plugin ID Format

```
{name}@builtin    — Built-in plugins shipped with Claude Code
{name}@{source}   — Third-party/marketplace plugins
```

## Plugin Manifest

Each plugin has a manifest describing:
- Available skills
- Hook configurations
- MCP server settings
- Enable/disable default state
- Official vs. third-party designation (tracked in telemetry)

## Plugin Lifecycle

1. **Discovery** — Scan built-in plugins + user-installed plugins
2. **Loading** — Parse manifests, validate components
3. **Registration** — Register skills, hooks, MCP servers
4. **Hot-reload** — Change detection for live updates
5. **Cleanup** — Orphan version cleanup for cached plugins

## User Controls

- Enable/disable per plugin via `/plugin` command or settings
- User toggle state persisted in settings
- Default enabled state defined by manifest

## Built-in Plugin Registry

`builtinPlugins.ts` manages the registry of plugins shipped with Claude Code.
