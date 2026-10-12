/**
 * LAST LIFE: Auditable Event Logger
 * Records verified game actions, PvP events, Life adjustments, and Admin decisions.
 * Creator: TheDarkLight836
 */

import { world, system } from "@minecraft/server";

const MAX_LOG_ENTRIES = 80;
const DYNAMIC_LOG_KEY = "lastlife:event_log";

export class Logger {
  /**
   * Log an auditable event
   * @param {string} type - Event category (e.g., 'SESSION', 'LIFE', 'PVP', 'MISSION', 'VOTE', 'GAPPLE', 'ADMIN')
   * @param {string} message - Description of the event
   * @param {object} [metadata] - Optional additional details
   */
  static log(type, message, metadata = {}) {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      tick: system.currentTick,
      type: type.toUpperCase(),
      message,
      metadata
    };

    console.warn(`[LAST LIFE] [${entry.type}] ${message}`);

    try {
      const logs = this.getLogs();
      logs.unshift(entry);
      if (logs.length > MAX_LOG_ENTRIES) {
        logs.length = MAX_LOG_ENTRIES;
      }
      world.setDynamicProperty(DYNAMIC_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.warn(`[LAST LIFE] Failed to persist log entry: ${e}`);
    }
  }

  /**
   * Retrieve all recorded event logs
   * @returns {Array<object>}
   */
  static getLogs() {
    try {
      const raw = world.getDynamicProperty(DYNAMIC_LOG_KEY);
      if (typeof raw === "string") {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn(`[LAST LIFE] Error parsing event logs: ${e}`);
    }
    return [];
  }

  /**
   * Clear all logs (Admin action)
   */
  static clearLogs() {
    try {
      world.setDynamicProperty(DYNAMIC_LOG_KEY, JSON.stringify([]));
      this.log("ADMIN", "Auditable event logs cleared by Administrator.");
    } catch (e) {
      console.warn(`[LAST LIFE] Failed to clear logs: ${e}`);
    }
  }
}
