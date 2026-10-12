/**
 * LAST LIFE: End-of-Session Voting & Settlement System
 * Enforces Discussion -> Private Voting -> Tally (>50% strictly required) -> Admin Review -> Life Settlement -> Reveal.
 * Handles 1 or 2 Impostors correctly.
 * Innocent accusations never cost lives. Caught impostors lose 1 Life instead of reward.
 * Creator: TheDarkLight836
 */

import { world } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { GameState, VotingState } from "./state.js";
import { Logger } from "./logger.js";
import { LivesManager } from "./livesManager.js";

export class VotingManager {
  /**
   * Starts the End-of-Session Voting Phase
   */
  static startVotingSession() {
    GameState.setVotes({});
    GameState.setVotingState(VotingState.DISCUSSION);

    world.sendMessage("§e§l========================================");
    world.sendMessage("§6§l[END OF SESSION] DISCUSSION PERIOD HAS BEGUN!§r");
    world.sendMessage("§eSurvivors have a short period to discuss suspicious behavior, missing supplies, and evidence.");
    world.sendMessage("§7When the discussion concludes, innocent survivors will vote on suspected Impostors.");
    world.sendMessage("§e§l========================================");

    Logger.log("VOTE", "End-of-Session discussion phase started.");
  }

  /**
   * Transition to the Private Voting phase
   */
  static openVotingBallots() {
    GameState.setVotingState(VotingState.VOTING);

    world.sendMessage("§6§l========================================");
    world.sendMessage("§c§l[VOTING ACTIVE] PRIVATE BALLOTS ARE NOW OPEN!§r");
    world.sendMessage("§eActive survivors who are NOT assigned secret missions may vote for up to 2 suspects.");
    world.sendMessage("§7Open your LAST LIFE Menu to cast your private vote.");
    world.sendMessage("§6§l========================================");

    Logger.log("VOTE", "Private voting phase opened.");
  }

  /**
   * Checks if a player is eligible to vote this session
   * Rules:
   * 1. Must have > 0 Lives.
   * 2. Must not be a Ghost.
   * 3. Must NOT be an assigned Impostor this session.
   * @param {import("@minecraft/server").Player} player
   * @returns {boolean}
   */
  static isEligibleVoter(player) {
    if (GameState.isPlayerGhost(player) || GameState.getPlayerLives(player) <= 0) {
      return false;
    }
    const impostors = GameState.getImpostors();
    const isImpostor = impostors.some(imp => imp.playerName === player.name);
    return !isImpostor;
  }

  /**
   * Casts a player's private votes for up to 2 suspects
   * @param {import("@minecraft/server").Player} voter
   * @param {string[]} suspectNames
   * @returns {{ success: boolean, message: string }}
   */
  static castVote(voter, suspectNames) {
    if (GameState.getVotingState() !== VotingState.VOTING) {
      return { success: false, message: "Voting is not currently active." };
    }

    if (!this.isEligibleVoter(voter)) {
      return { success: false, message: "You are not eligible to vote (Impostors and Ghosts cannot vote)." };
    }

    if (!Array.isArray(suspectNames) || suspectNames.length === 0 || suspectNames.length > 2) {
      return { success: false, message: "You must vote for 1 or 2 suspects." };
    }

    // Save votes
    const votes = GameState.getVotes();
    votes[voter.name] = suspectNames;
    GameState.setVotes(votes);

    voter.sendMessage(`§aYour private vote for [${suspectNames.join(", ")}] has been securely recorded.`);
    Logger.log("VOTE", `${voter.name} cast private ballot for: ${suspectNames.join(", ")}.`);

    return { success: true, message: "Vote cast successfully!" };
  }

  /**
   * Computes the voting tally and determines who was caught
   * Rule: A suspect is caught ONLY if they receive votes from strictly more than half of eligible voters:
   * votes > eligibleVotersCount / 2
   * @returns {{
   *   totalEligibleVoters: number,
   *   votesCastCount: number,
   *   threshold: number,
   *   tally: { [suspect: string]: number },
   *   caughtPlayers: string[]
   * }}
   */
  static computeTally() {
    const allOnline = world.getAllPlayers();
    const eligibleVoters = allOnline.filter(p => this.isEligibleVoter(p));
    const totalEligible = eligibleVoters.length;

    const votes = GameState.getVotes();
    const tally = {};

    for (const voterName in votes) {
      const selections = votes[voterName];
      for (const suspect of selections) {
        tally[suspect] = (tally[suspect] || 0) + 1;
      }
    }

    // Required threshold: strictly more than half
    const threshold = Math.floor(totalEligible / 2) + 1;
    const caughtPlayers = [];

    for (const suspect in tally) {
      if (tally[suspect] >= threshold) {
        caughtPlayers.push(suspect);
      }
    }

    return {
      totalEligibleVoters: totalEligible,
      votesCastCount: Object.keys(votes).length,
      threshold,
      tally,
      caughtPlayers
    };
  }

  /**
   * Finalizes the voting outcomes, applies Life adjustments, and reveals assignments
   * @returns {object} Summary report
   */
  static settleAndRevealResults() {
    const tallyResult = this.computeTally();
    const impostors = GameState.getImpostors();
    const caught = tallyResult.caughtPlayers;

    GameState.setVotingState(VotingState.REVEALED);

    const outcomes = [];

    for (const imp of impostors) {
      const wasCaught = caught.includes(imp.playerName);
      const player = world.getAllPlayers().find(p => p.name === imp.playerName);

      let lifeAdjustment = 0;
      let outcomeText = "";

      if (wasCaught) {
        // Caught Impostor! Loses 1 Life instead of receiving mission reward
        lifeAdjustment = -1;
        outcomeText = "CAUGHT BY VOTING (-1 Life)";
        if (player) {
          LivesManager.adjustPlayerLives(player, -1, `Caught Impostor in Voting (${imp.title})`);
        }
      } else {
        // Not caught by voting!
        if (imp.status === "COMPLETED") {
          // Completed mission & evaded detection -> +1 Life (capped at 5)
          lifeAdjustment = 1;
          outcomeText = "SUCCESSFUL & EVADED (+1 Life)";
          if (player) {
            LivesManager.adjustPlayerLives(player, 1, `Successful Impostor Evaded Voting (${imp.title})`);
          }
        } else if (imp.status === "FAILED") {
          // Failed mission -> -1 Life (no double penalty)
          lifeAdjustment = -1;
          outcomeText = "MISSION FAILED (-1 Life)";
          if (player) {
            LivesManager.adjustPlayerLives(player, -1, `Failed Impostor Mission (${imp.title})`);
          }
        } else {
          // Status pending or invalidated
          outcomeText = "UNRESOLVED / INVALIDATED (0 Life change)";
        }
      }

      outcomes.push({
        playerName: imp.playerName,
        category: imp.category,
        title: imp.title,
        wasCaught,
        votesReceived: tallyResult.tally[imp.playerName] || 0,
        outcomeText,
        lifeAdjustment
      });
    }

    // Broadcast Grand Reveal to all players
    world.sendMessage("§4§l========================================");
    world.sendMessage("§c§l[THE GRAND REVEAL] SESSION ASSIGNMENTS & VOTING RESULTS§r");
    world.sendMessage(`§7Total Eligible Voters: §e${tallyResult.totalEligibleVoters} §7| Votes Required to Catch: §e${tallyResult.threshold}`);

    if (caught.length === 0) {
      world.sendMessage("§eVoting Result: §7No impostor received strictly more than half the votes! No one was caught by voting.");
    } else {
      world.sendMessage(`§eCaught by Voting: §c${caught.join(", ")}`);
    }

    world.sendMessage("§6--- Secret Assignments & Verdicts ---");
    for (const out of outcomes) {
      world.sendMessage(`§ePlayer: §f${out.playerName} §7| Role: §c${out.category} (${out.title})`);
      world.sendMessage(`  §7Votes: §f${out.votesReceived} §7| Status: §e${out.outcomeText}`);
    }
    world.sendMessage("§4§l========================================");

    Logger.log("VOTE", `Grand Reveal finalized. Caught: [${caught.join(", ")}]. Outcomes: ${JSON.stringify(outcomes)}`);
    return { tallyResult, outcomes };
  }
}
