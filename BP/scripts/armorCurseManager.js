/**
 * LAST LIFE: Cursed Armor & Prohibited Equipment System
 * Enforces half-a-heart damage every second while any armor is equipped.
 * Shields are allowed. Totems of Undying and Elytra are strictly prohibited/cursed.
 * Creator: TheDarkLight836
 */

import { world, system, EquipmentSlot, EntityDamageCause } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { GameState } from "./state.js";
import { Logger } from "./logger.js";

export class ArmorCurseManager {
  // Set of player IDs currently known to be wearing armor (for transition warnings)
  static wearingArmorPlayers = new Set();

  /**
   * Evaluates all online players for cursed armor and prohibited items.
   * Runs every 20 ticks (1 second).
   */
  static tick() {
    for (const player of world.getAllPlayers()) {
      // Ghosts/Spectators are exempt from armor curse
      if (GameState.isPlayerGhost(player)) continue;

      try {
        this.processPlayerEquipment(player);
      } catch (e) {
        console.warn(`[LAST LIFE] Error processing equipment for ${player.name}: ${e}`);
      }
    }
  }

  /**
   * Process a single player's equipment slots
   * @param {import("@minecraft/server").Player} player
   */
  static processPlayerEquipment(player) {
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) return;

    const head = equippable.getEquipment(EquipmentSlot.Head);
    const chest = equippable.getEquipment(EquipmentSlot.Chest);
    const legs = equippable.getEquipment(EquipmentSlot.Legs);
    const feet = equippable.getEquipment(EquipmentSlot.Feet);
    const offhand = equippable.getEquipment(EquipmentSlot.Offhand);
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);

    // 1. Prohibited Items Enforcement: Totem of Undying
    if (offhand && offhand.typeId === "minecraft:totem_of_undying") {
      this.confiscateProhibitedItem(player, EquipmentSlot.Offhand, "Totem of Undying");
    }
    if (mainhand && mainhand.typeId === "minecraft:totem_of_undying") {
      this.confiscateProhibitedItem(player, EquipmentSlot.Mainhand, "Totem of Undying");
    }

    // 2. Elytra Check (Treated as cursed/prohibited equipment)
    const isWearingElytra = chest && chest.typeId === "minecraft:elytra";
    if (isWearingElytra) {
      this.warnPlayerElytra(player);
    }

    // 3. Determine if ANY armor piece is worn (Head, Chest, Legs, Feet)
    // Note: Shields in offhand are allowed and explicitly do NOT trigger the curse.
    const isWearingAnyArmor = Boolean(head || chest || legs || feet);

    const playerId = player.id;
    const previouslyWearing = this.wearingArmorPlayers.has(playerId);

    if (isWearingAnyArmor) {
      // First time equipping armor -> Warn player
      if (!previouslyWearing) {
        this.wearingArmorPlayers.add(playerId);
        player.sendMessage("§c§l[LAST LIFE] ⚠ WARNING: CURSED ARMOR EQUIPPED!§r");
        player.sendMessage("§cWearing armor inflicts 0.5 hearts of unblockable curse damage every second!");
        player.onScreenDisplay.setTitle("§c⚠ CURSED ARMOR", {
          stayDuration: 40,
          fadeInDuration: 10,
          fadeOutDuration: 10,
          subtitle: "§7Unequip all armor to stop damage"
        });
      }

      // Apply unblockable half-heart (1 damage point) curse damage.
      // Using 'magic' cause ensures ordinary armor protection calculations
      // cannot mitigate or cancel the curse damage, while preserving standard protection
      // against ordinary mobs and environmental hazards.
      try {
        player.applyDamage(CONFIG.ARMOR_CURSE_DAMAGE, {
          cause: EntityDamageCause.magic
        });
      } catch (err) {
        // Player might have just died or disconnected
      }
    } else {
      // Removing all armor stops the curse immediately
      if (previouslyWearing) {
        this.wearingArmorPlayers.delete(playerId);
        player.sendMessage("§a[LAST LIFE] All armor removed. The armor curse has stopped.§r");
      }
    }
  }

  /**
   * Confiscate or drop prohibited Totem of Undying
   */
  static confiscateProhibitedItem(player, slot, itemName) {
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) return;

    try {
      equippable.setEquipment(slot, undefined);
      player.sendMessage(`§c§l[LAST LIFE] PROHIBITED ITEM DETECTED: §e${itemName} is strictly banned!`);
      player.sendMessage("§7Totems of Undying bypass the Lives survival mechanic and are prohibited.");
      Logger.log("CURSE", `Confiscated banned ${itemName} from ${player.name} in slot ${slot}.`);
    } catch (e) {
      console.warn(`[LAST LIFE] Failed to clear prohibited slot: ${e}`);
    }
  }

  /**
   * Warn player about Elytra
   */
  static warnPlayerElytra(player) {
    const lastWarn = GameState.armorWarningCooldown.get(player.name) || 0;
    if (system.currentTick - lastWarn > 200) { // Every 10 seconds
      GameState.armorWarningCooldown.set(player.name, system.currentTick);
      player.sendMessage("§c§l[LAST LIFE] ⚠ Elytra is cursed and prohibited due to chest slot advantage!§r");
    }
  }
}
