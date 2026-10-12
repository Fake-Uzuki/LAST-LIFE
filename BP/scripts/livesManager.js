/**
 * LAST LIFE: Lives & Elimination Management
 * Manages player Lives (0 to 5), Ghost/Spectator mode enforcement,
 * Life deductions upon death, and multiplayer-safe atomic Life donations.
 * Creator: TheDarkLight836
 */

import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { GameState } from "./state.js";
import { Logger } from "./logger.js";

export class LivesManager {
  /**
   * Initializes or verifies a player's Lives upon spawning / joining
   * @param {import("@minecraft/server").Player} player
   */
  static handlePlayerSpawn(player) {
    const lives = GameState.getPlayerLives(player);
    const isGhost = GameState.isPlayerGhost(player);

    if (lives <= 0 || isGhost) {
      this.enforceGhostState(player);
    } else {
      // Ensure active survival gamemode
      if (player.hasTag("ghost")) {
        player.removeTag("ghost");
      }
      this.giveMenuItem(player);
    }
  }

  /**
   * Deducts 1 Life from a player upon death
   * @param {import("@minecraft/server").Player} player
   * @param {import("@minecraft/server").EntityDamageSource} [damageSource]
   */
  static handlePlayerDeath(player, damageSource) {
    const currentLives = GameState.getPlayerLives(player);
    const newLives = Math.max(0, currentLives - 1);
    GameState.setPlayerLives(player, newLives);

    const killer = damageSource?.damagingEntity;
    const killerName = (killer && killer.typeId === "minecraft:player") ? killer.name : null;

    if (newLives <= 0) {
      // Permanent elimination
      GameState.setPlayerGhost(player, true);
      this.enforceGhostState(player);

      world.sendMessage(`§c§l========================================§r`);
      world.sendMessage(`§4§l☠ ELIMINATION: ${player.name} has lost their LAST LIFE!§r`);
      world.sendMessage(`§c${player.name} is permanently eliminated from active competition.`);
      world.sendMessage(`§7They now walk the world as a silent Ghost Spectator.`);
      world.sendMessage(`§c§l========================================§r`);

      player.onScreenDisplay.setTitle("§4§lELIMINATED", {
        stayDuration: 100,
        fadeInDuration: 20,
        fadeOutDuration: 20,
        subtitle: "§cYou have lost all your Lives."
      });

      Logger.log("LIFE", `ELIMINATION: ${player.name} eliminated with 0 Lives. Killer: ${killerName || "Environment/Mob"}.`);
    } else {
      const heartSymbols = "❤".repeat(newLives) + "♡".repeat(CONFIG.MAX_LIVES - newLives);
      world.sendMessage(`§e[LAST LIFE] §c${player.name}§e died! Lives remaining: §c${newLives}§7/5 [${heartSymbols}].`);
      
      if (newLives === CONFIG.LAST_LIFE_THRESHOLD) {
        world.sendMessage(`§c§l⚠ ALERT: ${player.name} is now on their LAST LIFE! PvP initiation unlocked!§r`);
        player.onScreenDisplay.setTitle("§c§lLAST LIFE!", {
          stayDuration: 80,
          fadeInDuration: 10,
          fadeOutDuration: 10,
          subtitle: "§eYou may now initiate PvP against any survivor!"
        });
      }

      Logger.log("LIFE", `${player.name} died. Lives deducted: ${currentLives} -> ${newLives}. Killer: ${killerName || "Environment/Mob"}.`);
    }

    return newLives;
  }

  /**
   * Enforces spectator mode and Ghost restrictions
   * @param {import("@minecraft/server").Player} player
   */
  static enforceGhostState(player) {
    GameState.setPlayerGhost(player, true);
    
    system.run(() => {
      try {
        player.runCommandAsync("gamemode spectator @s");
        player.sendMessage("§8[GHOST] You are in Spectator Mode. You may observe, but you cannot interact with the world or reveal secrets to active survivors.");
      } catch (err) {
        console.warn(`[LAST LIFE] Failed to set spectator mode for ghost: ${err}`);
      }
    });
  }

  /**
   * Safely adds or deducts Lives (Admin controlled)
   * @param {import("@minecraft/server").Player} player
   * @param {number} delta
   * @param {string} reason
   */
  static adjustPlayerLives(player, delta, reason) {
    const current = GameState.getPlayerLives(player);
    const updated = Math.max(CONFIG.MIN_LIVES, Math.min(CONFIG.MAX_LIVES, current + delta));
    GameState.setPlayerLives(player, updated);

    if (updated <= 0) {
      this.enforceGhostState(player);
    } else if (GameState.isPlayerGhost(player)) {
      // Restored from ghost
      GameState.setPlayerGhost(player, false);
      try {
        player.runCommandAsync("gamemode survival @s");
      } catch (err) {}
    }

    world.sendMessage(`§e[LAST LIFE] Admin adjusted Lives for ${player.name}: ${current} -> ${updated} (${reason}).`);
    Logger.log("ADMIN", `Adjusted Lives for ${player.name}: ${current} -> ${updated} (${reason}).`);
    return updated;
  }

  /**
   * Atomic multiplayer Life transfer between two active players.
   * Rules:
   * 1. Donor must keep at least 1 Life (donor lives >= 2).
   * 2. Recipient cannot exceed MAX_LIVES (recipient lives < 5).
   * 3. Neither player can be a Ghost.
   * 4. Life transfer never generates extra Lives.
   * @param {import("@minecraft/server").Player} donor
   * @param {import("@minecraft/server").Player} recipient
   * @returns {{ success: boolean, message: string }}
   */
  static transferLife(donor, recipient) {
    if (!donor || !recipient) {
      return { success: false, message: "Invalid player selection." };
    }

    if (donor.id === recipient.id) {
      return { success: false, message: "You cannot transfer a Life to yourself." };
    }

    if (GameState.isPlayerGhost(donor) || GameState.getPlayerLives(donor) <= 0) {
      return { success: false, message: "Ghosts cannot transfer Lives." };
    }

    if (GameState.isPlayerGhost(recipient) || GameState.getPlayerLives(recipient) <= 0) {
      return { success: false, message: "Eliminated players (Ghosts) cannot receive Lives." };
    }

    const donorLives = GameState.getPlayerLives(donor);
    if (donorLives < 2) {
      return { success: false, message: "You must keep at least one Life for yourself!" };
    }

    const recipientLives = GameState.getPlayerLives(recipient);
    if (recipientLives >= CONFIG.MAX_LIVES) {
      return { success: false, message: `${recipient.name} already has the maximum of ${CONFIG.MAX_LIVES} Lives.` };
    }

    // Perform atomic transfer
    const updatedDonorLives = donorLives - 1;
    const updatedRecipientLives = recipientLives + 1;

    GameState.setPlayerLives(donor, updatedDonorLives);
    GameState.setPlayerLives(recipient, updatedRecipientLives);

    world.sendMessage(`§a§l[LAST LIFE] LIFE TRANSFER: §e${donor.name}§a donated 1 Life to §e${recipient.name}§a!§r`);
    donor.sendMessage(`§aYou donated 1 Life to ${recipient.name}. You now have ${updatedDonorLives} Lives.`);
    recipient.sendMessage(`§a${donor.name} gave you 1 Life! You now have ${updatedRecipientLives} Lives.`);

    Logger.log("LIFE", `Life transfer: ${donor.name} (${donorLives}->${updatedDonorLives}) donated to ${recipient.name} (${recipientLives}->${updatedRecipientLives}).`);

    return { success: true, message: `Successfully transferred 1 Life to ${recipient.name}.` };
  }

  /**
   * Gives the player the interactive Menu Compass if not already present
   * @param {import("@minecraft/server").Player} player
   */
  static giveMenuItem(player) {
    const inventory = player.getComponent("minecraft:inventory");
    if (!inventory || !inventory.container) return;

    const container = inventory.container;
    let hasItem = false;

    for (let i = 0; i < container.size; i++) {
      const item = container.getItem(i);
      if (item && item.typeId === CONFIG.MENU_ITEM_TYPE && item.nameTag === CONFIG.MENU_ITEM_NAME) {
        hasItem = true;
        break;
      }
    }

    if (!hasItem) {
      try {
        player.runCommandAsync(`give @s ${CONFIG.MENU_ITEM_TYPE} 1 0 {"minecraft:item_display":{"name":"${CONFIG.MENU_ITEM_NAME}"}}`);
      } catch (err) {
        // Fallback standard give
        try {
          player.runCommandAsync(`give @s ${CONFIG.MENU_ITEM_TYPE} 1`);
        } catch (e) {}
      }
    }
  }
}
