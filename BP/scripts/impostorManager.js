/**
 * LAST LIFE: Impostor & Secret Mission System
 * Randomly assigns 1 or 2 Impostors per session with verifiable missions.
 * Categories: Assassin, Saboteur, Deceiver.
 * Admin-controlled verification interface and evidence tracking.
 * Creator: TheDarkLight836
 */

import { world } from "@minecraft/server";
import { CONFIG, MISSION_TEMPLATES } from "./config.js";
import { GameState } from "./state.js";
import { Logger } from "./logger.js";
import { LivesManager } from "./livesManager.js";

export class ImpostorManager {
  /**
   * Assigns 1 or 2 Impostors for the current session from active survivors
   * @param {number} sessionNum
   * @param {number} [impostorCount=0] - 0 for random (1 or 2)
   */
  static assignSessionImpostors(sessionNum, impostorCount = 0) {
    // Get eligible active survivors
    const activePlayers = world.getAllPlayers().filter(p => {
      const lives = GameState.getPlayerLives(p);
      const isGhost = GameState.isPlayerGhost(p);
      return lives > 0 && !isGhost;
    });

    if (activePlayers.length < 2) {
      Logger.log("MISSION", `Not enough active survivors (${activePlayers.length}) to assign Impostors for Session ${sessionNum}.`);
      GameState.setImpostors([]);
      return [];
    }

    // Determine count: 1 or 2
    let count = impostorCount > 0 ? impostorCount : (activePlayers.length >= 4 ? (Math.random() < 0.5 ? 2 : 1) : 1);
    count = Math.min(count, activePlayers.length);

    // Shuffle active players
    const shuffled = [...activePlayers].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    const templates = MISSION_TEMPLATES[sessionNum] || MISSION_TEMPLATES[1];
    const assignments = [];

    for (let i = 0; i < selected.length; i++) {
      const player = selected[i];
      const template = templates[i % templates.length];

      // If assassin, pick a target player other than themselves
      let targetName = "None";
      if (template.category === "Assassin") {
        const potentialTargets = activePlayers.filter(p => p.id !== player.id);
        if (potentialTargets.length > 0) {
          targetName = potentialTargets[Math.floor(Math.random() * potentialTargets.length)].name;
        }
      }

      const mission = {
        id: `m_${sessionNum}_${i}_${Date.now().toString(36)}`,
        playerName: player.name,
        category: template.category,
        title: template.title,
        instructions: template.instructions.replace("target player", targetName !== "None" ? targetName : "designated target"),
        target: targetName,
        successCriteria: template.successCriteria,
        deadline: `Session ${sessionNum} End`,
        failureCondition: template.failureCondition,
        reward: template.reward,
        penalty: template.penalty,
        status: "ACTIVE", // ACTIVE | PENDING_REVIEW | COMPLETED | FAILED | INVALIDATED
        evidence: [
          `[Session ${sessionNum} Start] Secret mission assigned to ${player.name} (${template.category}: ${template.title}).`
        ]
      };

      assignments.push(mission);

      // Secretly notify the assigned player
      player.sendMessage("§4§l========================================§r");
      player.sendMessage("§c§l[SECRET ASSIGNMENT] YOU ARE AN IMPOSTOR!§r");
      player.sendMessage(`§eCategory: §f${mission.category} - ${mission.title}`);
      if (targetName !== "None") {
        player.sendMessage(`§eTarget Player: §c${targetName}`);
      }
      player.sendMessage(`§eInstructions: §7${mission.instructions}`);
      player.sendMessage(`§eReward: §a${mission.reward} §7| §ePenalty: §c${mission.penalty}`);
      player.sendMessage("§7Open your LAST LIFE Menu at any time to review your mission details.");
      player.sendMessage("§4§l========================================§r");

      player.onScreenDisplay.setTitle("§c§lSECRET MISSION", {
        stayDuration: 80,
        fadeInDuration: 15,
        fadeOutDuration: 15,
        subtitle: `§eYou are an Impostor! Check Menu for details.`
      });
    }

    GameState.setImpostors(assignments);
    Logger.log("MISSION", `Assigned ${assignments.length} secret mission(s) for Session ${sessionNum}. Identities kept private.`);
    return assignments;
  }

  /**
   * Appends an observed evidence entry to an impostor's mission record
   * @param {string} playerName
   * @param {string} evidenceText
   */
  static recordEvidence(playerName, evidenceText) {
    const impostors = GameState.getImpostors();
    let updated = false;

    for (const imp of impostors) {
      if (imp.playerName === playerName || imp.target === playerName) {
        if (!imp.evidence) imp.evidence = [];
        imp.evidence.push(`[${new Date().toLocaleTimeString()}] ${evidenceText}`);
        updated = true;
      }
    }

    if (updated) {
      GameState.setImpostors(impostors);
    }
  }

  /**
   * Retrieves private mission info for a specific player (or null if innocent)
   * @param {string} playerName
   * @returns {object|null}
   */
  static getPlayerMission(playerName) {
    const impostors = GameState.getImpostors();
    return impostors.find(imp => imp.playerName === playerName) || null;
  }

  /**
   * Admin verifies an impostor's mission outcome
   * @param {string} missionId
   * @param {"COMPLETED"|"FAILED"|"INVALIDATED"} decision
   * @param {string} [notes]
   * @returns {{ success: boolean, message: string }}
   */
  static verifyMission(missionId, decision, notes = "") {
    const impostors = GameState.getImpostors();
    const mission = impostors.find(m => m.id === missionId);

    if (!mission) {
      return { success: false, message: "Mission not found." };
    }

    mission.status = decision;
    if (notes) {
      mission.evidence.push(`[Admin Decision] ${decision}: ${notes}`);
    }
    GameState.setImpostors(impostors);

    Logger.log("ADMIN", `Admin verified mission ${mission.title} for ${mission.playerName} as ${decision}. Notes: ${notes}`);

    // If mission was settled outside of voting, apply adjustments
    const player = world.getAllPlayers().find(p => p.name === mission.playerName);
    if (player) {
      if (decision === "COMPLETED") {
        LivesManager.adjustPlayerLives(player, 1, `Mission Completion: ${mission.title}`);
        player.sendMessage(`§a§l[LAST LIFE] MISSION COMPLETED! §r§aAdmin approved your mission! +1 Life awarded!`);
      } else if (decision === "FAILED") {
        LivesManager.adjustPlayerLives(player, -1, `Mission Failure: ${mission.title}`);
        player.sendMessage(`§c§l[LAST LIFE] MISSION FAILED! §r§cAdmin marked your mission as Failed. -1 Life deducted.`);
      } else if (decision === "INVALIDATED") {
        player.sendMessage(`§e[LAST LIFE] Mission Invalidated: No Life penalties or rewards applied.`);
      }
    }

    return { success: true, message: `Mission marked as ${decision}.` };
  }
}
