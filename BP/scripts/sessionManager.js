/**
 * LAST LIFE: Session Lifecycle & Progression Manager
 * Coordinates the 7-day survival progression, timers, challenge objectives,
 * basecamp tracking, and victory conditions.
 * Creator: TheDarkLight836
 */

import { world, system } from "@minecraft/server";
import { CONFIG, SESSIONS } from "./config.js";
import { GameState, SessionState } from "./state.js";
import { Logger } from "./logger.js";
import { HealingManager } from "./healingManager.js";
import { ImpostorManager } from "./impostorManager.js";
import { VotingManager } from "./votingManager.js";

export class SessionManager {
  /**
   * Main session tick loop (called every 20 ticks = 1 second)
   */
  static tick() {
    const state = GameState.getSessionState();

    if (state === SessionState.RUNNING) {
      const remaining = GameState.getTimeRemaining();
      if (remaining > 0) {
        const nextTime = remaining - 1;
        GameState.setTimeRemaining(nextTime);

        // Milestone alerts
        if (nextTime === 3600) {
          world.sendMessage("§e§l[LAST LIFE] 1 HOUR REMAINING IN THIS SESSION!§r");
        } else if (nextTime === 1800) {
          world.sendMessage("§e§l[LAST LIFE] 30 MINUTES REMAINING IN THIS SESSION!§r");
        } else if (nextTime === 600) {
          world.sendMessage("§c§l[LAST LIFE] 10 MINUTES REMAINING! Prepare to conclude objectives!§r");
        } else if (nextTime === 60) {
          world.sendMessage("§c§l[LAST LIFE] 1 MINUTE REMAINING IN THIS SESSION!§r");
        } else if (nextTime === 0) {
          this.endSession("Time Expired");
        }
      }
    }

    // Update Action Bar HUD for all online players
    this.updatePlayerHUDs();
  }

  /**
   * Starts or restarts a session
   * @param {number} [sessionNum]
   */
  static startSession(sessionNum) {
    const num = sessionNum || GameState.getSessionNumber();
    GameState.setSessionNumber(num);
    GameState.setSessionState(SessionState.RUNNING);
    GameState.setTimeRemaining(CONFIG.DEFAULT_SESSION_DURATION);

    // Reset recruitments this session for all players
    for (const player of world.getAllPlayers()) {
      GameState.setPlayerRecruitsCount(player, 0);
    }

    const sessionDef = SESSIONS.find(s => s.number === num) || SESSIONS[0];

    // Apply Session Rules
    HealingManager.applySessionRegenRules(num);

    // Apply Session 1 specific rules (scatter players, hide coordinates)
    if (num === 1) {
      this.setupSession1TheLost();
    }

    // Assign Impostors
    ImpostorManager.assignSessionImpostors(num);

    // Broadcast session launch
    world.sendMessage("§a§l========================================");
    world.sendMessage(`§6§lLAST LIFE — SESSION ${num}: ${sessionDef.title.toUpperCase()}§r`);
    world.sendMessage(`§ePublic Objective: §f${sessionDef.publicObjective}`);
    world.sendMessage(`§7Session Duration: §e3 Hours §7| Natural Regen: §e${sessionDef.regenEnabled ? "ON" : "OFF"}`);
    world.sendMessage("§a§l========================================");

    for (const player of world.getAllPlayers()) {
      player.onScreenDisplay.setTitle(`§6SESSION ${num}`, {
        stayDuration: 80,
        fadeInDuration: 15,
        fadeOutDuration: 15,
        subtitle: `§f${sessionDef.title}`
      });
    }

    Logger.log("SESSION", `Started Session ${num} (${sessionDef.title}).`);
  }

  /**
   * Pauses the active session
   */
  static pauseSession() {
    if (GameState.getSessionState() !== SessionState.RUNNING) return;
    GameState.setSessionState(SessionState.PAUSED);

    world.sendMessage("§e§l[LAST LIFE] SESSION PAUSED BY ADMINISTRATOR.§r");
    world.sendMessage("§7The event clock has been temporarily halted.");
    Logger.log("SESSION", `Session ${GameState.getSessionNumber()} paused.`);
  }

  /**
   * Resumes a paused session
   */
  static resumeSession() {
    if (GameState.getSessionState() !== SessionState.PAUSED) return;
    GameState.setSessionState(SessionState.RUNNING);

    world.sendMessage("§a§l[LAST LIFE] SESSION RESUMED!§r");
    world.sendMessage("§7The event clock is now running.");
    Logger.log("SESSION", `Session ${GameState.getSessionNumber()} resumed.`);
  }

  /**
   * Ends the active session and triggers the End-of-Session phase
   * @param {string} [reason="Admin Ended"]
   */
  static endSession(reason = "Admin Ended") {
    GameState.setSessionState(SessionState.ENDED);
    const num = GameState.getSessionNumber();

    world.sendMessage("§c§l========================================");
    world.sendMessage(`§4§lLAST LIFE — SESSION ${num} HAS CONCLUDED!§r`);
    world.sendMessage(`§eReason: §7${reason}`);
    world.sendMessage("§7World timer stopped. Progression is saved.");
    world.sendMessage("§c§l========================================");

    Logger.log("SESSION", `Ended Session ${num} (${reason}).`);

    // Initiate Voting Discussion phase
    VotingManager.startVotingSession();
  }

  /**
   * Session 1 Setup: Scatter players and disable visible coordinates
   */
  static setupSession1TheLost() {
    try {
      const overworld = world.getDimension("overworld");
      overworld.runCommandAsync("gamerule showcoordinates false");
      world.sendMessage("§c[LAST LIFE] Coordinates have been disabled for Session 1: The Lost!");
      
      // Scatter active survivors around basecamp (between 400 and 1200 blocks away)
      const base = CONFIG.DEFAULT_BASECAMP;
      const players = world.getAllPlayers().filter(p => !GameState.isPlayerGhost(p));

      players.forEach((p, idx) => {
        const angle = (idx * (2 * Math.PI / players.length)) + (Math.random() * 0.5);
        const dist = 400 + Math.floor(Math.random() * 400);
        const targetX = Math.floor(base.x + (Math.cos(angle) * dist));
        const targetZ = Math.floor(base.z + (Math.sin(angle) * dist));

        try {
          p.runCommandAsync(`spreadplayers ${targetX} ${targetZ} 10 50 @s`);
          p.sendMessage("§e[LAST LIFE] You have been scattered! Find Basecamp and reunite with your teammates!");
        } catch (e) {}
      });
    } catch (err) {
      console.warn(`[LAST LIFE] Failed in Session 1 setup: ${err}`);
    }
  }

  /**
   * Handle Ender Dragon defeat in Session 7 for the grand survival victory
   * @param {import("@minecraft/server").Entity} dragon
   */
  static handleDragonDeath(dragon) {
    const sessionNum = GameState.getSessionNumber();
    if (sessionNum === 7) {
      const survivors = world.getAllPlayers().filter(p => {
        const lives = GameState.getPlayerLives(p);
        const isGhost = GameState.isPlayerGhost(p);
        return lives > 0 && !isGhost;
      });

      world.sendMessage("§6§l========================================");
      world.sendMessage("§a§l🏆 THE ENDER DRAGON HAS FALLEN! VICTORY ACHIEVED!§r");
      world.sendMessage("§eAll remaining active survivors have conquered the 7-day LAST LIFE event!");
      world.sendMessage(`§6Surviving Champions (${survivors.length}): §f${survivors.map(s => s.name).join(", ")}`);
      world.sendMessage("§6§l========================================");

      for (const player of world.getAllPlayers()) {
        player.onScreenDisplay.setTitle("§a§lEVENT VICTORY!", {
          stayDuration: 120,
          fadeInDuration: 20,
          fadeOutDuration: 20,
          subtitle: "§6The Ender Dragon is defeated!"
        });
      }

      Logger.log("SESSION", `Ender Dragon slain in Session 7! Surviving champions: [${survivors.map(s => s.name).join(", ")}].`);
    }
  }

  /**
   * Updates the on-screen Action Bar HUD for all online players
   */
  static updatePlayerHUDs() {
    const sessionNum = GameState.getSessionNumber();
    const sessionState = GameState.getSessionState();
    const remaining = GameState.getTimeRemaining();

    const hours = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;
    const timeFormatted = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    for (const player of world.getAllPlayers()) {
      const lives = GameState.getPlayerLives(player);
      const isGhost = GameState.isPlayerGhost(player);

      let statusMsg = "";
      if (isGhost) {
        statusMsg = "§8[GHOST SPECTATOR]";
      } else if (lives === 1) {
        statusMsg = "§c[LAST LIFE - PvP ON]";
      } else {
        const hearts = "§c" + "❤".repeat(lives) + "§7" + "♡".repeat(CONFIG.MAX_LIVES - lives);
        statusMsg = `Lives: ${hearts} §7(${lives}/5)`;
      }

      const hud = `§6S${sessionNum} §7[§e${timeFormatted}§7] §f| ${statusMsg} §7| §fState: §e${sessionState}`;
      try {
        player.onScreenDisplay.setActionBar(hud);
      } catch (e) {}
    }
  }
}
