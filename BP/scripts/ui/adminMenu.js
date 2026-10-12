/**
 * LAST LIFE: Admin Control Panel Interface
 * Comprehensive administrative controls for sessions, lives, mission verification,
 * voting settlement, golden apple supply, and auditable event logs.
 * Restricted to players with tag 'admin'.
 * Creator: TheDarkLight836
 */

import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { CONFIG, SESSIONS } from "../config.js";
import { GameState, SessionState, VotingState } from "../state.js";
import { SessionManager } from "../sessionManager.js";
import { LivesManager } from "../livesManager.js";
import { ImpostorManager } from "../impostorManager.js";
import { VotingManager } from "../votingManager.js";
import { HealingManager } from "../healingManager.js";
import { Logger } from "../logger.js";

export class AdminMenu {
  /**
   * Main Admin Dashboard
   * @param {import("@minecraft/server").Player} admin
   */
  static showAdminDashboard(admin) {
    if (!admin.hasTag(CONFIG.ADMIN_TAG) && !admin.isOp?.()) {
      admin.sendMessage("§c[LAST LIFE] Access Denied: You do not have administrator permissions (requires tag 'admin').");
      return;
    }

    const sessionNum = GameState.getSessionNumber();
    const sessionState = GameState.getSessionState();
    const gapples = GameState.getGoldenApplesConsumed();
    const impostors = GameState.getImpostors();

    let body = `§6§lLAST LIFE — ADMINISTRATOR CONSOLE§r\n`;
    body += `§7Session: §e${sessionNum}/7 §7| State: §e${sessionState}\n`;
    body += `§7Golden Apples Used: §e${gapples}/${CONFIG.MAX_GOLDEN_APPLES_EVENT} §7(${CONFIG.MAX_GOLDEN_APPLES_EVENT - gapples} remaining)\n`;
    body += `§7Active Impostors Assigned: §e${impostors.length}\n`;

    const form = new ActionFormData()
      .title("§4§lLAST LIFE ADMIN PANEL§r")
      .body(body)
      .button("§e§lSESSION CONTROLS§r\n§7Start, Pause, Resume, End")
      .button("§a§lPLAYER & LIVES MANAGER§r\n§7Inspect & modify survivor Lives")
      .button("§c§lMISSION VERIFICATION§r\n§7Review secret missions & evidence")
      .button("§6§lVOTING MANAGER§r\n§7Manage ballots, tally & Grand Reveal")
      .button("§g§lGOLDEN APPLE SUPPLY§r\n§7Inspect & adjust event apple limits")
      .button("§b§lAUDIT EVENT LOGS§r\n§7Browse system and combat logs");

    system.run(() => {
      form.show(admin).then(res => {
        if (res.canceled) return;

        switch (res.selection) {
          case 0: return this.showSessionControls(admin);
          case 1: return this.showPlayerManager(admin);
          case 2: return this.showMissionReview(admin);
          case 3: return this.showVotingManager(admin);
          case 4: return this.showGoldenAppleControls(admin);
          case 5: return this.showEventLogs(admin);
        }
      });
    });
  }

  /**
   * Session Controls Form
   */
  static showSessionControls(admin) {
    const currentState = GameState.getSessionState();
    const currentNum = GameState.getSessionNumber();

    const form = new ActionFormData()
      .title("§e§lSESSION CONTROLS§r")
      .body(`Current Session: §e${currentNum}§r | State: §e${currentState}§r`)
      .button("§aStart / Restart Session")
      .button("§6Pause Session")
      .button("§bResume Session")
      .button("§cEnd Session (Trigger Voting)")
      .button("§eSelect Session Number (1-7)")
      .button("§7« Back to Dashboard");

    system.run(() => {
      form.show(admin).then(res => {
        if (res.canceled) return;

        switch (res.selection) {
          case 0:
            SessionManager.startSession(currentNum);
            admin.sendMessage(`§aStarted Session ${currentNum}.`);
            break;
          case 1:
            SessionManager.pauseSession();
            break;
          case 2:
            SessionManager.resumeSession();
            break;
          case 3:
            SessionManager.endSession("Admin Manually Ended");
            break;
          case 4:
            this.showSetSessionNumberModal(admin);
            break;
          case 5:
            this.showAdminDashboard(admin);
            break;
        }
      });
    });
  }

  /**
   * Modal to switch Session number (1..7)
   */
  static showSetSessionNumberModal(admin) {
    const sessionOptions = SESSIONS.map(s => `Session ${s.number}: ${s.title}`);
    const current = GameState.getSessionNumber() - 1;

    const form = new ModalFormData()
      .title("§e§lSET ACTIVE SESSION§r")
      .dropdown("Choose Session:", sessionOptions, current);

    system.run(() => {
      form.show(admin).then(res => {
        if (res.canceled) return;
        const newNum = res.formValues[0] + 1;
        GameState.setSessionNumber(newNum);
        admin.sendMessage(`§aActive Session set to ${newNum}: ${SESSIONS[newNum - 1].title}`);
        this.showSessionControls(admin);
      });
    });
  }

  /**
   * Player & Lives Management Form
   */
  static showPlayerManager(admin) {
    const players = world.getAllPlayers();
    if (players.length === 0) {
      admin.sendMessage("§cNo players online.");
      return;
    }

    const form = new ActionFormData()
      .title("§a§lPLAYER & LIVES MANAGER§r")
      .body("Select a player to inspect or modify their Lives:");

    for (const p of players) {
      const lives = GameState.getPlayerLives(p);
      const isGhost = GameState.isPlayerGhost(p);
      const tag = isGhost ? "§8[GHOST]" : `§e[${lives}/5 Lives]`;
      form.button(`§f${p.name}\n${tag}`);
    }
    form.button("§7« Back");

    system.run(() => {
      form.show(admin).then(res => {
        if (res.canceled) return;
        if (res.selection === players.length) return this.showAdminDashboard(admin);

        const target = players[res.selection];
        if (target) this.showPlayerDetails(admin, target);
      });
    });
  }

  /**
   * Individual Player Inspector & Modifier
   */
  static showPlayerDetails(admin, target) {
    const lives = GameState.getPlayerLives(target);
    const isGhost = GameState.isPlayerGhost(target);

    let body = `§ePlayer: §f${target.name}\n`;
    body += `§eLives: §f${lives}/5\n`;
    body += `§eGhost State: §f${isGhost ? "YES (Spectator)" : "NO (Active Survivor)"}\n`;

    const form = new ActionFormData()
      .title(`§aManage: ${target.name}`)
      .body(body)
      .button("§a+1 Life")
      .button("§c-1 Life")
      .button("§eSet Exact Lives (0-5)")
      .button(isGhost ? "§bRevive from Ghost" : "§8Force Ghost Mode")
      .button("§7« Back");

    system.run(() => {
      form.show(admin).then(res => {
        if (res.canceled) return;

        switch (res.selection) {
          case 0:
            LivesManager.adjustPlayerLives(target, 1, "Admin Grant");
            this.showPlayerDetails(admin, target);
            break;
          case 1:
            LivesManager.adjustPlayerLives(target, -1, "Admin Deduction");
            this.showPlayerDetails(admin, target);
            break;
          case 2:
            this.showSetExactLivesModal(admin, target);
            break;
          case 3:
            GameState.setPlayerGhost(target, !isGhost);
            if (!isGhost) {
              LivesManager.enforceGhostState(target);
            } else {
              target.runCommandAsync("gamemode survival @s");
            }
            admin.sendMessage(`§eToggled Ghost state for ${target.name}.`);
            this.showPlayerDetails(admin, target);
            break;
          case 4:
            this.showPlayerManager(admin);
            break;
        }
      });
    });
  }

  /**
   * Modal to set exact Lives
   */
  static showSetExactLivesModal(admin, target) {
    const current = GameState.getPlayerLives(target);
    const form = new ModalFormData()
      .title(`Set Lives: ${target.name}`)
      .slider("Lives Count:", 0, 5, 1, current);

    system.run(() => {
      form.show(admin).then(res => {
        if (res.canceled) return;
        const val = res.formValues[0];
        GameState.setPlayerLives(target, val);
        admin.sendMessage(`§aSet Lives for ${target.name} to ${val}.`);
        this.showPlayerDetails(admin, target);
      });
    });
  }

  /**
   * Secret Mission Verification Interface
   */
  static showMissionReview(admin) {
    const impostors = GameState.getImpostors();

    if (impostors.length === 0) {
      admin.sendMessage("§eNo secret missions currently assigned for this session.");
      return;
    }

    const form = new ActionFormData()
      .title("§c§lMISSION VERIFICATION§r")
      .body("Select an assigned Impostor to inspect evidence and verify outcome:");

    for (const imp of impostors) {
      form.button(`§f${imp.playerName}\n§e${imp.category}: ${imp.title} §7[${imp.status}]`);
    }
    form.button("§7« Back to Dashboard");

    system.run(() => {
      form.show(admin).then(res => {
        if (res.canceled) return;
        if (res.selection === impostors.length) return this.showAdminDashboard(admin);

        const selected = impostors[res.selection];
        if (selected) this.showMissionDecisionForm(admin, selected);
      });
    });
  }

  /**
   * Detailed Mission Evidence & Verification Decision Form
   */
  static showMissionDecisionForm(admin, mission) {
    let body = `§eAssigned Player: §f${mission.playerName}\n`;
    body += `§eCategory: §c${mission.category} — ${mission.title}\n`;
    if (mission.target && mission.target !== "None") {
      body += `§eTarget Player: §c${mission.target}\n`;
    }
    body += `§eInstructions:\n§7${mission.instructions}\n\n`;
    body += `§eSuccess Criteria:\n§a${mission.successCriteria}\n\n`;
    body += `§eFailure Condition:\n§c${mission.failureCondition}\n\n`;
    body += `§eCurrent Status: §f${mission.status}\n\n`;

    body += `§eRecorded Evidence & Events:\n`;
    if (mission.evidence && mission.evidence.length > 0) {
      body += mission.evidence.map(e => `§7• ${e}`).join("\n");
    } else {
      body += `§7(No events recorded yet)`;
    }

    const form = new ActionFormData()
      .title(`Review: ${mission.playerName}`)
      .body(body)
      .button("§a✔ Mark as COMPLETED (+1 Life)")
      .button("§c✖ Mark as FAILED (-1 Life)")
      .button("§e⚠ Mark as INVALIDATED (0 Life)")
      .button("§7« Back to Mission List");

    system.run(() => {
      form.show(admin).then(res => {
        if (res.canceled) return;

        switch (res.selection) {
          case 0:
            ImpostorManager.verifyMission(mission.id, "COMPLETED", "Approved by Admin");
            admin.sendMessage(`§aMission marked as COMPLETED for ${mission.playerName}.`);
            this.showMissionReview(admin);
            break;
          case 1:
            ImpostorManager.verifyMission(mission.id, "FAILED", "Failed by Admin");
            admin.sendMessage(`§cMission marked as FAILED for ${mission.playerName}.`);
            this.showMissionReview(admin);
            break;
          case 2:
            ImpostorManager.verifyMission(mission.id, "INVALIDATED", "Invalidated by Admin");
            admin.sendMessage(`§eMission INVALIDATED for ${mission.playerName}.`);
            this.showMissionReview(admin);
            break;
          case 3:
            this.showMissionReview(admin);
            break;
        }
      });
    });
  }

  /**
   * Voting Manager Form
   */
  static showVotingManager(admin) {
    const vState = GameState.getVotingState();
    const tally = VotingManager.computeTally();

    let body = `§eCurrent Voting Phase: §f${vState}\n`;
    body += `§7Eligible Voters: §e${tally.totalEligibleVoters} §7| Ballots Cast: §e${tally.votesCastCount}\n`;
    body += `§7Required Threshold to Catch: §e${tally.threshold} votes\n\n`;

    body += `§6Current Tally:\n`;
    if (Object.keys(tally.tally).length > 0) {
      for (const suspect in tally.tally) {
        body += `  §f${suspect}: §e${tally.tally[suspect]} votes\n`;
      }
    } else {
      body += `  §7(No votes cast yet)\n`;
    }

    const form = new ActionFormData()
      .title("§6§lVOTING MANAGER§r")
      .body(body)
      .button("§e1. Start Discussion Period")
      .button("§c2. Open Private Voting Ballots")
      .button("§a3. Settle Lives & Reveal Results")
      .button("§7« Back to Dashboard");

    system.run(() => {
      form.show(admin).then(res => {
        if (res.canceled) return;

        switch (res.selection) {
          case 0:
            VotingManager.startVotingSession();
            admin.sendMessage("§eStarted Discussion period.");
            break;
          case 1:
            VotingManager.openVotingBallots();
            admin.sendMessage("§cOpened private voting ballots.");
            break;
          case 2:
            VotingManager.settleAndRevealResults();
            admin.sendMessage("§aVoting settled and results revealed!");
            break;
          case 3:
            this.showAdminDashboard(admin);
            break;
        }
      });
    });
  }

  /**
   * Golden Apple Supply Controls
   */
  static showGoldenAppleControls(admin) {
    const consumed = GameState.getGoldenApplesConsumed();
    const remaining = Math.max(0, CONFIG.MAX_GOLDEN_APPLES_EVENT - consumed);

    const form = new ModalFormData()
      .title("§g§lGOLDEN APPLE SUPPLY§r")
      .slider(`Apples Consumed (Max ${CONFIG.MAX_GOLDEN_APPLES_EVENT}):`, 0, CONFIG.MAX_GOLDEN_APPLES_EVENT, 1, consumed);

    system.run(() => {
      form.show(admin).then(res => {
        if (res.canceled) return;
        const val = res.formValues[0];
        HealingManager.setConsumedCount(val);
        this.showAdminDashboard(admin);
      });
    });
  }

  /**
   * Auditable Event Logs Viewer
   */
  static showEventLogs(admin) {
    const logs = Logger.getLogs();

    let body = `§b=== RECENT AUDITABLE EVENTS (${logs.length}) ===§r\n\n`;
    if (logs.length === 0) {
      body += "§7No events recorded yet.";
    } else {
      body += logs.slice(0, 15).map(l => `§e[${l.type}] §f${l.message}`).join("\n\n");
    }

    const form = new ActionFormData()
      .title("§b§lEVENT LOG VIEWER§r")
      .body(body)
      .button("§7« Back to Dashboard");

    system.run(() => {
      form.show(admin).then(res => {
        if (!res.canceled) this.showAdminDashboard(admin);
      });
    });
  }
}
