import type { IPty } from "node-pty";
import type { WebSocket } from "ws";
import { SessionStore } from "./session-store.js";

export type { SessionInfo } from "./session-store.js";

export class SessionManager {
  private store: SessionStore;
  private maxSessions: number;
  private spawnPty: (cols: number, rows: number) => IPty;
  // Tracks which sessions have already had their PTY event listeners wired,
  // so we don't double-register on reconnect.
  private wiredPtys = new Set<string>();

  constructor(
    maxSessions: number,
    spawnPty: (cols: number, rows: number) => IPty,
    gracePeriodMs?: number,
    scrollbackBytes?: number,
  ) {
    this.maxSessions = maxSessions;
    this.spawnPty = spawnPty;
    this.store = new SessionStore(gracePeriodMs, scrollbackBytes);
  }

  get activeCount(): number {
    return this.store.size;
  }

  get isFull(): boolean {
    return this.store.size >= this.maxSessions;
  }

  getSession(token: string) {
    return this.store.get(token);
  }

  listSessions() {
    return this.store.list();
  }

  /**
   * Spawns a new PTY, registers it in the session store, and wires up all
   * event plumbing between the PTY and the WebSocket.
   *
   * Returns the session token, or null if at capacity or PTY spawn fails.
   */
  create(ws: WebSocket, cols = 80, rows = 24): string | null {
    if (this.isFull) return null;

    let pty: IPty;
    try {
      pty = this.spawnPty(cols, rows);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown PTY spawn error";
      ws.send(
        JSON.stringify({ type: "error", message: `PTY spawn failed: ${message}` }),
      );
      ws.close(1011, "PTY spawn failure");
      return null;
    }

    const session = this.store.register(pty);
    session.ws = ws;
    const { token } = session;

    this.wirePtyEvents(token, pty);
    this.wireWsEvents(token, ws, pty);

    console.log(
      `[session ${token.slice(0, 8)}] Created (active: ${this.store.size}/${this.maxSessions})`,
    );
    return token;
  }

  /**
   * Attaches a new WebSocket to an existing session identified by `token`.
   *
   * - Cancels the grace timer
   * - Sends `{ type: "resumed", token }` to the client
   * - Replays the scrollback buffer so the user sees their conversation
   * - Resizes the PTY to the client's current terminal dimensions
   *
   * Returns true if the session was found, false otherwise.
   */
  resume(token: string, ws: WebSocket, cols: number, rows: number): boolean {
    const session = this.store.reattach(token, ws);
    if (!session) return false;

    console.log(
      `[session ${token.slice(0, 8)}] Resumed (active: ${this.store.size}/${this.maxSessions})`,
    );

    // Tell the client it's a resumed session BEFORE sending scrollback bytes.
    // The client uses this to clear the terminal first.
    ws.send(JSON.stringify({ type: "resumed", token }));

    // Replay buffered output
    const scrollback = session.scrollback.read();
    if (scrollback.length > 0) {
      ws.send(scrollback);
    }

    // Sync PTY dimensions to the reconnected client
    try {
      session.pty.resize(cols, rows);
    } catch {
      // PTY may have exited
    }

    this.wireWsEvents(token, ws, session.pty);
    return true;
  }

  /**
   * Wire PTY → scrollback + WebSocket.
   * Called once per session lifetime (idempotent via `wiredPtys` guard).
   */
  private wirePtyEvents(token: string, pty: IPty): void {
    if (this.wiredPtys.has(token)) return;
    this.wiredPtys.add(token);

    const session = this.store.get(token);
    if (!session) return;

    pty.onData((data: string) => {
      // Always capture to scrollback for future replay
      session.scrollback.write(data);
      // Forward to the currently attached WebSocket, if any
      const ws = session.ws;
      if (ws && ws.readyState === 1 /* OPEN */) {
        ws.send(data);
      }
    });

    pty.onExit(({ exitCode, signal }) => {
      this.wiredPtys.delete(token);
      console.log(
        `[session ${token.slice(0, 8)}] PTY exited: code=${exitCode}, signal=${signal}`,
      );
      const ws = session.ws;
      if (ws && ws.readyState === 1 /* OPEN */) {
        ws.send(JSON.stringify({ type: "exit", exitCode, signal }));
        ws.close(1000, "PTY exited");
      }
      this.store.destroy(token);
    });
  }

  /**
   * Wire WebSocket → PTY (input, resize, ping).
   * On close/error, start the grace period instead of immediately destroying
   * the session — this keeps the PTY alive for reconnection.
   * Called once per WebSocket connection (safe to call again on reconnect).
   */
  private wireWsEvents(token: string, ws: WebSocket, pty: IPty): void {
    ws.on("message", (data: Buffer | string) => {
      const str = data.toString();
      if (str.startsWith("{")) {
        try {
          const msg = JSON.parse(str) as Record<string, unknown>;
          if (
            msg.type === "resize" &&
            typeof msg.cols === "number" &&
            typeof msg.rows === "number"
          ) {
            pty.resize(msg.cols as number, msg.rows as number);
            return;
          }
          if (msg.type === "ping") {
            if (ws.readyState === 1 /* OPEN */) {
              ws.send(JSON.stringify({ type: "pong" }));
            }
            return;
          }
        } catch {
          // Not JSON — treat as terminal input
        }
      }
      pty.write(str);
    });

    const handleClose = () => {
      console.log(`[session ${token.slice(0, 8)}] WebSocket closed`);
      const session = this.store.get(token);
      // Only start grace if this WS is still the one attached to the session
      if (session && session.ws === ws) {
        this.store.startGrace(token, () => {
          /* logged inside startGrace */
        });
      }
    };

    ws.on("close", handleClose);
    ws.on("error", (err) => {
      console.error(`[session ${token.slice(0, 8)}] WebSocket error:`, err.message);
      handleClose();
    });
  }

  /**
   * Force-kill a session immediately (used by the REST API).
   */
  destroySession(token: string): void {
    this.store.destroy(token);
  }

  destroyAll(): void {
    this.store.destroyAll();
  }
}
