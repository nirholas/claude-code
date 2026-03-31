import express from "express";
import { createServer } from "http";
import path from "path";
import { spawn } from "node-pty";
import { WebSocketServer } from "ws";
import { ConnectionRateLimiter, validateAuthToken } from "./auth.js";
import { SessionManager } from "./session-manager.js";

// Configuration from environment
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const MAX_SESSIONS = parseInt(process.env.MAX_SESSIONS ?? "10", 10);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") ?? [];
const GRACE_PERIOD_MS = parseInt(
  process.env.SESSION_GRACE_MS ?? String(5 * 60_000),
  10,
);
const SCROLLBACK_BYTES = parseInt(
  process.env.SCROLLBACK_BYTES ?? String(100 * 1024),
  10,
);

// Resolve the claude CLI binary
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? "claude";

const app = express();
app.use(express.json());

const server = createServer(app);

// --- Session Manager ---

const sessionManager = new SessionManager(
  MAX_SESSIONS,
  (cols, rows) =>
    spawn(CLAUDE_BIN, [], {
      name: "xterm-256color",
      cols,
      rows,
      cwd: process.env.WORK_DIR ?? process.cwd(),
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      },
    }),
  GRACE_PERIOD_MS,
  SCROLLBACK_BYTES,
);

// --- HTTP routes ---

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    activeSessions: sessionManager.activeCount,
    maxSessions: MAX_SESSIONS,
  });
});

app.get("/api/sessions", (_req, res) => {
  res.json(sessionManager.listSessions());
});

app.delete("/api/sessions/:token", (req, res) => {
  const { token } = req.params;
  const session = sessionManager.getSession(token);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  sessionManager.destroySession(token);
  res.status(204).end();
});

// Serve static frontend
const publicDir = path.join(import.meta.dirname, "public");
app.use(express.static(publicDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// --- WebSocket server ---

const rateLimiter = new ConnectionRateLimiter();

// Clean up rate limiter every 5 minutes
const rateLimiterCleanup = setInterval(() => rateLimiter.cleanup(), 5 * 60_000);

const wss = new WebSocketServer({
  server,
  path: "/ws",
  verifyClient: ({ req, origin }, callback) => {
    // Origin check
    if (ALLOWED_ORIGINS.length > 0 && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`Rejected connection from origin: ${origin}`);
      callback(false, 403, "Forbidden origin");
      return;
    }

    // Auth token check
    if (!validateAuthToken(req)) {
      console.warn("Rejected connection: invalid auth token");
      callback(false, 401, "Unauthorized");
      return;
    }

    // Rate limit check
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";
    if (!rateLimiter.allow(ip)) {
      console.warn(`Rate limited connection from ${ip}`);
      callback(false, 429, "Too many connections");
      return;
    }

    callback(true);
  },
});

wss.on("connection", (ws, req) => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";
  console.log(`New WebSocket connection from ${ip}`);

  const url = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`,
  );
  const cols = parseInt(url.searchParams.get("cols") ?? "80", 10);
  const rows = parseInt(url.searchParams.get("rows") ?? "24", 10);
  const resumeToken = url.searchParams.get("resume");

  // Try to resume an existing session
  if (resumeToken) {
    const resumed = sessionManager.resume(resumeToken, ws, cols, rows);
    if (resumed) {
      return;
    }
    // Session expired or not found — fall through to create a new one
    console.log(
      `[resume] Session ${resumeToken.slice(0, 8)}… not found — starting fresh`,
    );
  }

  // Capacity check only applies to new sessions
  if (sessionManager.isFull) {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Max sessions reached. Try again later.",
      }),
    );
    ws.close(1013, "Max sessions reached");
    return;
  }

  const token = sessionManager.create(ws, cols, rows);
  if (token) {
    ws.send(JSON.stringify({ type: "session", token }));
  }
});

// --- Graceful shutdown ---

function shutdown() {
  console.log("Shutting down...");
  clearInterval(rateLimiterCleanup);
  sessionManager.destroyAll();
  wss.close(() => {
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// --- Start ---

server.listen(PORT, HOST, () => {
  console.log(`PTY server listening on http://${HOST}:${PORT}`);
  console.log(`  WebSocket: ws://${HOST}:${PORT}/ws`);
  console.log(`  Max sessions: ${MAX_SESSIONS}`);
  console.log(
    `  Session grace period: ${GRACE_PERIOD_MS / 1000}s`,
  );
  console.log(
    `  Scrollback buffer: ${Math.round(SCROLLBACK_BYTES / 1024)}KB per session`,
  );
  if (process.env.AUTH_TOKEN) {
    console.log("  Auth: token required");
  }
});

export { app, server, sessionManager, wss };
