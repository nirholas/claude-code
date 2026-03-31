/**
 * Comprehensive test suite for the Claude Code Explorer MCP server.
 *
 * Uses the MCP Client SDK with a custom in-memory transport pair to test
 * the server end-to-end through the MCP protocol interface. This avoids
 * needing to export internal helpers and validates that clients see the
 * correct responses.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "../server.js";

// ---------------------------------------------------------------------------
// In-memory transport pair
// ---------------------------------------------------------------------------

/**
 * Creates a linked pair of Transport objects that communicate in-memory.
 * Messages sent on one side are received by the other, enabling end-to-end
 * tests without spawning a subprocess or opening a network port.
 */
function createInMemoryTransportPair(): [Transport, Transport] {
  let transportA: Transport;
  let transportB: Transport;

  transportA = {
    async start() {},
    async send(message: JSONRPCMessage) {
      // Deliver to the other side asynchronously (microtask) to match
      // real transport behavior and avoid stack-overflow on sync loops.
      await Promise.resolve();
      transportB.onmessage?.(message);
    },
    async close() {
      transportA.onclose?.();
      transportB.onclose?.();
    },
  };

  transportB = {
    async start() {},
    async send(message: JSONRPCMessage) {
      await Promise.resolve();
      transportA.onmessage?.(message);
    },
    async close() {
      transportB.onclose?.();
      transportA.onclose?.();
    },
  };

  return [transportA, transportB];
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Extract text from the first content block of a callTool result. */
function extractText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  if ("content" in result && Array.isArray(result.content)) {
    const first = result.content[0];
    if (first && "text" in first) return first.text as string;
  }
  throw new Error("Unexpected tool result shape: " + JSON.stringify(result));
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let client: Client;
let server: Server;
let clientTransport: Transport;
let serverTransport: Transport;

beforeAll(async () => {
  server = createServer();
  client = new Client({ name: "test-client", version: "0.0.1" });

  [clientTransport, serverTransport] = createInMemoryTransportPair();

  // Connect both sides — order matters: server first so it is ready to
  // handle the client's initialize request.
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

afterAll(async () => {
  await clientTransport.close();
});

// ---------------------------------------------------------------------------
// 1. Server creation
// ---------------------------------------------------------------------------

describe("createServer", () => {
  it("returns a valid Server instance", () => {
    const s = createServer();
    expect(s).toBeInstanceOf(Server);
  });
});

// ---------------------------------------------------------------------------
// 2. Tool listing
// ---------------------------------------------------------------------------

describe("listTools", () => {
  it("returns the expected set of tool names", async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "get_architecture",
      "get_command_source",
      "get_tool_source",
      "list_commands",
      "list_directory",
      "list_tools",
      "read_source_file",
      "search_source",
    ]);
  });

  it("each tool has a non-empty description and inputSchema", async () => {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
    }
  });
});

// ---------------------------------------------------------------------------
// 3. list_tools tool
// ---------------------------------------------------------------------------

describe("list_tools tool", () => {
  it("returns a JSON array of tool info objects", async () => {
    const result = await client.callTool({ name: "list_tools" });
    const text = extractText(result);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);

    // Each item should have name, directory, files
    for (const tool of parsed) {
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("directory");
      expect(tool).toHaveProperty("files");
      expect(typeof tool.name).toBe("string");
      expect(Array.isArray(tool.files)).toBe(true);
    }
  });

  it("includes the BashTool in the list", async () => {
    const result = await client.callTool({ name: "list_tools" });
    const parsed = JSON.parse(extractText(result));
    const bash = parsed.find(
      (t: { name: string }) => t.name === "BashTool"
    );
    expect(bash).toBeDefined();
    expect(bash.directory).toBe("tools/BashTool");
    expect(bash.files.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 4. list_commands tool
// ---------------------------------------------------------------------------

describe("list_commands tool", () => {
  it("returns a JSON array of command info objects", async () => {
    const result = await client.callTool({ name: "list_commands" });
    const text = extractText(result);
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);

    for (const cmd of parsed) {
      expect(cmd).toHaveProperty("name");
      expect(cmd).toHaveProperty("path");
      expect(typeof cmd.isDirectory).toBe("boolean");
    }
  });

  it("includes the commit command", async () => {
    const result = await client.callTool({ name: "list_commands" });
    const parsed = JSON.parse(extractText(result));
    const commit = parsed.find(
      (c: { name: string }) => c.name === "commit"
    );
    expect(commit).toBeDefined();
    expect(commit.path).toBe("commands/commit.ts");
    expect(commit.isDirectory).toBe(false);
  });

  it("includes the mcp command (directory-based)", async () => {
    const result = await client.callTool({ name: "list_commands" });
    const parsed = JSON.parse(extractText(result));
    const mcp = parsed.find(
      (c: { name: string }) => c.name === "mcp"
    );
    expect(mcp).toBeDefined();
    expect(mcp.isDirectory).toBe(true);
    expect(Array.isArray(mcp.files)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. get_architecture tool
// ---------------------------------------------------------------------------

describe("get_architecture tool", () => {
  it("returns a well-formed markdown overview", async () => {
    const result = await client.callTool({ name: "get_architecture" });
    const text = extractText(result);
    expect(text).toContain("# Claude Code Architecture Overview");
    expect(text).toContain("## Source Root");
    expect(text).toContain("## Top-Level Entries");
    expect(text).toContain("## Agent Tools");
    expect(text).toContain("## Slash Commands");
    expect(text).toContain("## Key Files");
    expect(text).toContain("## Core Subsystems");
  });

  it("lists real tool and command counts", async () => {
    const result = await client.callTool({ name: "get_architecture" });
    const text = extractText(result);
    // Should contain at least "Agent Tools (N)" with N > 0
    const toolMatch = text.match(/Agent Tools \((\d+)\)/);
    expect(toolMatch).toBeTruthy();
    expect(Number(toolMatch![1])).toBeGreaterThan(0);

    const cmdMatch = text.match(/Slash Commands \((\d+)\)/);
    expect(cmdMatch).toBeTruthy();
    expect(Number(cmdMatch![1])).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 6. list_directory tool
// ---------------------------------------------------------------------------

describe("list_directory tool", () => {
  it("lists src/ root entries when path is empty", async () => {
    const result = await client.callTool({
      name: "list_directory",
      arguments: { path: "" },
    });
    const text = extractText(result);
    const entries = text.split("\n").filter(Boolean);
    expect(entries.length).toBeGreaterThan(0);
    // Should include known top-level items
    expect(entries).toContain("commands/");
    expect(entries).toContain("tools/");
  });

  it("lists tools subdirectory", async () => {
    const result = await client.callTool({
      name: "list_directory",
      arguments: { path: "tools" },
    });
    const text = extractText(result);
    expect(text).toContain("BashTool/");
    expect(text).toContain("FileReadTool/");
  });

  it("rejects path traversal attempts", async () => {
    await expect(
      client.callTool({
        name: "list_directory",
        arguments: { path: "../../etc" },
      })
    ).rejects.toThrow();
  });

  it("rejects nonexistent directory", async () => {
    await expect(
      client.callTool({
        name: "list_directory",
        arguments: { path: "this_directory_does_not_exist" },
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. read_source_file tool
// ---------------------------------------------------------------------------

describe("read_source_file tool", () => {
  it("reads a known file", async () => {
    const result = await client.callTool({
      name: "read_source_file",
      arguments: { path: "commands.ts" },
    });
    const text = extractText(result);
    // The output includes line numbers, e.g. "    1 | import ..."
    expect(text).toMatch(/^\s+1 \|/);
    expect(text.split("\n").length).toBeGreaterThan(1);
  });

  it("respects startLine and endLine", async () => {
    const result = await client.callTool({
      name: "read_source_file",
      arguments: { path: "commands.ts", startLine: 2, endLine: 4 },
    });
    const text = extractText(result);
    const lines = text.split("\n");
    expect(lines.length).toBe(3);
    // First line should be line 2
    expect(lines[0]).toMatch(/^\s+2 \|/);
    // Last line should be line 4
    expect(lines[2]).toMatch(/^\s+4 \|/);
  });

  it("rejects nonexistent file", async () => {
    await expect(
      client.callTool({
        name: "read_source_file",
        arguments: { path: "does_not_exist.ts" },
      })
    ).rejects.toThrow();
  });

  it("rejects path traversal", async () => {
    await expect(
      client.callTool({
        name: "read_source_file",
        arguments: { path: "../../package.json" },
      })
    ).rejects.toThrow();
  });

  it("requires path argument", async () => {
    await expect(
      client.callTool({
        name: "read_source_file",
        arguments: {},
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 8. search_source tool
// ---------------------------------------------------------------------------

describe("search_source tool", () => {
  it("finds matches for a known pattern", async () => {
    const result = await client.callTool({
      name: "search_source",
      arguments: { pattern: "import.*from" },
    });
    const text = extractText(result);
    expect(text).toContain("Found");
    expect(text).toContain("match");
  });

  it("returns no matches for an impossible pattern", async () => {
    const result = await client.callTool({
      name: "search_source",
      arguments: {
        pattern: "xyzzy_impossible_string_that_never_appears_12345",
      },
    });
    const text = extractText(result);
    expect(text).toBe("No matches found.");
  });

  it("respects filePattern filter", async () => {
    const result = await client.callTool({
      name: "search_source",
      arguments: { pattern: "import", filePattern: ".tsx" },
    });
    const text = extractText(result);
    if (text !== "No matches found.") {
      // Skip the summary header line ("Found N match(es):") and blank lines.
      // Match lines follow the pattern: "relative/path.tsx:lineNum: content"
      const matchLines = text
        .split("\n")
        .filter((l) => /^\S+\.\w+:\d+:/.test(l));
      expect(matchLines.length).toBeGreaterThan(0);
      for (const line of matchLines) {
        const filePath = line.split(":")[0];
        expect(filePath).toMatch(/\.tsx$/);
      }
    }
  });

  it("respects maxResults limit", async () => {
    const result = await client.callTool({
      name: "search_source",
      arguments: { pattern: "import", maxResults: 3 },
    });
    const text = extractText(result);
    const matchCountMatch = text.match(/Found (\d+) match/);
    if (matchCountMatch) {
      expect(Number(matchCountMatch[1])).toBeLessThanOrEqual(3);
    }
  });

  it("rejects invalid regex", async () => {
    await expect(
      client.callTool({
        name: "search_source",
        arguments: { pattern: "[invalid" },
      })
    ).rejects.toThrow();
  });

  it("requires pattern argument", async () => {
    await expect(
      client.callTool({
        name: "search_source",
        arguments: {},
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 9. get_tool_source tool
// ---------------------------------------------------------------------------

describe("get_tool_source tool", () => {
  it("reads the BashTool main source file", async () => {
    const result = await client.callTool({
      name: "get_tool_source",
      arguments: { toolName: "BashTool" },
    });
    const text = extractText(result);
    expect(text).toContain("tools/BashTool/");
    expect(text).toContain("lines");
  });

  it("reads a specific file within a tool directory", async () => {
    const result = await client.callTool({
      name: "get_tool_source",
      arguments: { toolName: "BashTool", fileName: "prompt.ts" },
    });
    const text = extractText(result);
    expect(text).toContain("tools/BashTool/prompt.ts");
  });

  it("rejects nonexistent tool", async () => {
    await expect(
      client.callTool({
        name: "get_tool_source",
        arguments: { toolName: "NonExistentTool" },
      })
    ).rejects.toThrow();
  });

  it("rejects nonexistent file within a valid tool", async () => {
    await expect(
      client.callTool({
        name: "get_tool_source",
        arguments: { toolName: "BashTool", fileName: "nope.ts" },
      })
    ).rejects.toThrow();
  });

  it("requires toolName argument", async () => {
    await expect(
      client.callTool({
        name: "get_tool_source",
        arguments: {},
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 10. get_command_source tool
// ---------------------------------------------------------------------------

describe("get_command_source tool", () => {
  it("reads a file-based command (commit)", async () => {
    const result = await client.callTool({
      name: "get_command_source",
      arguments: { commandName: "commit" },
    });
    const text = extractText(result);
    // Should contain actual source code
    expect(text.length).toBeGreaterThan(10);
  });

  it("lists files for a directory-based command (mcp)", async () => {
    const result = await client.callTool({
      name: "get_command_source",
      arguments: { commandName: "mcp" },
    });
    const text = extractText(result);
    expect(text).toContain("Command: mcp");
    expect(text).toContain("Files:");
  });

  it("reads a specific file from a directory-based command", async () => {
    const result = await client.callTool({
      name: "get_command_source",
      arguments: { commandName: "mcp", fileName: "index.ts" },
    });
    const text = extractText(result);
    expect(text.length).toBeGreaterThan(10);
  });

  it("rejects nonexistent command", async () => {
    await expect(
      client.callTool({
        name: "get_command_source",
        arguments: { commandName: "nonexistent_command_xyz" },
      })
    ).rejects.toThrow();
  });

  it("rejects nonexistent file in a valid directory command", async () => {
    await expect(
      client.callTool({
        name: "get_command_source",
        arguments: { commandName: "mcp", fileName: "nope.ts" },
      })
    ).rejects.toThrow();
  });

  it("requires commandName argument", async () => {
    await expect(
      client.callTool({
        name: "get_command_source",
        arguments: {},
      })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 11. Unknown tool
// ---------------------------------------------------------------------------

describe("unknown tool", () => {
  it("rejects calling an unknown tool name", async () => {
    await expect(
      client.callTool({ name: "totally_unknown_tool" })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 12. Path traversal prevention (safePath)
// ---------------------------------------------------------------------------

describe("path traversal prevention", () => {
  const traversalPaths = [
    "../package.json",
    "../../etc/passwd",
    "tools/../../package.json",
    "tools/../../../etc/hosts",
  ];

  for (const badPath of traversalPaths) {
    it(`blocks traversal via read_source_file: "${badPath}"`, async () => {
      await expect(
        client.callTool({
          name: "read_source_file",
          arguments: { path: badPath },
        })
      ).rejects.toThrow();
    });

    it(`blocks traversal via list_directory: "${badPath}"`, async () => {
      await expect(
        client.callTool({
          name: "list_directory",
          arguments: { path: badPath },
        })
      ).rejects.toThrow();
    });
  }
});

// ---------------------------------------------------------------------------
// 13. Resources
// ---------------------------------------------------------------------------

describe("resources", () => {
  it("lists the three static resources", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri).sort();
    expect(uris).toEqual([
      "claude-code://architecture",
      "claude-code://commands",
      "claude-code://tools",
    ]);
  });

  it("reads the architecture resource", async () => {
    const { contents } = await client.readResource({
      uri: "claude-code://architecture",
    });
    expect(contents.length).toBe(1);
    expect(contents[0]).toHaveProperty("uri", "claude-code://architecture");
  });

  it("reads the tools resource as JSON", async () => {
    const { contents } = await client.readResource({
      uri: "claude-code://tools",
    });
    expect(contents.length).toBe(1);
    const text = (contents[0] as { text: string }).text;
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("reads the commands resource as JSON", async () => {
    const { contents } = await client.readResource({
      uri: "claude-code://commands",
    });
    expect(contents.length).toBe(1);
    const text = (contents[0] as { text: string }).text;
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("reads a source file via resource URI", async () => {
    const { contents } = await client.readResource({
      uri: "claude-code://source/commands.ts",
    });
    expect(contents.length).toBe(1);
    const text = (contents[0] as { text: string }).text;
    expect(text).toContain("import");
  });

  it("rejects unknown resource URI", async () => {
    await expect(
      client.readResource({ uri: "claude-code://nonexistent" })
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 14. Prompts
// ---------------------------------------------------------------------------

describe("prompts", () => {
  it("lists all available prompts", async () => {
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name).sort();
    expect(names).toEqual([
      "architecture_overview",
      "compare_tools",
      "explain_command",
      "explain_tool",
      "how_does_it_work",
    ]);
  });

  it("each prompt has a description", async () => {
    const { prompts } = await client.listPrompts();
    for (const p of prompts) {
      expect(p.description).toBeTruthy();
    }
  });

  it("gets the explain_tool prompt", async () => {
    const result = await client.getPrompt({
      name: "explain_tool",
      arguments: { toolName: "BashTool" },
    });
    expect(result.messages.length).toBeGreaterThan(0);
    const msg = result.messages[0];
    expect(msg.role).toBe("user");
    const textContent = msg.content as { type: string; text: string };
    expect(textContent.text).toContain("BashTool");
  });

  it("gets the explain_command prompt", async () => {
    const result = await client.getPrompt({
      name: "explain_command",
      arguments: { commandName: "commit" },
    });
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it("gets the architecture_overview prompt", async () => {
    const result = await client.getPrompt({
      name: "architecture_overview",
    });
    expect(result.messages.length).toBeGreaterThan(0);
  });

  it("rejects explain_tool without toolName", async () => {
    await expect(
      client.getPrompt({ name: "explain_tool" })
    ).rejects.toThrow();
  });

  it("rejects unknown prompt", async () => {
    await expect(
      client.getPrompt({ name: "nonexistent_prompt" })
    ).rejects.toThrow();
  });
});
