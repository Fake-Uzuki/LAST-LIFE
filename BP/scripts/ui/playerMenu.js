/**
 * LAST LIFE: Player Interface System
 * Displays Lives, Session Objectives, Private Mission (if assigned),
 * Life Transfers, Voting, and Alliance Recruitment.
 * Uses Bedrock ActionFormData and ModalFormData via @minecraft/server-ui.
 * Creator: TheDarkLight836
 */

import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { CONFIG, SESSIONS } from "../config.js";
import { GameState, VotingState } from "../state.js";
import { ImpostorManager } from "../impostorManager.js";
import { LivesManager } from "../livesManager.js";
import { VotingManager } from "../votingManager.js";
import { PvPManager } from "../pvpManager.js";

export class PlayerMenu {
  /**
   * Opens the main survivor interface
   * @param {import("@minecraft/server").Player} player
   */
  static showMainMenu(player) {
    const lives = GameState.getPlayerLives(player);
    const isGhost = GameState.isPlayerGhost(player);
    const sessionNum = GameState.getSessionNumber();
    const sessionState = GameState.getSessionState();
    const remaining = GameState.getTimeRemaining();
    const votingState = GameState.getVotingState();

    const hours = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = remaining % 60;
    const timeFormatted = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    const currentSessionDef = SESSIONS.find(s => s.number === sessionNum) || SESSIONS[0];
    const mission = ImpostorManager.getPlayerMission(player.name);
    const pendingInvite = GameState.pendingRecruitInvites.get(player.name);

    let bodyText = `§e=== SURVIVOR STATUS ===§r\n`;
    if (isGhost) {
      bodyText += `§8Status: ELIMINATED GHOST SPECTATOR\n`;
    } else {
      const hearts = "§c" + "❤".repeat(lives) + "§7" + "♡".repeat(CONFIG.MAX_LIVES - lives);
      bodyText += `§fYour Lives: ${hearts} §e(${lives}/${CONFIG.MAX_LIVES})§r\n`;
      if (lives === 1) {
        bodyText += `§c⚠ YOU ARE ON YOUR LAST LIFE! PvP initiation unlocked!§r\n`;
      }
    }

    const allianceLeader = GameState.getPlayerAllianceLeader(player);
    if (allianceLeader) {
      bodyText += `§6Alliance: Sworn to §e${allianceLeader}§r\n`;
    }

    bodyText += `\n§e=== SESSION ${sessionNum}: ${currentSessionDef.title.toUpperCase()} ===§r\n`;
    bodyText += `§7State: §e${sessionState} §7| Time: §e${timeFormatted}§r\n`;
    bodyText += `§fPublic Challenge:\n§7${currentSessionDef.publicObjective}\n`;

    const form = new ActionFormData()
      .title("§6§lLAST LIFE SURVIVAL§r")
      .body(bodyText);

    // Option 1: Secret Mission (ONLY shown if player is an Impostor)
    if (mission) {
      form.button("§4§lSECRET MISSION§r\n§cView classified assignment");
    }

    // Option 2: Pending Alliance Invitation
    if (pendingInvite) {
      form.button("§6§lALLIANCE INVITE§r\n§eRespond to recruitment offer");
    }

    // Option 3: Cast Vote (when voting is open)
    if (votingState === VotingState.VOTING && VotingManager.isEligibleVoter(player)) {
      form.button("§c§lCAST PRIVATE VOTE§r\n§7Vote for suspected Impostors");
    }

    // Option 4: Donate Life
    if (!isGhost && lives >= 2) {
      form.button("§a§lDONATE 1 LIFE§r\n§7Transfer a Life to another survivor");
    }

    // Option 5: Recruit Survivor (Last-Life player with kill)
    if (!isGhost && lives === 1 && GameState.getPlayerRecruitsCount(player) < CONFIG.MAX_RECRUITS_PER_SESSION) {
      form.button("§6§lRECRUIT SURVIVOR§r\n§7Invite player to your Alliance");
    }

    // Option 6: Event Rules & Information
    form.button("§e§lEVENT RULES & INFO§r\n§7Read Cursed Armor & Life rules");

    // Show form asynchronously
    system.run(() => {
      form.show(player).then(res => {
        if (res.canceled) return;

        let index = 0;
        if (mission) {
          if (res.selection === index) return this.showMissionDetails(player, mission);
          index++;
        }

        if (pendingInvite) {
          if (res.selection === index) return this.showAllianceInviteResponse(player, pendingInvite);
          index++;
        }

        if (votingState === VotingState.VOTING && VotingManager.isEligibleVoter(player)) {
          if (res.selection === index) return this.showVotingForm(player);
          index++;
        }

        if (!isGhost && lives >= 2) {
          if (res.selection === index) return this.showDonateLifeForm(player);
          index++;
        }

        if (!isGhost && lives === 1 && GameState.getPlayerRecruitsCount(player) < CONFIG.MAX_RECRUITS_PER_SESSION) {
          if (res.selection === index) return this.showRecruitForm(player);
          index++;
        }

        if (res.selection === index) {
          return this.showRulesDialog(player);
        }
      });
    });
  }

  /**
   * Private Impostor Mission Details View
   */
  static showMissionDetails(player, mission) {
    let body = `§4§lCLASSIFIED IMPOSTOR ASSIGNMENT§r\n\n`;
    body += `§eRole: §c${mission.category} — ${mission.title}\n`;
    if (mission.target && mission.target !== "None") {
      body += `§eTarget Player: §c${mission.target}\n`;
    }
    body += `§eInstructions:\n§7${mission.instructions}\n\n`;
    body += `§eSuccess Criteria:\n§a${mission.successCriteria}\n\n`;
    body += `§eFailure Condition:\n§c${mission.failureCondition}\n\n`;
    body += `§eReward: §a${mission.reward} §7| §ePenalty: §c${mission.penalty}\n`;
    body += `§eCurrent Status: §f${mission.status}\n\n`;
    body += `§7Remember: Do not reveal your identity or assignment to anyone!`;

    const form = new ActionFormData()
      .title("§4§lSECRET MISSION§r")
      .body(body)
      .button("§aBack to Main Menu");

    system.run(() => {
      form.show(player).then(res => {
        if (!res.canceled) this.showMainMenu(player);
      });
    });
  }

  /**
   * Life Transfer / Donation Form
   */
  static showDonateLifeForm(donor) {
    const activeSurvivors = world.getAllPlayers().filter(p => {
      return p.id !== donor.id && !GameState.isPlayerGhost(p) && GameState.getPlayerLives(p) < CONFIG.MAX_LIVES;
    });

    if (activeSurvivors.length === 0) {
      donor.sendMessage("§cNo eligible survivors found to receive a Life (all players either have 5 Lives or are eliminated).");
      return;
    }

    const form = new ModalFormData()
      .title("§a§lDONATE 1 LIFE§r")
      .dropdown("Select Recipient Survivor:", activeSurvivors.map(p => `${p.name} (${GameState.getPlayerLives(p)}/5 Lives)`), 0);

    system.run(() => {
      form.show(donor).then(res => {
        if (res.canceled) return;
        const selectedIndex = res.formValues[0];
        const recipient = activeSurvivors[selectedIndex];
        if (recipient) {
          LivesManager.transferLife(donor, recipient);
        }
      });
    });
  }

  /**
   * Alliance Recruitment Form (for Last-Life players)
   */
  static showRecruitForm(leader) {
    const eligibleSurvivors = world.getAllPlayers().filter(p => {
      return p.id !== leader.id && !GameState.isPlayerGhost(p) && GameState.getPlayerLives(p) > 0;
    });

    if (eligibleSurvivors.length === 0) {
      leader.sendMessage("§cNo active survivors available to recruit.");
      return;
    }

    const form = new ModalFormData()
      .title("§6§lRECRUIT ALLIANCE MEMBER§r")
      .dropdown("Select Survivor to Invite:", eligibleSurvivors.map(p => `${p.name} (${GameState.getPlayerLives(p)} Lives)`), 0);

    system.run(() => {
      form.show(leader).then(res => {
        if (res.canceled) return;
        const selected = eligibleSurvivors[res.formValues[0]];
        if (selected) {
          PvPManager.sendRecruitInvite(leader, selected);
        }
      });
    });
  }

  /**
   * Alliance Invitation Response Dialog
   */
  static showAllianceInviteResponse(player, invite) {
    const form = new MessageFormData()
      .title("§6§lALLIANCE INVITATION§r")
      .body(`§e${invite.fromName} §fhas invited you to join their Last-Life Alliance!\n\nAllies cooperate on survival and defense. You retain all your Lives and rules.\nDo you accept this allegiance?`)
      .button1("§aAccept Alliance")
      .button2("§cDecline Offer");

    system.run(() => {
      form.show(player).then(res => {
        if (res.canceled) return;
        PvPManager.respondToRecruitInvite(player, res.selection === 0);
      });
    });
  }

  /**
   * Private Voting Form
   */
  static showVotingForm(player) {
    const suspects = world.getAllPlayers().filter(p => !GameState.isPlayerGhost(p) && p.id !== player.id);

    if (suspects.length < 2) {
      player.sendMessage("§cNot enough active players to cast votes.");
      return;
    }

    const names = suspects.map(p => p.name);

    const form = new ModalFormData()
      .title("§c§lPRIVATE BALLOT — VOTE IMPOSTORS§r")
      .dropdown("Primary Suspect (Suspect 1):", names, 0)
      .dropdown("Secondary Suspect (Suspect 2):", names, 1 % names.length);

    system.run(() => {
      form.show(player).then(res => {
        if (res.canceled) return;
        const s1 = names[res.formValues[0]];
        const s2 = names[res.formValues[1]];

        const selected = (s1 === s2) ? [s1] : [s1, s2];
        VotingManager.castVote(player, selected);
      });
    });
  }

  /**
   * Rules & Mechanics Dialog
   */
  static showRulesDialog(player) {
    let text = `§6§lLAST LIFE: 7-SESSION SURVIVAL RULES§r\n\n`;
    text += `§e1. LIVES SYSTEM:\n`;
    text += `  • Start with 3 Lives. Max 5 Lives.\n`;
    text += `  • Death = -1 Life. At 0 Lives you become a Ghost Spectator.\n`;
    text += `  • Only active survivors when Ender Dragon falls win the event.\n\n`;
    text += `§e2. CURSED ARMOR:\n`;
    text += `  • Wearing ANY armor piece inflicts 0.5 hearts damage every second.\n`;
    text += `  • Removing armor stops the curse immediately.\n`;
    text += `  • Shields are allowed! Totems of Undying & Elytra are BANNED.\n\n`;
    text += `§e3. LAST-LIFE PVP & SELF-DEFENSE:\n`;
    text += `  • Players with exactly 1 Life can initiate PvP on anyone.\n`;
    text += `  • >1 Life players CANNOT initiate attacks unless defending for 30s against a Last-Life attacker.\n\n`;
    text += `§e4. HEALING & GOLDEN APPLES:\n`;
    text += `  • Sessions 1-4: Natural regeneration ON.\n`;
    text += `  • Sessions 5-7: Natural regeneration OFF.\n`;
    text += `  • Golden Apples strictly limited to 16 for the ENTIRE event! Enchanted apples banned.`;

    const form = new ActionFormData()
      .title("§6§lEVENT RULES & GUIDE§r")
      .body(text)
      .button("§aBack to Main Menu");

    system.run(() => {
      form.show(player).then(res => {
        if (!res.canceled) this.showMainMenu(player);
      });
    });
  }
}
