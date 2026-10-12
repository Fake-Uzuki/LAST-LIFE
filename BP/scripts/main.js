/**
 * LAST LIFE: 7-Session Survival Add-on
 * Main Entry Point
 * Developed by TheDarkLight836
 */

import { world, system } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { SessionManager } from "./sessionManager.js";
import { ArmorCurseManager } from "./armorCurseManager.js";
import { LivesManager } from "./livesManager.js";
import { PvPManager } from "./pvpManager.js";
import { HealingManager } from "./healingManager.js";
import { ImpostorManager } from "./impostorManager.js";
import { PlayerMenu } from "./ui/playerMenu.js";
import { AdminMenu } from "./ui/adminMenu.js";

console.warn(`[LAST LIFE] Initializing LAST LIFE Survival Add-on v${CONFIG.VERSION} by ${CONFIG.CREATOR}...`);

/**
 * Opens the appropriate menu interface based on player permissions
 * @param {import("@minecraft/server").Player} player
 */
function openAppropriateMenu(player) {
  system.run(() => {
    if (player.hasTag(CONFIG.ADMIN_TAG) || player.isOp?.()) {
      AdminMenu.showAdminDashboard(player);
    } else {
      PlayerMenu.showMainMenu(player);
    }
  });
}

// -------------------------------------------------------------
// 1. Core 1-Second Tick Loop (20 ticks)
// -------------------------------------------------------------
system.runInterval(() => {
  try {
    // A. Armor Curse Damage (0.5 hearts damage every second while armor is worn)
    ArmorCurseManager.tick();

    // B. Session Timer, HUD Action Bar, and Challenges
    SessionManager.tick();
  } catch (err) {
    console.warn(`[LAST LIFE] Error in core tick loop: ${err}`);
  }
}, CONFIG.ARMOR_CURSE_INTERVAL_TICKS);

// -------------------------------------------------------------
// 2. Player Spawn & Join Event
// -------------------------------------------------------------
world.afterEvents.playerSpawn.subscribe(event => {
  const player = event.player;
  if (!player) return;

  system.run(() => {
    LivesManager.handlePlayerSpawn(player);
  });
});

// -------------------------------------------------------------
// 3. Entity Hurt Event (Combat & Last-Life PvP Verification)
// -------------------------------------------------------------
world.afterEvents.entityHurt.subscribe(event => {
  PvPManager.handleEntityHurt(event);
});

// -------------------------------------------------------------
// 4. Entity Die Event (Player Deaths, Deductions, PvP Kills & Ender Dragon)
// -------------------------------------------------------------
world.afterEvents.entityDie.subscribe(event => {
  const entity = event.deadEntity;
  if (!entity) return;

  // A. Player Death
  if (entity.typeId === "minecraft:player") {
    LivesManager.handlePlayerDeath(entity, event.damageSource);
    PvPManager.handlePlayerKill(entity, event.damageSource);

    // Record evidence if relevant to impostor assassination missions
    const killer = event.damageSource?.damagingEntity;
    const killerName = (killer && killer.typeId === "minecraft:player") ? killer.name : "Environment/Mob";
    ImpostorManager.recordEvidence(entity.name, `Player died. Killer: ${killerName}.`);
  }

  // B. Ender Dragon Defeat (Session 7 Victory)
  if (entity.typeId === "minecraft:ender_dragon") {
    SessionManager.handleDragonDeath(entity);
  }
});

// -------------------------------------------------------------
// 5. Item Use Interception (Menu Item & Prohibited Items)
// -------------------------------------------------------------
world.beforeEvents.itemUse.subscribe(event => {
  const item = event.itemStack;
  const player = event.source;

  // A. Interactive Menu Item (Compass)
  if (item && item.typeId === CONFIG.MENU_ITEM_TYPE) {
    event.cancel = true;
    openAppropriateMenu(player);
    return;
  }

  // B. Prohibited Enchanted Golden Apples
  HealingManager.onBeforeItemUse(event);
});

// -------------------------------------------------------------
// 6. Item Consumption Completion (Golden Apple Quota Tracking)
// -------------------------------------------------------------
world.afterEvents.itemCompleteUse.subscribe(event => {
  HealingManager.onAfterItemCompleteUse(event);
});

// -------------------------------------------------------------
// 7. ScriptEvent Commands (/scriptevent lastlife:...)
// -------------------------------------------------------------
system.afterEvents.scriptEventReceive.subscribe(event => {
  const id = event.id.toLowerCase();
  const player = event.sourceEntity;

  if (!player || player.typeId !== "minecraft:player") return;

  switch (id) {
    case "lastlife:menu":
      PlayerMenu.showMainMenu(player);
      break;

    case "lastlife:admin":
      AdminMenu.showAdminDashboard(player);
      break;

    case "lastlife:start":
      if (player.hasTag(CONFIG.ADMIN_TAG) || player.isOp?.()) {
        SessionManager.startSession();
      }
      break;

    case "lastlife:pause":
      if (player.hasTag(CONFIG.ADMIN_TAG) || player.isOp?.()) {
        SessionManager.pauseSession();
      }
      break;

    case "lastlife:resume":
      if (player.hasTag(CONFIG.ADMIN_TAG) || player.isOp?.()) {
        SessionManager.resumeSession();
      }
      break;

    case "lastlife:end":
      if (player.hasTag(CONFIG.ADMIN_TAG) || player.isOp?.()) {
        SessionManager.endSession("Command Ended");
      }
      break;
  }
});

console.warn(`[LAST LIFE] Add-on initialized successfully! Developed by ${CONFIG.CREATOR}.`);
