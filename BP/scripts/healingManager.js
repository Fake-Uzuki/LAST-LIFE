/**
 * LAST LIFE: Healing & Golden Apple Management
 * Manages natural health regeneration toggle (Sessions 1-4 ON, Sessions 5-7 OFF).
 * Limits ordinary Golden Apples to 16 for the entire event.
 * Prohibits Enchanted Golden Apples.
 * Creator: TheDarkLight836
 */

import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { GameState } from "./state.js";
import { Logger } from "./logger.js";

export class HealingManager {
  /**
   * Configure natural regeneration based on the active session number.
   * Sessions 1-4: Enabled.
   * Sessions 5-7: Disabled.
   * @param {number} sessionNum
   */
  static applySessionRegenRules(sessionNum) {
    const isRegenEnabled = sessionNum < CONFIG.NATURAL_REGEN_DISABLED_START_SESSION;
    
    try {
      const dimension = world.getDimension("overworld");
      dimension.runCommandAsync(`gamerule naturalregeneration ${isRegenEnabled ? "true" : "false"}`);
      
      const statusText = isRegenEnabled ? "§aENABLED§r" : "§cDISABLED (Blood Debt Rules Active)§r";
      world.sendMessage(`§6[LAST LIFE] Natural Health Regeneration is now ${statusText} for Session ${sessionNum}.`);
      if (!isRegenEnabled) {
        world.sendMessage("§e[LAST LIFE] Food restores hunger & sprinting only. Use potions and scarce Golden Apples to heal!");
      }
      Logger.log("SESSION", `Natural regeneration set to ${isRegenEnabled} for Session ${sessionNum}.`);
    } catch (e) {
      console.warn(`[LAST LIFE] Failed to set gamerule naturalregeneration: ${e}`);
    }
  }

  /**
   * Intercept item use before completion to prohibit Enchanted Golden Apples
   * @param {import("@minecraft/server").ItemUseBeforeEvent} event
   */
  static onBeforeItemUse(event) {
    const item = event.itemStack;
    if (!item) return;

    if (item.typeId === "minecraft:enchanted_golden_apple") {
      event.cancel = true;
      const player = event.source;
      player.sendMessage("§c§l[LAST LIFE] PROHIBITED ITEM: §eEnchanted Golden Apples (God Apples) are banned!§r");
      player.sendMessage("§7Only ordinary Golden Apples (limit 16 for the entire event) are permitted.");
      Logger.log("CURSE", `Blocked Enchanted Golden Apple use attempt by ${player.name}.`);
    }
  }

  /**
   * Handle completed item use for Golden Apple event tracking
   * @param {import("@minecraft/server").ItemCompleteUseAfterEvent} event
   */
  static onAfterItemCompleteUse(event) {
    const item = event.itemStack;
    const source = event.source;
    if (!item || source.typeId !== "minecraft:player") return;

    if (item.typeId === "minecraft:golden_apple") {
      this.handleGoldenAppleConsumed(source);
    }
  }

  /**
   * Track global Golden Apple consumption against the 16-apple event cap
   * @param {import("@minecraft/server").Player} player
   */
  static handleGoldenAppleConsumed(player) {
    const current = GameState.getGoldenApplesConsumed();
    const updated = current + 1;
    GameState.setGoldenApplesConsumed(updated);

    const remaining = CONFIG.MAX_GOLDEN_APPLES_EVENT - updated;

    if (remaining < 0) {
      // Exceeded limit! Remove benefits and broadcast alert
      try {
        player.removeEffect("regeneration");
        player.removeEffect("absorption");
      } catch (err) {}

      world.sendMessage(`§c§l[LAST LIFE] ⚠ GOLDEN APPLE LIMIT EXCEEDED!§r`);
      world.sendMessage(`§c${player.name} consumed a Golden Apple, but the event quota of 16 is exhausted! No health effects granted.`);
      Logger.log("GAPPLE", `Exceeded Golden Apple limit: ${player.name} consumed apple #${updated}. Effects nullified.`);
    } else {
      world.sendMessage(`§6[LAST LIFE] §e${player.name}§6 consumed a Golden Apple! (§e${remaining}§6 of ${CONFIG.MAX_GOLDEN_APPLES_EVENT} remaining for the event).`);
      Logger.log("GAPPLE", `${player.name} consumed Golden Apple #${updated}. (${remaining} remaining)`);
      
      if (remaining <= 3) {
        world.sendMessage(`§c⚠ CRITICAL: Only ${remaining} Golden Apples remain for the ENTIRE event! Guard them closely!`);
      }
    }
  }

  /**
   * Reset or adjust Golden Apple supply (Admin control)
   * @param {number} count
   */
  static setConsumedCount(count) {
    GameState.setGoldenApplesConsumed(count);
    const remaining = Math.max(0, CONFIG.MAX_GOLDEN_APPLES_EVENT - count);
    world.sendMessage(`§e[LAST LIFE] Admin adjusted Golden Apple count to ${count}/${CONFIG.MAX_GOLDEN_APPLES_EVENT}. (${remaining} remaining).`);
    Logger.log("ADMIN", `Admin adjusted Golden Apple consumed count to ${count}.`);
  }
}
