/**
 * Shared MCP server definition — transport-agnostic.
 *
 * Exposes tools and resources for exploring the Claude Code source code.
 * This module is imported by both the STDIO and HTTP entrypoints.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SRC_ROOT = path.resolve(
  process.env.CLAUDE_CODE_SRC_ROOT ?? path.join(__dirname, "..", "..", "src")
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function dirExists(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isFile();
  } catch {
    return false;
  }
}

async function listDir(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .map((e) => (e.isDirectory() ? e.name + "/" : e.name))
      .sort();
  } catch {
    return [];
  }
}

async function walkFiles(root: string, rel = ""): Promise<string[]> {
  const results: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(path.join(root, rel), { withFileTypes: true });
  } catch {
    return results;
  }
  for (const e of entries) {
    const child = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      results.push(...(await walkFiles(root, child)));
    } else {
      results.push(child);
    }
  }
  return results;
}

/** Safely resolve a user-supplied relative path under SRC_ROOT (blocks path traversal). */
function safePath(relPath: string): string | null {
  const resolved = path.resolve(SRC_ROOT, relPath);
  if (!resolved.startsWith(SRC_ROOT)) return null;
  return resolved;
}

// ---------------------------------------------------------------------------
// Metadata Types
// ---------------------------------------------------------------------------

interface ToolInfo {
  name: string;
  directory: string;
  files: string[];
}

interface CommandInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  files?: string[];
}

async function getToolList(): Promise<ToolInfo[]> {
  const toolsDir = path.join(SRC_ROOT, "tools");
  const entries = await fs.readdir(toolsDir, { withFileTypes: true });
  const tools: ToolInfo[] = [];
  for (const e of entries) {
    if (!e.isDirectory() || e.name === "shared" || e.name === "testing")
      continue;
    const files = await listDir(path.join(toolsDir, e.name));
    tools.push({ name: e.name, directory: `tools/${e.name}`, files });
  }
  return tools.sort((a, b) => a.name.localeCompare(b.name));
}

async function getCommandList(): Promise<CommandInfo[]> {
  const cmdsDir = path.join(SRC_ROOT, "commands");
  const entries = await fs.readdir(cmdsDir, { withFileTypes: true });
  const commands: CommandInfo[] = [];
  for (const e of entries) {
    if (e.isDirectory()) {
      const files = await listDir(path.join(cmdsDir, e.name));
      commands.push({
        name: e.name,
        path: `commands/${e.name}`,
        isDirectory: true,
        files,
      });
    } else {
      commands.push({
        name: e.name.replace(/\.(ts|tsx)$/, ""),
        path: `commands/${e.name}`,
        isDirectory: false,
      });
    }
  }
  return commands.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Server Factory
// ---------------------------------------------------------------------------

export function createServer(): Server {
  const server = new Server(
    { name: "claude-code-explorer", version: "1.1.0" },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // ---- Resources ---------------------------------------------------------

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "claude-code://architecture",
        name: "Architecture Overview",
        description:
          "High-level overview of the Claude Code source architecture",
        mimeType: "text/markdown",
      },
      {
        uri: "claude-code://tools",
        name: "Tool Registry",
        description: "List of all agent tools with their files",
        mimeType: "application/json",
      },
      {
        uri: "claude-code://commands",
        name: "Command Registry",
        description: "List of all slash commands",
        mimeType: "application/json",
      },
    ],
  }));

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async () => ({
      resourceTemplates: [
        {
          uriTemplate: "claude-code://source/{path}",
          name: "Source file",
          description:
            "Read a source file from the Claude Code src/ directory",
          mimeType: "text/plain",
        },
      ],
    })
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: { params: { uri: string } }) => {
      const { uri } = request.params;

      if (uri === "claude-code://architecture") {
        const readmePath = path.resolve(SRC_ROOT, "..", "README.md");
        let text: string;
        try {
          text = await fs.readFile(readmePath, "utf-8");
        } catch {
          text = "README.md not found.";
        }
        return { contents: [{ uri, mimeType: "text/markdown", text }] };
      }

      if (uri === "claude-code://tools") {
        const tools = await getToolList();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(tools, null, 2),
            },
          ],
        };
      }

      if (uri === "claude-code://commands") {
        const commands = await getCommandList();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(commands, null, 2),
            },
          ],
        };
      }

      if (uri.startsWith("claude-code://source/")) {
        const relPath = uri.slice("claude-code://source/".length);
        const abs = safePath(relPath);
        if (!abs) throw new Error("Invalid path");
        const text = await fs.readFile(abs, "utf-8");
        return { contents: [{ uri, mimeType: "text/plain", text }] };
      }

      throw new Error(`Unknown resource: ${uri}`);
    }
  );

  // ---- Tools -------------------------------------------------------------

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_tools",
        description:
          "List all Claude Code agent tools (BashTool, FileReadTool, etc.) with their source files.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "list_commands",
        description:
          "List all Claude Code slash commands (/commit, /review, /mcp, etc.) with their source files.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      {
        name: "get_tool_source",
        description:
          "Read the full source code of a specific Claude Code tool implementation.",
        inputSchema: {
          type: "object" as const,
          properties: {
            toolName: {
              type: "string",
              description: "Tool directory name, e.g. 'BashTool'",
            },
            fileName: {
              type: "string",
              description:
                "Specific file within the tool directory. Omit for the main file.",
            },
          },
          required: ["toolName"],
        },
      },
      {
        name: "get_command_source",
        description:
          "Read the source code of a specific Claude Code slash command.",
        inputSchema: {
          type: "object" as const,
          properties: {
            commandName: {
              type: "string",
              description: "Command name, e.g. 'commit', 'review'",
            },
            fileName: {
              type: "string",
              description: "Specific file within the command directory.",
            },
          },
          required: ["commandName"],
        },
      },
      {
        name: "read_source_file",
        description:
          "Read any source file from the Claude Code src/ directory by relative path.",
        inputSchema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "Relative path from src/, e.g. 'QueryEngine.ts'",
            },
            startLine: {
              type: "number",
              description: "1-based start line.",
            },
            endLine: {
              type: "number",
              description: "1-based end line.",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "search_source",
        description:
          "Search for a regex pattern across the Claude Code source. Returns matching lines with paths and line numbers.",
        inputSchema: {
          type: "object" as const,
          properties: {
            pattern: {
              type: "string",
              description: "Search pattern (regex).",
            },
            filePattern: {
              type: "string",
              description: "File extension filter, e.g. '.ts'",
            },
            maxResults: {
              type: "number",
              description: "Max matches (default: 50).",
            },
          },
          required: ["pattern"],
        },
      },
      {
        name: "list_directory",
        description: "List files and subdirectories under src/.",
        inputSchema: {
          type: "object" as const,
          properties: {
            path: {
              type: "string",
              description: "Relative path from src/, e.g. 'services'. '' for root.",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "get_architecture",
        description:
          "Get a high-level architecture overview of Claude Code.",
        inputSchema: { type: "object" as const, properties: {} },
      },
    ],
  }));

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: {
      params: { name: string; arguments?: Record<string, unknown> };
    }) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "list_tools": {
          const tools = await getToolList();
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(tools, null, 2) },
            ],
          };
        }

        case "list_commands": {
          const commands = await getCommandList();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(commands, null, 2),
              },
            ],
          };
        }

        case "get_tool_source": {
          const toolName = (args as Record<string, unknown>)
            ?.toolName as string;
          if (!toolName) throw new Error("toolName is required");
          const toolDir = safePath(`tools/${toolName}`);
          if (!toolDir || !(await dirExists(toolDir)))
            throw new Error(`Tool not found: ${toolName}`);

          let fileName = (args as Record<string, unknown>)?.fileName as
            | string
            | undefined;
          if (!fileName) {
            const files = await listDir(toolDir);
            const main =
              files.find(
                (f) => f === `${toolName}.ts` || f === `${toolName}.tsx`
              ) ??
              files.find((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
            if (!main) throw new Error(`No source files in ${toolName}`);
            fileName = main;
          }

          const filePath = safePath(`tools/${toolName}/${fileName}`);
          if (!filePath || !(await fileExists(filePath)))
            throw new Error(`File not found: tools/${toolName}/${fileName}`);
          const content = await fs.readFile(filePath, "utf-8");
          return {
            content: [
              {
                type: "text" as const,
                text: `// tools/${toolName}/${fileName}\n// ${content.split("\n").length} lines\n\n${content}`,
              },
            ],
          };
        }

        case "get_command_source": {
          const commandName = (args as Record<string, unknown>)
            ?.commandName as string;
          if (!commandName) throw new Error("commandName is required");

          const candidates = [
            `commands/${commandName}`,
            `commands/${commandName}.ts`,
            `commands/${commandName}.tsx`,
          ];
          let found: string | null = null;
          let isDir = false;
          for (const c of candidates) {
            const abs = safePath(c);
            if (abs && (await dirExists(abs))) {
              found = abs;
              isDir = true;
              break;
            }
            if (abs && (await fileExists(abs))) {
              found = abs;
              break;
            }
          }
          if (!found) throw new Error(`Command not found: ${commandName}`);

          if (!isDir) {
            const content = await fs.readFile(found, "utf-8");
            return { content: [{ type: "text" as const, text: content }] };
          }

          const reqFile = (args as Record<string, unknown>)?.fileName as
            | string
            | undefined;
          if (reqFile) {
            const filePath = safePath(`commands/${commandName}/${reqFile}`);
            if (!filePath || !(await fileExists(filePath)))
              throw new Error(
                `File not found: commands/${commandName}/${reqFile}`
              );
            const content = await fs.readFile(filePath, "utf-8");
            return { content: [{ type: "text" as const, text: content }] };
          }

          const files = await listDir(found);
          return {
            content: [
              {
                type: "text" as const,
                text: `Command: ${commandName}\nFiles:\n${files.map((f) => `  ${f}`).join("\n")}`,
              },
            ],
          };
        }

        case "read_source_file": {
          const relPath = (args as Record<string, unknown>)?.path as string;
          if (!relPath) throw new Error("path is required");
          const abs = safePath(relPath);
          if (!abs || !(await fileExists(abs)))
            throw new Error(`File not found: ${relPath}`);
          const content = await fs.readFile(abs, "utf-8");
          const lines = content.split("\n");
          const start =
            ((args as Record<string, unknown>)?.startLine as number) ?? 1;
          const end =
            ((args as Record<string, unknown>)?.endLine as number) ??
            lines.length;
          const slice = lines.slice(
            Math.max(0, start - 1),
            Math.min(lines.length, end)
          );
          return {
            content: [
              {
                type: "text" as const,
                text: slice
                  .map(
                    (l: string, i: number) =>
                      `${(start + i).toString().padStart(5)} | ${l}`
                  )
                  .join("\n"),
              },
            ],
          };
        }

        case "search_source": {
          const pattern = (args as Record<string, unknown>)
            ?.pattern as string;
          if (!pattern) throw new Error("pattern is required");
          const filePattern = (args as Record<string, unknown>)
            ?.filePattern as string | undefined;
          const maxResults =
            ((args as Record<string, unknown>)?.maxResults as number) ?? 50;

          let regex: RegExp;
          try {
            regex = new RegExp(pattern, "i");
          } catch {
            throw new Error(`Invalid regex pattern: ${pattern}`);
          }

          const allFiles = await walkFiles(SRC_ROOT);
          const filtered = filePattern
            ? allFiles.filter((f) => f.endsWith(filePattern))
            : allFiles;

          const matches: string[] = [];
          for (const file of filtered) {
            if (matches.length >= maxResults) break;
            const abs = path.join(SRC_ROOT, file);
            let content: string;
            try {
              content = await fs.readFile(abs, "utf-8");
            } catch {
              continue;
            }
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (matches.length >= maxResults) break;
              if (regex.test(lines[i]!)) {
                matches.push(`${file}:${i + 1}: ${lines[i]!.trim()}`);
              }
            }
          }

          return {
            content: [
              {
                type: "text" as const,
                text:
                  matches.length > 0
                    ? `Found ${matches.length} match(es):\n\n${matches.join("\n")}`
                    : "No matches found.",
              },
            ],
          };
        }

        case "list_directory": {
          const relPath =
            ((args as Record<string, unknown>)?.path as string) ?? "";
          const abs = safePath(relPath);
          if (!abs || !(await dirExists(abs)))
            throw new Error(`Directory not found: ${relPath}`);
          const entries = await listDir(abs);
          return {
            content: [
              {
                type: "text" as const,
                text:
                  entries.length > 0
                    ? entries.join("\n")
                    : "(empty directory)",
              },
            ],
          };
        }

        case "get_architecture": {
          const topLevel = await listDir(SRC_ROOT);
          const tools = await getToolList();
          const commands = await getCommandList();

          const overview = `# Claude Code Architecture Overview

## Source Root
${SRC_ROOT}

## Top-Level Entries
${topLevel.map((e) => `- ${e}`).join("\n")}

## Agent Tools (${tools.length})
${tools.map((t) => `- **${t.name}** — ${t.files.length} files: ${t.files.join(", ")}`).join("\n")}

## Slash Commands (${commands.length})
${commands.map((c) => `- **${c.name}** ${c.isDirectory ? "(directory)" : "(file)"}${c.files ? ": " + c.files.join(", ") : ""}`).join("\n")}

## Key Files
- **main.tsx** — CLI entrypoint (Commander.js)
- **QueryEngine.ts** — Core LLM API caller, streaming, tool loops
- **Tool.ts** — Base tool types, schemas, permission model
- **commands.ts** — Command registry and loader
- **tools.ts** — Tool registry and loader
- **context.ts** — System/user context collection

## Core Subsystems
- **bridge/** — IDE integration (VS Code, JetBrains)
- **coordinator/** — Multi-agent orchestration
- **services/mcp/** — MCP client connections
- **services/api/** — Anthropic API client
- **plugins/** — Plugin system
- **skills/** — Skill system
- **tasks/** — Background task management
- **server/** — Server/remote mode
`;
          return { content: [{ type: "text" as const, text: overview }] };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    }
  );

  // ---- Prompts -----------------------------------------------------------

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: "explain_tool",
        description:
          "Explain how a specific Claude Code tool works, including its input schema, permissions, and execution flow.",
        arguments: [
          {
            name: "toolName",
            description: "Tool directory name, e.g. 'BashTool', 'FileEditTool'",
            required: true,
          },
        ],
      },
      {
        name: "explain_command",
        description: "Explain how a specific Claude Code slash command works.",
        arguments: [
          {
            name: "commandName",
            description: "Command name, e.g. 'commit', 'review', 'mcp'",
            required: true,
          },
        ],
      },
      {
        name: "architecture_overview",
        description:
          "Get a guided tour of the Claude Code architecture with explanations of each subsystem.",
      },
      {
        name: "how_does_it_work",
        description:
          "Explain how a specific feature or subsystem of Claude Code works.",
        arguments: [
          {
            name: "feature",
            description:
              "Feature or subsystem, e.g. 'permission system', 'MCP client', 'query engine', 'bridge'",
            required: true,
          },
        ],
      },
      {
        name: "compare_tools",
        description:
          "Compare two Claude Code tools side by side — purpose, inputs, permissions, implementation.",
        arguments: [
          { name: "tool1", description: "First tool name", required: true },
          { name: "tool2", description: "Second tool name", required: true },
        ],
      },
    ],
  }));

  server.setRequestHandler(
    GetPromptRequestSchema,
    async (request: {
      params: { name: string; arguments?: Record<string, string> };
    }) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "explain_tool": {
          const toolName = args?.toolName;
          if (!toolName) throw new Error("toolName argument is required");
          const toolDir = safePath(`tools/${toolName}`);
          if (!toolDir || !(await dirExists(toolDir)))
            throw new Error(`Tool not found: ${toolName}`);
          const files = await listDir(toolDir);
          const mainFile =
            files.find(
              (f) => f === `${toolName}.ts` || f === `${toolName}.tsx`
            ) ?? files.find((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
          let source = "";
          if (mainFile) {
            source = await fs.readFile(path.join(toolDir, mainFile), "utf-8");
          }
          return {
            description: `Explanation of the ${toolName} tool`,
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Analyze and explain this Claude Code tool implementation. Cover:\n1. Purpose\n2. Input Schema\n3. Permissions\n4. Execution Flow\n5. Output\n6. Safety characteristics\n\nFiles in tools/${toolName}/: ${files.join(", ")}\n\nMain source (${mainFile ?? "not found"}):\n\`\`\`typescript\n${source}\n\`\`\``,
                },
              },
            ],
          };
        }

        case "explain_command": {
          const commandName = args?.commandName;
          if (!commandName)
            throw new Error("commandName argument is required");
          const candidates = [
            `commands/${commandName}`,
            `commands/${commandName}.ts`,
            `commands/${commandName}.tsx`,
          ];
          let found: string | null = null;
          let isDir = false;
          for (const c of candidates) {
            const abs = safePath(c);
            if (abs && (await dirExists(abs))) {
              found = abs;
              isDir = true;
              break;
            }
            if (abs && (await fileExists(abs))) {
              found = abs;
              break;
            }
          }
          if (!found) throw new Error(`Command not found: ${commandName}`);
          let source = "";
          let fileList = "";
          if (isDir) {
            const files = await listDir(found);
            fileList = files.join(", ");
            const indexFile = files.find(
              (f) => f === "index.ts" || f === "index.tsx"
            );
            if (indexFile) {
              source = await fs.readFile(
                path.join(found, indexFile),
                "utf-8"
              );
            }
          } else {
            source = await fs.readFile(found, "utf-8");
            fileList = path.basename(found);
          }
          return {
            description: `Explanation of the /${commandName} command`,
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Analyze and explain this Claude Code slash command. Cover:\n1. Purpose\n2. Type (prompt vs action)\n3. Allowed Tools\n4. Arguments\n5. Implementation\n\nFiles: ${fileList}\n\nSource:\n\`\`\`typescript\n${source}\n\`\`\``,
                },
              },
            ],
          };
        }

        case "architecture_overview": {
          const readmePath = path.resolve(SRC_ROOT, "..", "README.md");
          let readme = "";
          try {
            readme = await fs.readFile(readmePath, "utf-8");
          } catch {
            /* */
          }
          const topLevel = await listDir(SRC_ROOT);
          const tools = await getToolList();
          const commands = await getCommandList();
          return {
            description: "Architecture overview of Claude Code",
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Give a comprehensive guided tour of the Claude Code architecture.\n\n## README\n${readme}\n\n## src/ entries\n${topLevel.join("\n")}\n\n## Tools (${tools.length})\n${tools.map((t) => `- ${t.name}: ${t.files.join(", ")}`).join("\n")}\n\n## Commands (${commands.length})\n${commands.map((c) => `- ${c.name} ${c.isDirectory ? "(dir)" : "(file)"}`).join("\n")}`,
                },
              },
            ],
          };
        }

        case "how_does_it_work": {
          const feature = args?.feature;
          if (!feature) throw new Error("feature argument is required");
          const featureMap: Record<string, string[]> = {
            "permission system": [
              "utils/permissions/",
              "hooks/toolPermission/",
              "Tool.ts",
            ],
            permissions: [
              "utils/permissions/",
              "hooks/toolPermission/",
              "Tool.ts",
            ],
            "mcp client": [
              "services/mcp/",
              "tools/MCPTool/",
              "tools/ListMcpResourcesTool/",
            ],
            mcp: ["services/mcp/", "entrypoints/mcp.ts", "tools/MCPTool/"],
            "tool system": ["Tool.ts", "tools.ts", "tools/"],
            tools: ["Tool.ts", "tools.ts"],
            "query engine": ["QueryEngine.ts", "query/"],
            bridge: ["bridge/"],
            "ide integration": ["bridge/"],
            context: ["context.ts", "context/"],
            commands: ["commands.ts", "types/command.ts"],
            "command system": ["commands.ts", "types/command.ts", "commands/"],
            plugins: ["plugins/"],
            skills: ["skills/"],
            tasks: ["tasks.ts", "tasks/", "tools/TaskCreateTool/"],
            coordinator: ["coordinator/", "tools/AgentTool/"],
            "multi-agent": ["coordinator/", "tools/AgentTool/"],
            memory: ["memdir/", "commands/memory/"],
            voice: ["voice/"],
            server: ["server/"],
          };
          const paths = featureMap[feature.toLowerCase()] ?? [];
          let contextFiles = "";
          for (const p of paths) {
            const abs = safePath(p);
            if (!abs) continue;
            try {
              const stat = await fs.stat(abs);
              if (stat.isDirectory()) {
                const files = await listDir(abs);
                contextFiles += `\n### ${p}\nFiles: ${files.join(", ")}\n`;
              } else {
                const content = await fs.readFile(abs, "utf-8");
                const preview = content.split("\n").slice(0, 200).join("\n");
                contextFiles += `\n### ${p} (first 200 lines)\n\`\`\`typescript\n${preview}\n\`\`\`\n`;
              }
            } catch {
              /* skip */
            }
          }
          return {
            description: `How ${feature} works in Claude Code`,
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Explain how "${feature}" works in the Claude Code CLI.\n${contextFiles || "(No specific files mapped — use search_source and read_source_file to find relevant code.)"}`,
                },
              },
            ],
          };
        }

        case "compare_tools": {
          const tool1 = args?.tool1;
          const tool2 = args?.tool2;
          if (!tool1 || !tool2)
            throw new Error("Both tool1 and tool2 arguments are required");
          const sources: string[] = [];
          for (const toolName of [tool1, tool2]) {
            const toolDir = safePath(`tools/${toolName}`);
            if (!toolDir || !(await dirExists(toolDir))) {
              sources.push(`// Tool not found: ${toolName}`);
              continue;
            }
            const files = await listDir(toolDir);
            const mainFile =
              files.find(
                (f) => f === `${toolName}.ts` || f === `${toolName}.tsx`
              ) ?? files.find((f) => f.endsWith(".ts") || f.endsWith(".tsx"));
            if (mainFile) {
              const content = await fs.readFile(
                path.join(toolDir, mainFile),
                "utf-8"
              );
              sources.push(`// tools/${toolName}/${mainFile}\n${content}`);
            } else {
              sources.push(`// No main source found for ${toolName}`);
            }
          }
          return {
            description: `Comparison of ${tool1} vs ${tool2}`,
            messages: [
              {
                role: "user" as const,
                content: {
                  type: "text" as const,
                  text: `Compare these two Claude Code tools:\n\n## ${tool1}\n\`\`\`typescript\n${sources[0]}\n\`\`\`\n\n## ${tool2}\n\`\`\`typescript\n${sources[1]}\n\`\`\``,
                },
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    }
  );

  return server;
}

/** Validate that SRC_ROOT exists. Exits with error if not. */
export async function validateSrcRoot(): Promise<void> {
  if (!(await dirExists(SRC_ROOT))) {
    console.error(
      `Error: Claude Code src/ directory not found at ${SRC_ROOT}`
    );
    console.error(
      "Set CLAUDE_CODE_SRC_ROOT environment variable to the src/ directory path."
    );
    process.exit(1);
  }
}


