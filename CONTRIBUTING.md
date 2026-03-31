# Contributing

Thanks for your interest in contributing to this repository!

## What This Is

This repo archives the **leaked source code** of Anthropic's Claude Code CLI. Contributions here are about **documentation, tooling, and exploration aids** — not modifying the original Claude Code source.

## What You Can Contribute

- **Documentation** — Improve or expand the [docs/](docs/) directory
- **MCP Server** — Enhance the exploration MCP server in [mcp-server/](mcp-server/)
- **Analysis** — Write-ups, architecture diagrams, or annotated walkthroughs
- **Tooling** — Scripts or tools that aid in studying the source code
- **Bug fixes** — Fix issues in the MCP server or supporting infrastructure

## What Not to Change

- **`src/` directory** — This is the original leaked source, preserved as-is. Don't modify it.
- The [`backup` branch](https://github.com/nirholas/claude-code/tree/backup) contains the unmodified original.

## Getting Started

### Prerequisites

- **Node.js** 18+ (for the MCP server)
- **Git**

### Setup

```bash
git clone https://github.com/nirholas/claude-code.git
cd claude-code
```

### MCP Server Development

```bash
cd mcp-server
npm install
npm run dev    # Run with tsx (no build step)
npm run build  # Compile to dist/
```

### Linting & Type Checking

```bash
# From the repo root — checks the leaked src/
npm run lint        # Biome lint
npm run typecheck   # TypeScript type check
```

## Code Style

For any new code (MCP server, tooling, scripts):

- TypeScript with strict mode
- ES modules
- 2-space indentation (tabs for `src/` to match Biome config)
- Descriptive variable names, minimal comments

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b my-feature`)
3. Make your changes
4. Commit with a clear message
5. Push and open a pull request

## Questions?

Open an issue or reach out to [nichxbt](https://www.x.com/nichxbt).
