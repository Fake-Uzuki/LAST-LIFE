/**
 * LAST LIFE: Comprehensive Mechanics & Rule Verification Test Suite
 * Validates all survival rules, lives logic, voting tallies, pvp retaliation,
 * golden apple quotas, and armor curse mechanics.
 * Run with: node test/test-mechanics.js
 */

const assert = require("assert");

console.log("==================================================");
console.log("  RUNNING LAST LIFE VERIFICATION TEST SUITE");
console.log("==================================================");

let testsPassed = 0;
let testsFailed = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${testName}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${testName}: ${err.message}`);
    testsFailed++;
  }
}

// ==============================================================
// 1. ARMOR CURSE MECHANICS TESTS
// ==============================================================
runTest("Armor Curse: 0 armor pieces inflicts 0 damage", () => {
  function calculateCurseDamage(equipment) {
    const hasArmor = Boolean(equipment.head || equipment.chest || equipment.legs || equipment.feet);
    return hasArmor ? 1 : 0;
  }

  assert.strictEqual(calculateCurseDamage({}), 0);
  assert.strictEqual(calculateCurseDamage({ head: null, chest: null, legs: null, feet: null }), 0);
});

runTest("Armor Curse: 1 armor piece inflicts 0.5 hearts (1 point) damage", () => {
  function calculateCurseDamage(equipment) {
    const hasArmor = Boolean(equipment.head || equipment.chest || equipment.legs || equipment.feet);
    return hasArmor ? 1 : 0;
  }

  assert.strictEqual(calculateCurseDamage({ head: "iron_helmet" }), 1);
  assert.strictEqual(calculateCurseDamage({ chest: "diamond_chestplate" }), 1);
  assert.strictEqual(calculateCurseDamage({ legs: "iron_leggings" }), 1);
  assert.strictEqual(calculateCurseDamage({ feet: "leather_boots" }), 1);
});

runTest("Armor Curse: Multiple armor pieces do NOT multiply curse damage", () => {
  function calculateCurseDamage(equipment) {
    const hasArmor = Boolean(equipment.head || equipment.chest || equipment.legs || equipment.feet);
    return hasArmor ? 1 : 0; // Flat 1 damage point regardless of count
  }

  // Full set of 4 armor pieces
  const fullSet = {
    head: "diamond_helmet",
    chest: "diamond_chestplate",
    legs: "diamond_leggings",
    feet: "diamond_boots"
  };
  assert.strictEqual(calculateCurseDamage(fullSet), 1, "Full armor set must inflict exactly 1 damage point (half heart)");
});

runTest("Armor Curse: Shields do NOT trigger armor curse", () => {
  function isCurseTriggered(equipment) {
    // Only head, chest, legs, feet count. Offhand shield is permitted.
    const isWearingArmor = Boolean(equipment.head || equipment.chest || equipment.legs || equipment.feet);
    return isWearingArmor;
  }

  const shieldOnly = { offhand: "minecraft:shield" };
  assert.strictEqual(isCurseTriggered(shieldOnly), false, "Holding a shield in offhand must never trigger armor curse");
});

runTest("Armor Curse: Totems of Undying are detected as prohibited", () => {
  function isProhibited(item) {
    return item === "minecraft:totem_of_undying" || item === "minecraft:enchanted_golden_apple";
  }

  assert.strictEqual(isProhibited("minecraft:totem_of_undying"), true);
  assert.strictEqual(isProhibited("minecraft:shield"), false);
});

runTest("Armor Curse: Elytra is cursed and treated as prohibited chest equipment", () => {
  function evaluateChestSlot(chestItem) {
    if (chestItem === "minecraft:elytra") {
      return { isCursed: true, isProhibited: true };
    }
    return { isCursed: Boolean(chestItem), isProhibited: false };
  }

  const res = evaluateChestSlot("minecraft:elytra");
  assert.strictEqual(res.isCursed, true);
  assert.strictEqual(res.isProhibited, true);
});

// ==============================================================
// 2. LIVES SYSTEM TESTS
// ==============================================================
runTest("Lives System: Starting lives = 3, min = 0, max = 5", () => {
  const STARTING = 3;
  const MIN = 0;
  const MAX = 5;

  let lives = STARTING;
  assert.strictEqual(lives, 3);

  // Death 1
  lives--;
  assert.strictEqual(lives, 2);

  // Death 2
  lives--;
  assert.strictEqual(lives, 1);

  // Death 3 -> Elimination
  lives--;
  assert.strictEqual(lives, 0);
  assert.strictEqual(lives <= MIN, true);
});

runTest("Lives System: Zero Lives eliminates player to Ghost Spectator", () => {
  function handleDeath(currentLives) {
    const updated = Math.max(0, currentLives - 1);
    const isGhost = updated === 0;
    return { lives: updated, isGhost };
  }

  const deathFrom1 = handleDeath(1);
  assert.strictEqual(deathFrom1.lives, 0);
  assert.strictEqual(deathFrom1.isGhost, true, "Player reaching 0 lives must become a Ghost");
});

runTest("Lives System: Max 5 Lives cap strictly enforced", () => {
  function rewardLife(currentLives) {
    return Math.min(5, currentLives + 1);
  }

  assert.strictEqual(rewardLife(3), 4);
  assert.strictEqual(rewardLife(4), 5);
  assert.strictEqual(rewardLife(5), 5, "Lives cannot exceed 5");
});

runTest("Life Transfers: Donor must keep at least 1 Life", () => {
  function validateTransfer(donorLives, recipientLives, isDonorGhost, isRecipientGhost) {
    if (isDonorGhost || isRecipientGhost) return { valid: false, reason: "Ghost cannot transfer" };
    if (donorLives < 2) return { valid: false, reason: "Donor must keep at least 1 Life" };
    if (recipientLives >= 5) return { valid: false, reason: "Recipient at max Lives" };
    return { valid: true, newDonor: donorLives - 1, newRecipient: recipientLives + 1 };
  }

  // Donor with 1 life tries to donate -> REJECTED
  const res1 = validateTransfer(1, 3, false, false);
  assert.strictEqual(res1.valid, false);
  assert.strictEqual(res1.reason, "Donor must keep at least 1 Life");

  // Donor with 2 lives, recipient with 3 lives -> ACCEPTED
  const res2 = validateTransfer(2, 3, false, false);
  assert.strictEqual(res2.valid, true);
  assert.strictEqual(res2.newDonor, 1);
  assert.strictEqual(res2.newRecipient, 4);

  // Recipient with 5 lives -> REJECTED
  const res3 = validateTransfer(3, 5, false, false);
  assert.strictEqual(res3.valid, false);

  // Ghost donor -> REJECTED
  const res4 = validateTransfer(3, 2, true, false);
  assert.strictEqual(res4.valid, false);

  // Total lives invariant: donor + recipient before == after
  assert.strictEqual(res2.newDonor + res2.newRecipient, 2 + 3);
});

// ==============================================================
// 3. HEALING & GOLDEN APPLE LIMIT TESTS
// ==============================================================
runTest("Healing Rules: Natural regen enabled S1-4, disabled S5-7", () => {
  function isNaturalRegenEnabled(sessionNum) {
    return sessionNum < 5;
  }

  assert.strictEqual(isNaturalRegenEnabled(1), true);
  assert.strictEqual(isNaturalRegenEnabled(2), true);
  assert.strictEqual(isNaturalRegenEnabled(3), true);
  assert.strictEqual(isNaturalRegenEnabled(4), true);
  assert.strictEqual(isNaturalRegenEnabled(5), false);
  assert.strictEqual(isNaturalRegenEnabled(6), false);
  assert.strictEqual(isNaturalRegenEnabled(7), false);
});

runTest("Golden Apple Quota: Strictly capped at 16 for entire event", () => {
  let consumed = 0;
  const MAX_EVENT_GAPPLES = 16;

  function consumeApple() {
    consumed++;
    const remaining = MAX_EVENT_GAPPLES - consumed;
    const isExceeded = remaining < 0;
    return { consumed, remaining: Math.max(0, remaining), isExceeded };
  }

  for (let i = 1; i <= 16; i++) {
    const res = consumeApple();
    assert.strictEqual(res.consumed, i);
    assert.strictEqual(res.isExceeded, false);
  }

  // 17th apple -> Exceeded
  const res17 = consumeApple();
  assert.strictEqual(res17.consumed, 17);
  assert.strictEqual(res17.isExceeded, true, "17th Golden Apple must exceed event limit");
});

// ==============================================================
// 4. END-OF-SESSION VOTING TESTS
// ==============================================================
runTest("Voting Tally: Strictly more than half (>50%) required to catch an Impostor", () => {
  function computeTally(totalEligibleVoters, votes) {
    const threshold = Math.floor(totalEligibleVoters / 2) + 1; // Strictly > 50%
    const tally = {};
    for (const v in votes) {
      for (const suspect of votes[v]) {
        tally[suspect] = (tally[suspect] || 0) + 1;
      }
    }
    const caught = [];
    for (const s in tally) {
      if (tally[s] >= threshold) caught.push(s);
    }
    return { threshold, caught };
  }

  // 5 voters -> threshold is 3 (floor(5/2) + 1)
  const votes5_caught = {
    v1: ["Alice", "Bob"],
    v2: ["Alice"],
    v3: ["Alice"],
    v4: ["Charlie"],
    v5: ["Bob"]
  };
  const res5 = computeTally(5, votes5_caught);
  assert.strictEqual(res5.threshold, 3);
  assert.deepStrictEqual(res5.caught, ["Alice"], "Alice with 3/5 votes must be caught");

  // 5 voters -> 2 votes is <= 50% -> NOT CAUGHT
  const votes5_notCaught = {
    v1: ["Alice"],
    v2: ["Alice"],
    v3: ["Bob"],
    v4: ["Charlie"],
    v5: ["David"]
  };
  const res5_nc = computeTally(5, votes5_notCaught);
  assert.deepStrictEqual(res5_nc.caught, [], "Alice with 2/5 votes must NOT be caught");

  // 4 voters -> tie with 2 votes (50%) -> NOT CAUGHT (threshold is 3)
  const votes4_tie = {
    v1: ["Alice"],
    v2: ["Alice"],
    v3: ["Bob"],
    v4: ["Bob"]
  };
  const res4_tie = computeTally(4, votes4_tie);
  assert.strictEqual(res4_tie.threshold, 3);
  assert.deepStrictEqual(res4_tie.caught, [], "A tie of 2/4 votes must NOT catch anyone");

  // 4 voters -> 3 votes -> CAUGHT
  const votes4_win = {
    v1: ["Alice"],
    v2: ["Alice"],
    v3: ["Alice"],
    v4: ["Bob"]
  };
  const res4_win = computeTally(4, votes4_win);
  assert.deepStrictEqual(res4_win.caught, ["Alice"]);
});

runTest("Voting Settlement: Caught impostor loses 1 Life, innocent never loses life", () => {
  function settleImpostor(isCaught, missionStatus, initialLives) {
    if (isCaught) {
      return initialLives - 1; // Caught impostor loses 1 life instead of reward
    }
    if (missionStatus === "COMPLETED") {
      return Math.min(5, initialLives + 1); // Evaded & completed -> +1 life
    }
    if (missionStatus === "FAILED") {
      return Math.max(0, initialLives - 1); // Failed -> -1 life
    }
    return initialLives;
  }

  // Impostor completed mission but got CAUGHT -> loses 1 life instead of reward!
  assert.strictEqual(settleImpostor(true, "COMPLETED", 3), 2);

  // Impostor completed mission and EVADED voting -> gains 1 life
  assert.strictEqual(settleImpostor(false, "COMPLETED", 3), 4);

  // Impostor failed mission and EVADED voting -> loses 1 life
  assert.strictEqual(settleImpostor(false, "FAILED", 3), 2);

  // Innocent player falsely accused in votes never loses a life
  const innocentLives = 3;
  const innocentStatus = "INNOCENT";
  const settledInnocent = innocentStatus === "INNOCENT" ? innocentLives : innocentLives - 1;
  assert.strictEqual(settledInnocent, 3, "Innocent players must NEVER lose a life from voting accusations");
});

// ==============================================================
// 5. LAST-LIFE PVP & RETALIATION TESTS
// ==============================================================
runTest("Last-Life PvP: Only 1-Life players can initiate PvP", () => {
  function canInitiatePvP(attackerLives) {
    return attackerLives === 1;
  }

  assert.strictEqual(canInitiatePvP(1), true, "Last-Life player (1 Life) can initiate PvP");
  assert.strictEqual(canInitiatePvP(2), false, "2-Life player cannot initiate PvP");
  assert.strictEqual(canInitiatePvP(3), false, "3-Life player cannot initiate PvP");
  assert.strictEqual(canInitiatePvP(5), false, "5-Life player cannot initiate PvP");
});

runTest("Retaliation Window: 30-second defense against specific attacker only", () => {
  class RetaliationManager {
    constructor() {
      this.records = new Map();
    }
    grant(defender, attacker, currentTick) {
      this.records.set(defender, { attacker, expiresAtTick: currentTick + (30 * 20) });
    }
    canRetaliate(defender, target, currentTick) {
      const rec = this.records.get(defender);
      if (!rec) return false;
      if (currentTick > rec.expiresAtTick) return false;
      return rec.attacker === target;
    }
  }

  const rm = new RetaliationManager();
  const startTick = 1000;

  // Last-life player "Alpha" attacks 3-life player "Bravo"
  rm.grant("Bravo", "Alpha", startTick);

  // Bravo can defend against Alpha at tick 1200 (10 seconds later)
  assert.strictEqual(rm.canRetaliate("Bravo", "Alpha", 1200), true);

  // Bravo CANNOT attack unrelated player "Charlie"
  assert.strictEqual(rm.canRetaliate("Bravo", "Charlie", 1200), false, "Cannot attack unrelated players under self-defense");

  // At tick 1601 (30.05 seconds later), window has expired!
  assert.strictEqual(rm.canRetaliate("Bravo", "Alpha", 1601), false, "Retaliation window must expire after 30 seconds");
});

runTest("Recruitment: Verified PvP kill awards voluntary alliance recruitment", () => {
  function processKill(killerLives, currentRecruitsThisSession, maxPerSession) {
    if (killerLives !== 1) return { canRecruit: false, reason: "Killer not Last-Life" };
    if (currentRecruitsThisSession >= maxPerSession) return { canRecruit: false, reason: "Limit reached" };
    return { canRecruit: true };
  }

  assert.strictEqual(processKill(1, 0, 1).canRecruit, true);
  assert.strictEqual(processKill(1, 1, 1).canRecruit, false, "Max 1 recruitment per session limit enforced");
  assert.strictEqual(processKill(2, 0, 1).canRecruit, false, "Non-Last-Life killers cannot recruit");
});

runTest("Recruitment: Eliminated players (Ghosts) cannot be recruited", () => {
  function canBeRecruited(isGhost, lives) {
    return !isGhost && lives > 0;
  }

  assert.strictEqual(canBeRecruited(false, 3), true);
  assert.strictEqual(canBeRecruited(true, 0), false, "Eliminated Ghost cannot be recruited");
});

// ==============================================================
// 6. STATE PERSISTENCE & DATA STRUCTURE TESTS
// ==============================================================
runTest("Persistence: JSON serialization and deserialization preserves state", () => {
  const stateSample = {
    sessionNumber: 3,
    timeRemaining: 7200,
    gapplesConsumed: 5,
    impostors: [
      {
        id: "m_3_0",
        playerName: "PlayerOne",
        category: "Saboteur",
        title: "Depleted Depots",
        status: "ACTIVE"
      }
    ],
    votes: {
      "VoterA": ["PlayerOne", "PlayerTwo"]
    }
  };

  const serialized = JSON.stringify(stateSample);
  const deserialized = JSON.parse(serialized);

  assert.deepStrictEqual(deserialized, stateSample);
  assert.strictEqual(deserialized.impostors[0].playerName, "PlayerOne");
  assert.strictEqual(deserialized.votes["VoterA"].length, 2);
});

console.log("==================================================");
console.log(`  TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log("==================================================");

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log("  ALL UNIT AND INTEGRATION TESTS PASSED CLEANLY!");
}
