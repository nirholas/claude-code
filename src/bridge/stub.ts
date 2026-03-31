/**
 * Bridge stub — no-op implementations for when BRIDGE_MODE is disabled.
 *
 * The bridge files themselves are safe to import even when bridge is off
 * (no side effects at import time), and all call sites guard execution
 * with `feature('BRIDGE_MODE')` checks. This stub exists as a safety net
 * for any future code path that might reference bridge functionality
 * outside the feature gate.
 *
 * Usage:
 *   import { isBridgeAvailable, noopBridgeHandle } from './stub.js'
 */

import type { ReplBridgeHandle } from './replBridge.js'

/** Returns false — bridge is not available in this build/configuration. */
export function isBridgeAvailable(): false {
  return false
}

/**
 * A no-op ReplBridgeHandle that silently discards all messages.
 * Use this when code expects a handle but bridge is disabled.
 */
export const noopBridgeHandle: ReplBridgeHandle = {
  bridgeSessionId: '',
  environmentId: '',
  sessionIngressUrl: '',
  writeMessages() {},
  writeSdkMessages() {},
  sendControlRequest() {},
  sendControlResponse() {},
  sendControlCancelRequest() {},
  sendResult() {},
  async teardown() {},
}

/**
 * No-op bridge logger that silently drops all output.
 */
export const noopBridgeLogger = {
  printBanner() {},
  logSessionStart() {},
  logSessionComplete() {},
  logSessionFailed() {},
  logStatus() {},
  logVerbose() {},
  logError() {},
  logReconnected() {},
  updateIdleStatus() {},
  updateReconnectingStatus() {},
  updateSessionStatus() {},
  clearStatus() {},
  setRepoInfo() {},
  setDebugLogPath() {},
  setAttached() {},
  updateFailedStatus() {},
  toggleQr() {},
  updateSessionCount() {},
  setSpawnModeDisplay() {},
  addSession() {},
  updateSessionActivity() {},
  setSessionTitle() {},
  removeSession() {},
  refreshDisplay() {},
}
