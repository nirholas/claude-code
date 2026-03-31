#!/usr/bin/env node
/**
 * HTTP + SSE entrypoint — for remote hosting (Railway, Render, VPS, etc.)
 *
 * Supports:
 *   - Streamable HTTP transport (POST /mcp for JSON-RPC, GET /mcp for SSE)
 *   - Health check at GET /health
 *
 * Environment:
 *   PORT                  — HTTP port (default: 3000)
 *   CLAUDE_CODE_SRC_ROOT  — Path to Claude Code src/ directory
 *   MCP_API_KEY           — Optional bearer token for authentication
 */

import express from "express";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer, validateSrcRoot, SRC_ROOT } from "./server.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const API_KEY = process.env.MCP_API_KEY;

// ---------------------------------------------------------------------------
// Auth middleware (optional — only active when MCP_API_KEY is set)
// ---------------------------------------------------------------------------

function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  if (!API_KEY) return next();
  // Skip auth for health check
  if (req.path === "/health") return next();

  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${API_KEY}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ---------------------------------------------------------------------------
// Streamable HTTP transport (modern MCP protocol)
// ---------------------------------------------------------------------------

async function startStreamableHTTP(app: express.Express): Promise<void> {
  // Map of session ID -> transport
  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req, res) => {
    const sessionId =
      (req.headers["mcp-session-id"] as string) ?? undefined;
    let transport = sessionId ? transports.get(sessionId) : undefined;

    if (!transport) {
      // New session
      const server = createServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
      });
      await server.connect(transport);

      // Store session after first request so we can retrieve it later
      transport.onclose = () => {
        if (transport!.sessionId) {
          transports.delete(transport!.sessionId);
        }
      };
    }

    await transport.handleRequest(req, res, req.body);

    // After handling, store with the now-known session ID
    if (transport.sessionId && !transports.has(transport.sessionId)) {
      transports.set(transport.sessionId, transport);
    }
  });

  // SSE stream endpoint for Streamable HTTP
  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  });

  // DELETE — session cleanup
  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.close();
      transports.delete(sessionId);
    }
    res.status(200).json({ ok: true });
  });
}

// ---------------------------------------------------------------------------
// Legacy SSE transport (for older clients)
// ---------------------------------------------------------------------------

async function startLegacySSE(app: express.Express): Promise<void> {
  const transports = new Map<string, SSEServerTransport>();

  app.get("/sse", async (_req, res) => {
    const server = createServer();
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);
    transport.onclose = () => {
      transports.delete(transport.sessionId);
    };
    await server.connect(transport);
  });

  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(400).json({ error: "Unknown session" });
      return;
    }
    await transport.handlePostMessage(req, res, req.body);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await validateSrcRoot();

  const app = express();
  app.use(express.json());
  app.use(authMiddleware);

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: "claude-code-explorer",
      version: "1.1.0",
      srcRoot: SRC_ROOT,
    });
  });

  // Register both transports
  await startStreamableHTTP(app);
  await startLegacySSE(app);

  app.listen(PORT, () => {
    console.log(`Claude Code Explorer MCP (HTTP) listening on port ${PORT}`);
    console.log(`  Streamable HTTP: POST/GET http://localhost:${PORT}/mcp`);
    console.log(`  Legacy SSE:      GET http://localhost:${PORT}/sse`);
    console.log(`  Health:          GET http://localhost:${PORT}/health`);
    console.log(`  Source root:     ${SRC_ROOT}`);
    if (API_KEY) console.log("  Auth:            Bearer token required");
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
