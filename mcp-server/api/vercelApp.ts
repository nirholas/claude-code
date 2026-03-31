/**
 * Express app exported for Vercel serverless.
 * Shares the same logic as http.ts but is importable as a module.
 */

import express from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer, SRC_ROOT } from "../src/server.js";

const API_KEY = process.env.MCP_API_KEY;

export const app = express();
app.use(express.json());

// Auth
app.use((req, res, next) => {
  if (!API_KEY || req.path === "/health" || req.path === "/api") return next();
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${API_KEY}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

// Health
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "claude-code-explorer", version: "1.1.0", srcRoot: SRC_ROOT });
});
app.get("/api", (_req, res) => {
  res.json({ status: "ok", server: "claude-code-explorer", version: "1.1.0", srcRoot: SRC_ROOT });
});

// Streamable HTTP
const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  const sessionId = (req.headers["mcp-session-id"] as string) ?? undefined;
  let transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    const server = createServer();
    transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
    await server.connect(transport);
    transport.onclose = () => {
      if (transport!.sessionId) transports.delete(transport!.sessionId);
    };
  }

  await transport.handleRequest(req, res, req.body);

  if (transport.sessionId && !transports.has(transport.sessionId)) {
    transports.set(transport.sessionId, transport);
  }
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    res.status(400).json({ error: "Invalid or missing session ID" });
    return;
  }
  await transports.get(sessionId)!.handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    await transports.get(sessionId)!.close();
    transports.delete(sessionId);
  }
  res.status(200).json({ ok: true });
});

// Legacy SSE
const sseTransports = new Map<string, SSEServerTransport>();

app.get("/sse", async (_req, res) => {
  const server = createServer();
  const transport = new SSEServerTransport("/messages", res);
  sseTransports.set(transport.sessionId, transport);
  transport.onclose = () => sseTransports.delete(transport.sessionId);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sseTransports.get(sessionId);
  if (!transport) {
    res.status(400).json({ error: "Unknown session" });
    return;
  }
  await transport.handlePostMessage(req, res, req.body);
});
