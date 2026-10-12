/**
 * LAST LIFE: Special Last-Life PvP & Voluntary Recruitment System
 * - Exactly 1 Life = Last-Life state (authorized to initiate PvP).
 * - >1 Life players cannot initiate attacks.
 * - Retaliation window: 30 seconds strictly against the specific attacker.
 * - Voluntary alliance recruitment upon verified Last-Life PvP kill (default 1/session).
 * Creator: TheDarkLight836
 */

import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { GameState } from "./state.js";
import { Logger } from "./logger.js";

export class PvPManager {
  /**
   * Evaluates combat interactions when an entity is hurt
   * @param {import("@minecraft/server").EntityHurtAfterEvent} event
   */
  static handleEntityHurt(event) {
    const victim = event.hurtEntity;
    const attacker = event.damageSource?.damagingEntity;

    if (!victim || !attacker) return;
    if (victim.typeId !== "minecraft:player" || attacker.typeId !== "minecraft:player") return;

    // Both are players
    const victimLives = GameState.getPlayerLives(victim);
    const attackerLives = GameState.getPlayerLives(attacker);

    // Ghosts cannot deal or receive damage
    if (GameState.isPlayerGhost(victim) || GameState.isPlayerGhost(attacker)) {
      this.revertDamage(victim, event.damage);
      return;
    }

    // Check Attacker's Life status
    if (attackerLives === CONFIG.LAST_LIFE_THRESHOLD) {
      // Attacker is a Last-Life player (1 Life) -> Attack is authorized!
      if (victimLives > CONFIG.LAST_LIFE_THRESHOLD) {
        // Victim has >1 Life -> grant 30-second self-defense retaliation window against this specific attacker
        this.grantRetaliation(victim, attacker);
      }
    } else {
      // Attacker has >1 Life -> Can ONLY attack if actively retaliating against THIS specific attacker
      const isLegalRetaliation = this.isLegalRetaliation(attacker.name, victim.name);

      if (!isLegalRetaliation) {
        // Illegal attack! Revert the damage to victim
        this.revertDamage(victim, event.damage);
        attacker.sendMessage(`§c§l[LAST LIFE] ATTACK PROHIBITED!§r`);
        attacker.sendMessage(`§cYou have ${attackerLives} Lives. Only Last-Life players (1 Life) may initiate PvP, or you may defend yourself during an active retaliation window.`);
        Logger.log("PVP", `Illegal attack blocked: ${attacker.name} (${attackerLives} Lives) attacked ${victim.name}.`);
      }
    }
  }

  /**
   * Grants a timed retaliation window for a defender against a specific attacker
   * @param {import("@minecraft/server").Player} defender
   * @param {import("@minecraft/server").Player} attacker
   */
  static grantRetaliation(defender, attacker) {
    const windowSeconds = CONFIG.DEFAULT_RETALIATION_WINDOW_SECONDS;
    const expiresAtTick = system.currentTick + (windowSeconds * 20);

    GameState.retaliations.set(defender.name, {
      attackerName: attacker.name,
      expiresAtTick
    });

    defender.sendMessage(`§e§l[LAST LIFE] SELF-DEFENSE PERMITTED!§r`);
    defender.sendMessage(`§e${attacker.name} attacked you first. You may retaliate against §c${attacker.name}§e for the next ${windowSeconds} seconds!`);
    defender.onScreenDisplay.setActionBar(`§e⚔ Self-Defense active vs ${attacker.name} (${windowSeconds}s)`);

    Logger.log("PVP", `Retaliation window granted to ${defender.name} against ${attacker.name} for ${windowSeconds}s.`);
  }

  /**
   * Verifies if an attack qualifies under the self-defense retaliation rule
   * @param {string} defenderName
   * @param {string} targetName
   * @returns {boolean}
   */
  static isLegalRetaliation(defenderName, targetName) {
    const record = GameState.retaliations.get(defenderName);
    if (!record) return false;

    if (system.currentTick > record.expiresAtTick) {
      GameState.retaliations.delete(defenderName);
      return false;
    }

    // Must be against the exact attacker who initiated combat
    return record.attackerName === targetName;
  }

  /**
   * Reverts unpermitted damage taken by a player
   * @param {import("@minecraft/server").Player} player
   * @param {number} damageAmount
   */
  static revertDamage(player, damageAmount) {
    try {
      const health = player.getComponent("minecraft:health");
      if (health) {
        const restored = Math.min(health.effectiveMax, health.currentValue + damageAmount);
        health.setCurrentValue(restored);
      }
    } catch (e) {
      console.warn(`[LAST LIFE] Failed to restore health: ${e}`);
    }
  }

  /**
   * Checks for valid Last-Life PvP kill to award alliance recruitment
   * @param {import("@minecraft/server").Player} victim
   * @param {import("@minecraft/server").EntityDamageSource} damageSource
   */
  static handlePlayerKill(victim, damageSource) {
    const killer = damageSource?.damagingEntity;
    if (!killer || killer.typeId !== "minecraft:player" || killer.id === victim.id) return;

    const killerLives = GameState.getPlayerLives(killer);
    if (killerLives === CONFIG.LAST_LIFE_THRESHOLD) {
      // Killer was on their Last Life!
      const currentRecruits = GameState.getPlayerRecruitsCount(killer);
      if (currentRecruits < CONFIG.MAX_RECRUITS_PER_SESSION) {
        killer.sendMessage(`§a§l[LAST LIFE] 🏆 PVP KILL CONFIRMED!§r`);
        killer.sendMessage(`§aYou eliminated §e${victim.name}§a while on your Last Life!`);
        killer.sendMessage(`§6You have earned an Alliance Recruitment Invitation! Open your LAST LIFE Menu to invite a survivor.`);
        killer.onScreenDisplay.setTitle("§a§lKILL CONFIRMED", {
          stayDuration: 80,
          fadeInDuration: 10,
          fadeOutDuration: 10,
          subtitle: "§6Open Menu to send an Alliance Invitation"
        });
        Logger.log("RECRUIT", `PvP kill confirmed for Last-Life player ${killer.name} vs ${victim.name}. Recruitment unlocked.`);
      }
    }
  }

  /**
   * Sends a recruitment invitation from a Last-Life player to a target survivor
   * @param {import("@minecraft/server").Player} leader
   * @param {import("@minecraft/server").Player} target
   * @returns {{ success: boolean, message: string }}
   */
  static sendRecruitInvite(leader, target) {
    if (!leader || !target) return { success: false, message: "Invalid player selection." };
    if (leader.id === target.id) return { success: false, message: "You cannot recruit yourself." };

    if (GameState.isPlayerGhost(leader) || GameState.getPlayerLives(leader) !== CONFIG.LAST_LIFE_THRESHOLD) {
      return { success: false, message: "Only active Last-Life players can lead recruitments." };
    }

    if (GameState.isPlayerGhost(target) || GameState.getPlayerLives(target) <= 0) {
      return { success: false, message: "Eliminated players (Ghosts) cannot be recruited." };
    }

    const currentRecruits = GameState.getPlayerRecruitsCount(leader);
    if (currentRecruits >= CONFIG.MAX_RECRUITS_PER_SESSION) {
      return { success: false, message: `You have reached the limit of ${CONFIG.MAX_RECRUITS_PER_SESSION} recruitment(s) for this session.` };
    }

    // Set pending invitation expiring in 60 seconds (1200 ticks)
    GameState.pendingRecruitInvites.set(target.name, {
      fromName: leader.name,
      expiresAtTick: system.currentTick + 1200
    });

    leader.sendMessage(`§aAlliance invitation sent to §e${target.name}§a. Waiting for their response...`);
    target.sendMessage(`§6§l[LAST LIFE] ALLIANCE INVITATION: §e${leader.name} §6has invited you to join their Last-Life Alliance!`);
    target.sendMessage(`§7Open your LAST LIFE Menu to Accept or Decline the alliance.`);

    Logger.log("RECRUIT", `Recruitment invite sent from ${leader.name} to ${target.name}.`);
    return { success: true, message: `Invitation sent to ${target.name}.` };
  }

  /**
   * Accepts or declines a pending recruitment invitation
   * @param {import("@minecraft/server").Player} recipient
   * @param {boolean} accept
   * @returns {{ success: boolean, message: string }}
   */
  static respondToRecruitInvite(recipient, accept) {
    const invite = GameState.pendingRecruitInvites.get(recipient.name);
    if (!invite) {
      return { success: false, message: "No active alliance invitation found." };
    }

    if (system.currentTick > invite.expiresAtTick) {
      GameState.pendingRecruitInvites.delete(recipient.name);
      return { success: false, message: "Invitation has expired." };
    }

    GameState.pendingRecruitInvites.delete(recipient.name);
    const leaderName = invite.fromName;

    if (!accept) {
      world.sendMessage(`§7[LAST LIFE] ${recipient.name} declined the alliance invitation from ${leaderName}.`);
      Logger.log("RECRUIT", `${recipient.name} declined recruitment from ${leaderName}.`);
      return { success: true, message: "You declined the invitation." };
    }

    // Accepted alliance!
    GameState.setPlayerAllianceLeader(recipient, leaderName);

    // Find leader to update recruit count
    const leader = world.getAllPlayers().find(p => p.name === leaderName);
    if (leader) {
      const current = GameState.getPlayerRecruitsCount(leader);
      GameState.setPlayerRecruitsCount(leader, current + 1);
    }

    world.sendMessage(`§6§l[LAST LIFE] ALLIANCE FORMED! §e${recipient.name} §6has sworn allegiance to §e${leaderName}§6!§r`);
    Logger.log("RECRUIT", `Alliance established: ${recipient.name} joined ${leaderName}'s alliance.`);

    return { success: true, message: `You have successfully joined ${leaderName}'s alliance!` };
  }
}
