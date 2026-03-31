/**
 * UserStore — tracks which users are connected and how many sessions each has.
 *
 * This is a lightweight in-memory view derived from the SessionManager; it
 * does not persist across restarts. The admin dashboard and admin API read
 * from this store to enumerate users and their activity.
 */
export interface UserRecord {
  id: string;
  email?: string;
  name?: string;
  firstSeenAt: number;
  lastSeenAt: number;
  sessionCount: number;
}

export class UserStore {
  private readonly users = new Map<string, UserRecord>();

  /**
   * Called when a session is created for a user.
   * Creates the user record if it doesn't exist yet; increments sessionCount.
   */
  touch(userId: string, meta?: { email?: string; name?: string }): void {
    const existing = this.users.get(userId);
    if (existing) {
      existing.lastSeenAt = Date.now();
      existing.sessionCount += 1;
      if (meta?.email && !existing.email) existing.email = meta.email;
      if (meta?.name && !existing.name) existing.name = meta.name;
    } else {
      this.users.set(userId, {
        id: userId,
        email: meta?.email,
        name: meta?.name,
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now(),
        sessionCount: 1,
      });
    }
  }

  /**
   * Called when a session is destroyed for a user.
   * Decrements sessionCount; removes the record when it reaches zero.
   */
  release(userId: string): void {
    const record = this.users.get(userId);
    if (!record) return;
    record.sessionCount = Math.max(0, record.sessionCount - 1);
    if (record.sessionCount === 0) {
      this.users.delete(userId);
    }
  }

  /** Returns all currently connected users (sessionCount > 0). */
  list(): UserRecord[] {
    return [...this.users.values()];
  }

  get(userId: string): UserRecord | undefined {
    return this.users.get(userId);
  }
}
