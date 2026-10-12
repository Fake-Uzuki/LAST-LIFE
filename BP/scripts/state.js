/**
 * LAST LIFE: State Management & Persistence
 * Backed by Bedrock DynamicProperties to survive server reloads and disconnects.
 * Creator: TheDarkLight836
 */

import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";

// World Dynamic Property Keys
const PROP_SESSION_STATE = "lastlife:session_state";
const PROP_SESSION_NUM = "lastlife:session_num";
const PROP_TIME_REMAINING = "lastlife:time_remaining";
const PROP_GAPPLES_CONSUMED = "lastlife:gapples_consumed";
const PROP_IMPOSTORS = "lastlife:impostors";
const PROP_VOTES = "lastlife:votes";
const PROP_VOTING_STATE = "lastlife:voting_state";
const PROP_ALLIANCES = "lastlife:alliances";
const PROP_CONFIG = "lastlife:config";

// Player Dynamic Property Keys
export const PROP_PLAYER_LIVES = "lastlife:lives";
export const PROP_PLAYER_GHOST = "lastlife:is_ghost";
export const PROP_PLAYER_RECRUITS_COUNT = "lastlife:recruits_count";
export const PROP_PLAYER_ALLIANCE_LEADER = "lastlife:alliance_leader";

export const SessionState = {
  INACTIVE: "INACTIVE",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  VOTING: "VOTING",
  ENDED: "ENDED"
};

export const VotingState = {
  NONE: "NONE",
  DISCUSSION: "DISCUSSION",
  VOTING: "VOTING",
  REVIEW: "REVIEW",
  REVEALED: "REVEALED"
};

export class GameState {
  // In-memory caches for fast lookup and transient state
  static retaliations = new Map(); // defenderName -> { attackerName: string, expiresAtTick: number }
  static pendingRecruitInvites = new Map(); // recipientName -> { fromName: string, expiresAtTick: number }
  static armorWarningCooldown = new Map(); // playerName -> lastWarnTick

  // -------------------------------------------------------------
  // World State Getters & Setters
  // -------------------------------------------------------------
  static getSessionState() {
    const val = world.getDynamicProperty(PROP_SESSION_STATE);
    return typeof val === "string" ? val : SessionState.INACTIVE;
  }

  static setSessionState(state) {
    world.setDynamicProperty(PROP_SESSION_STATE, state);
  }

  static getSessionNumber() {
    const val = world.getDynamicProperty(PROP_SESSION_NUM);
    return typeof val === "number" ? val : 1;
  }

  static setSessionNumber(num) {
    world.setDynamicProperty(PROP_SESSION_NUM, Math.max(1, Math.min(CONFIG.TOTAL_SESSIONS, num)));
  }

  static getTimeRemaining() {
    const val = world.getDynamicProperty(PROP_TIME_REMAINING);
    return typeof val === "number" ? val : CONFIG.DEFAULT_SESSION_DURATION;
  }

  static setTimeRemaining(seconds) {
    world.setDynamicProperty(PROP_TIME_REMAINING, Math.max(0, Math.floor(seconds)));
  }

  static getGoldenApplesConsumed() {
    const val = world.getDynamicProperty(PROP_GAPPLES_CONSUMED);
    return typeof val === "number" ? val : 0;
  }

  static setGoldenApplesConsumed(count) {
    world.setDynamicProperty(PROP_GAPPLES_CONSUMED, Math.max(0, count));
  }

  static getImpostors() {
    try {
      const raw = world.getDynamicProperty(PROP_IMPOSTORS);
      if (typeof raw === "string") return JSON.parse(raw);
    } catch (e) {
      console.warn(`[LAST LIFE] Error reading impostors: ${e}`);
    }
    return [];
  }

  static setImpostors(impostorsList) {
    world.setDynamicProperty(PROP_IMPOSTORS, JSON.stringify(impostorsList || []));
  }

  static getVotes() {
    try {
      const raw = world.getDynamicProperty(PROP_VOTES);
      if (typeof raw === "string") return JSON.parse(raw);
    } catch (e) {
      console.warn(`[LAST LIFE] Error reading votes: ${e}`);
    }
    return {};
  }

  static setVotes(votesObj) {
    world.setDynamicProperty(PROP_VOTES, JSON.stringify(votesObj || {}));
  }

  static getVotingState() {
    const val = world.getDynamicProperty(PROP_VOTING_STATE);
    return typeof val === "string" ? val : VotingState.NONE;
  }

  static setVotingState(state) {
    world.setDynamicProperty(PROP_VOTING_STATE, state);
  }

  static getAlliances() {
    try {
      const raw = world.getDynamicProperty(PROP_ALLIANCES);
      if (typeof raw === "string") return JSON.parse(raw);
    } catch (e) {
      console.warn(`[LAST LIFE] Error reading alliances: ${e}`);
    }
    return [];
  }

  static setAlliances(alliancesList) {
    world.setDynamicProperty(PROP_ALLIANCES, JSON.stringify(alliancesList || []));
  }

  static getConfigOverrides() {
    try {
      const raw = world.getDynamicProperty(PROP_CONFIG);
      if (typeof raw === "string") return JSON.parse(raw);
    } catch (e) {
      console.warn(`[LAST LIFE] Error reading config overrides: ${e}`);
    }
    return {};
  }

  static setConfigOverrides(cfg) {
    world.setDynamicProperty(PROP_CONFIG, JSON.stringify(cfg || {}));
  }

  // -------------------------------------------------------------
  // Player State Helpers
  // -------------------------------------------------------------
  static getPlayerLives(player) {
    const val = player.getDynamicProperty(PROP_PLAYER_LIVES);
    if (typeof val === "number") return val;
    // Default starting lives
    this.setPlayerLives(player, CONFIG.STARTING_LIVES);
    return CONFIG.STARTING_LIVES;
  }

  static setPlayerLives(player, lives) {
    const clamped = Math.max(CONFIG.MIN_LIVES, Math.min(CONFIG.MAX_LIVES, Math.floor(lives)));
    player.setDynamicProperty(PROP_PLAYER_LIVES, clamped);
    if (clamped <= CONFIG.MIN_LIVES) {
      this.setPlayerGhost(player, true);
    }
    return clamped;
  }

  static isPlayerGhost(player) {
    const val = player.getDynamicProperty(PROP_PLAYER_GHOST);
    if (typeof val === "boolean") return val;
    const lives = this.getPlayerLives(player);
    const isGhost = lives <= 0;
    this.setPlayerGhost(player, isGhost);
    return isGhost;
  }

  static setPlayerGhost(player, isGhost) {
    player.setDynamicProperty(PROP_PLAYER_GHOST, isGhost);
    if (isGhost) {
      if (!player.hasTag("ghost")) {
        player.addTag("ghost");
      }
    } else {
      if (player.hasTag("ghost")) {
        player.removeTag("ghost");
      }
    }
  }

  static getPlayerRecruitsCount(player) {
    const val = player.getDynamicProperty(PROP_PLAYER_RECRUITS_COUNT);
    return typeof val === "number" ? val : 0;
  }

  static setPlayerRecruitsCount(player, count) {
    player.setDynamicProperty(PROP_PLAYER_RECRUITS_COUNT, Math.max(0, count));
  }

  static getPlayerAllianceLeader(player) {
    const val = player.getDynamicProperty(PROP_PLAYER_ALLIANCE_LEADER);
    return typeof val === "string" ? val : null;
  }

  static setPlayerAllianceLeader(player, leaderName) {
    if (leaderName) {
      player.setDynamicProperty(PROP_PLAYER_ALLIANCE_LEADER, leaderName);
    } else {
      player.setDynamicProperty(PROP_PLAYER_ALLIANCE_LEADER, "");
    }
  }
}
