#!/usr/bin/env npx tsx
/**
 * scripts/test-mcp.ts
 * Test MCP client/server roundtrip using the standalone mcp-server sub-project.
 *
 * Usage:
 *   cd mcp-server && npm install && npm run build && cd ..
 *   npx tsx scripts/test-mcp.ts
 *
 * What it does:
 *   1. Spawns mcp-server/dist/index.js as a child process (stdio transport)
 *   2. Creates an MCP client using @modelcontextprotocol/sdk
 *   3. Connects client to server
 *   4. Lists available tools
 *   5. Calls list_tools and read_source_file tools
 *   6. Lists resources and reads one
 *   7. Prints results and exits
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

// ── Helpers ───────────────────────────────────────────────────────────────

function section(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"─".repeat(60)}`);
}

function jsonPretty(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const serverScript = resolve(PROJECT_ROOT, "mcp-server", "dist", "index.js");
  const srcRoot = resolve(PROJECT_ROOT, "src");

  section("1. Spawning MCP server (stdio transport)");
  console.log(`  Server: ${serverScript}`);
  console.log(`  SRC_ROOT: ${srcRoot}`);

  const transport = new StdioClientTransport({
    command: "node",
    args: [serverScript],
    env: {
      ...process.env,
      CLAUDE_CODE_SRC_ROOT: srcRoot,
    } as Record<string, string>,
    stderr: "pipe",
  });

  // Log stderr from the server process
  if (transport.stderr) {
    transport.stderr.on("data", (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log(`  [server stderr] ${msg}`);
    });
  }

  section("2. Creating MCP client");
  const client = new Client(
    {
      name: "test-mcp-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  section("3. Connecting client → server");
  await client.connect(transport);
  console.log("  ✓ Connected successfully");

  // ── List Tools ──────────────────────────────────────────────────────────
  section("4. Listing available tools");
  const toolsResult = await client.listTools();
  console.log(`  Found ${toolsResult.tools.length} tool(s):`);
  for (const tool of toolsResult.tools) {
    console.log(`    • ${tool.name} — ${tool.description?.slice(0, 80)}`);
  }

  // ── Call list_tools ─────────────────────────────────────────────────────
  section("5. Calling tool: list_tools");
  const listToolsResult = await client.callTool({
    name: "list_tools",
    arguments: {},
  });
  const listToolsContent = listToolsResult.content as Array<{
    type: string;
    text: string;
  }>;
  const listToolsText = listToolsContent
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  // Show first 500 chars
  console.log(
    `  Result (first 500 chars):\n${listToolsText.slice(0, 500)}${listToolsText.length > 500 ? "\n  …(truncated)" : ""}`
  );

  // ── Call read_source_file ───────────────────────────────────────────────
  section("6. Calling tool: read_source_file (path: 'main.tsx', lines 1-20)");
  const readResult = await client.callTool({
    name: "read_source_file",
    arguments: { path: "main.tsx", startLine: 1, endLine: 20 },
  });
  const readContent = readResult.content as Array<{
    type: string;
    text: string;
  }>;
  const readText = readContent
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");
  console.log(`  Result:\n${readText.slice(0, 600)}`);

  // ── List Resources ──────────────────────────────────────────────────────
  section("7. Listing resources");
  try {
    const resourcesResult = await client.listResources();
    console.log(`  Found ${resourcesResult.resources.length} resource(s):`);
    for (const res of resourcesResult.resources.slice(0, 10)) {
      console.log(`    • ${res.name} (${res.uri})`);
    }
    if (resourcesResult.resources.length > 10) {
      console.log(
        `    …and ${resourcesResult.resources.length - 10} more`
      );
    }

    // Read the first resource
    if (resourcesResult.resources.length > 0) {
      const firstRes = resourcesResult.resources[0]!;
      section(`8. Reading resource: ${firstRes.name}`);
      const resContent = await client.readResource({ uri: firstRes.uri });
      const resText = resContent.contents
        .filter((c): c is { uri: string; text: string; mimeType?: string } => "text" in c)
        .map((c) => c.text)
        .join("\n");
      console.log(
        `  Content (first 400 chars):\n${resText.slice(0, 400)}${resText.length > 400 ? "\n  …(truncated)" : ""}`
      );
    }
  } catch (err) {
    console.log(`  Resources not supported or error: ${err}`);
  }

  // ── List Prompts ────────────────────────────────────────────────────────
  section("9. Listing prompts");
  try {
    const promptsResult = await client.listPrompts();
    console.log(`  Found ${promptsResult.prompts.length} prompt(s):`);
    for (const p of promptsResult.prompts) {
      console.log(`    • ${p.name} — ${p.description?.slice(0, 80)}`);
    }
  } catch (err) {
    console.log(`  Prompts not supported or error: ${err}`);
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────
  section("Done ✓");
  console.log("  All tests passed. Closing connection.");
  await client.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("\n✗ Test failed:", err);
  process.exit(1);
});
