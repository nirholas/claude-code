# Claude Code — Technical Documentation

> Deep technical documentation of Claude Code's architecture, generated from analysis of the leaked source code (March 31, 2026).

## Documents

| Document | Description |
|----------|-------------|
| [Architecture Overview](./01-architecture-overview.md) | High-level system design, data flow, tech stack |
| [Startup & Initialization](./02-startup-initialization.md) | Boot sequence, parallel prefetches, migrations |
| [Query Engine & Core Loop](./03-query-engine.md) | The main API loop, streaming, error recovery, compaction |
| [Tool System](./04-tool-system.md) | Tool interface, registry, execution context, complete inventory |
| [BashTool Security](./05-bash-security.md) | 10.8K lines of security: lexical analysis, AST parsing, classification |
| [Permission System](./06-permissions.md) | Modes, rules, ML classifier, killswitch, filesystem protection |
| [System Prompt](./07-system-prompt.md) | Full prompt text, cache-aware sections, Ant-specific additions |
| [API Integration](./08-api-integration.md) | Client setup, attribution headers, attestation, error handling |
| [OAuth & Authentication](./09-oauth-auth.md) | OAuth config, scopes, FedStart, credential storage |
| [Analytics & Telemetry](./10-analytics-telemetry.md) | Events, GrowthBook, Datadog, PII protection |
| [Feature Flags](./11-feature-flags.md) | Compile-time (Bun) and runtime (GrowthBook) gates |
| [Agent System](./12-agent-system.md) | Sub-agents, teams, coordinator mode, fork guards |
| [MCP Integration](./13-mcp-integration.md) | Model Context Protocol: transports, config, auth, tools |
| [Hook System](./14-hooks.md) | Lifecycle events, configuration, enterprise controls |
| [Plugin System](./15-plugins.md) | Architecture, manifests, built-in plugins |
| [IDE Bridge](./16-ide-bridge.md) | VS Code & JetBrains integration, JWT auth, polling |
| [Commands](./17-commands.md) | 80+ slash commands, types, availability |
| [Context & Memory](./18-context-memory.md) | CLAUDE.md, compaction, session history, memory extraction |
| [Beta Headers & Models](./19-betas-models.md) | API betas, model IDs, knowledge cutoffs |
| [Security Audit](./20-security-audit.md) | Strengths, concerns, exposed credentials |
| [Internals & Easter Eggs](./21-internals-easter-eggs.md) | Codenames, hidden features, curiosities |
| [Codebase Stats](./22-codebase-stats.md) | File counts, line counts, largest files, dependencies, components, hooks |
