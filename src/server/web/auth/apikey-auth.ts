import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import type { IncomingMessage } from "http";
import type { Application, Request, Response, NextFunction } from "express";
import type { AuthAdapter, AuthUser, AuthenticatedRequest } from "./adapter.js";
import { SessionStore } from "./adapter.js";

/**
 * API-key authentication adapter.
 *
 * Each user provides their own Anthropic API key on the login page.
 * The key is stored encrypted in the server-side session and is injected
 * as `ANTHROPIC_API_KEY` into every PTY spawned for that user.
 * The plaintext key is never sent to the browser after the login form POST.
 *
 * User identity is derived from the key itself (SHA-256 prefix), so two
 * sessions using the same key share the same userId and home directory.
 *
 * Optional env vars:
 *   ADMIN_USERS — comma-separated user IDs (SHA-256 prefixes) or API-key
 *                 prefixes that receive the admin role
 */
export class ApiKeyAdapter implements AuthAdapter {
  private readonly store: SessionStore;
  private readonly adminUsers: ReadonlySet<string>;

  constructor(store: SessionStore) {
    this.store = store;
    this.adminUsers = new Set(
      (process.env.ADMIN_USERS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  authenticate(req: IncomingMessage): AuthUser | null {
    const session = this.store.getFromRequest(req);
    if (!session || !session.encryptedApiKey) return null;

    const apiKey = this.store.decrypt(session.encryptedApiKey);
    if (!apiKey) return null;

    return {
      id: session.userId,
      email: session.email,
      name: session.name,
      isAdmin:
        session.isAdmin ||
        this.adminUsers.has(session.userId),
      apiKey,
    };
  }

  setupRoutes(app: Application): void {
    const loginHtml = this.loadLoginPage();

    // GET /auth/login — serve the API key login form
    app.get("/auth/login", (_req, res) => {
      res.setHeader("Content-Type", "text/html");
      res.send(loginHtml);
    });

    // POST /auth/login — validate key, create encrypted session
    app.post(
      "/auth/login",
      // express.urlencoded is registered in pty-server.ts before setupRoutes
      (req: Request, res: Response) => {
        const apiKey = (req.body as Record<string, string>)?.api_key?.trim() ?? "";

        if (!apiKey.startsWith("sk-ant-")) {
          res.setHeader("Content-Type", "text/html");
          res.status(400).send(
            loginHtml.replace(
              "<!--ERROR-->",
              `<p class="error">Invalid API key format. Keys must start with <code>sk-ant-</code>.</p>`,
            ),
          );
          return;
        }

        const userId = deriveUserId(apiKey);
        const isAdmin = this.adminUsers.has(userId);
        const encryptedApiKey = this.store.encrypt(apiKey);

        const sessionId = this.store.create({
          userId,
          isAdmin,
          encryptedApiKey,
        });

        this.store.setCookie(res as unknown as import("http").ServerResponse, sessionId);

        const next = (req.query as Record<string, string>)?.next;
        res.redirect(next && next.startsWith("/") ? next : "/");
      },
    );

    // POST /auth/logout — destroy session
    app.post("/auth/logout", (req, res) => {
      const id = this.store.getIdFromRequest(req as unknown as IncomingMessage);
      if (id) this.store.delete(id);
      this.store.clearCookie(res as unknown as import("http").ServerResponse);
      res.redirect("/auth/login");
    });
  }

  requireAuth(req: Request, res: Response, next: NextFunction): void {
    const user = this.authenticate(req as unknown as IncomingMessage);
    if (!user) {
      const accept = req.headers["accept"] ?? "";
      if (accept.includes("application/json")) {
        res.status(401).json({ error: "Unauthorized" });
      } else {
        res.redirect(`/auth/login?next=${encodeURIComponent(req.originalUrl)}`);
      }
      return;
    }
    (req as AuthenticatedRequest).user = user;
    next();
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private loadLoginPage(): string {
    // Serve from the public directory at build time; fall back to inline HTML.
    try {
      const p = join(import.meta.dirname, "../public/login.html");
      return readFileSync(p, "utf8");
    } catch {
      return INLINE_LOGIN_HTML;
    }
  }
}

/**
 * Derives a stable, opaque user ID from an API key.
 * Uses the first 16 hex chars of SHA-256(key) — short enough to be readable,
 * long enough to be unique.
 */
function deriveUserId(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
}

// Fallback inline login page used when public/login.html is not present.
const INLINE_LOGIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Claude Code — Sign In</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      background: #0d1117;
      color: #e6edf3;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 2rem;
      width: 100%;
      max-width: 400px;
    }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    p.subtitle { color: #8b949e; font-size: 0.875rem; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.875rem; margin-bottom: 0.4rem; color: #8b949e; }
    input[type="password"] {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      color: #e6edf3;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    input[type="password"]:focus {
      outline: none;
      border-color: #58a6ff;
    }
    button {
      width: 100%;
      padding: 0.6rem;
      background: #238636;
      border: 1px solid #2ea043;
      border-radius: 6px;
      color: #fff;
      font-size: 0.95rem;
      cursor: pointer;
    }
    button:hover { background: #2ea043; }
    .error { color: #f85149; font-size: 0.875rem; margin-bottom: 1rem; }
    code { background: #21262d; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.8rem; }
    .hint { color: #8b949e; font-size: 0.75rem; margin-top: 1rem; }
    .hint a { color: #58a6ff; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Claude Code</h1>
    <p class="subtitle">Enter your Anthropic API key to start a session.</p>
    <!--ERROR-->
    <form method="POST" action="/auth/login">
      <label for="api_key">Anthropic API Key</label>
      <input
        type="password"
        id="api_key"
        name="api_key"
        placeholder="sk-ant-..."
        autocomplete="off"
        required
        autofocus
      >
      <button type="submit">Sign In</button>
    </form>
    <p class="hint">
      Your key is stored encrypted on the server and never sent to the browser.
      Get a key at <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a>.
    </p>
  </div>
</body>
</html>`;
