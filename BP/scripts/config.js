/**
 * LAST LIFE: 7-Session Survival Add-on
 * Configuration and Challenge Definitions
 * Creator: TheDarkLight836
 */

export const CONFIG = {
  ADDON_NAME: "LAST LIFE",
  CREATOR: "TheDarkLight836",
  VERSION: "1.0.0",

  // Session Settings
  TOTAL_SESSIONS: 7,
  DEFAULT_SESSION_DURATION: 10800, // 3 hours in seconds (3 * 3600)
  
  // Lives Rules
  STARTING_LIVES: 3,
  MAX_LIVES: 5,
  MIN_LIVES: 0,
  LAST_LIFE_THRESHOLD: 1,

  // Survival & Curse Mechanics
  ARMOR_CURSE_DAMAGE: 1, // 1 point = 0.5 hearts
  ARMOR_CURSE_INTERVAL_TICKS: 20, // 20 ticks = 1 second

  // PvP & Combat Rules
  DEFAULT_RETALIATION_WINDOW_SECONDS: 30,
  MAX_RECRUITS_PER_SESSION: 1,

  // Healing & Golden Apple Limits
  MAX_GOLDEN_APPLES_EVENT: 16, // Total limit for the entire 7-session event
  NATURAL_REGEN_DISABLED_START_SESSION: 5, // Sessions 5-7 have natural regen disabled

  // Permissions & Controls
  ADMIN_TAG: "admin",
  MENU_ITEM_TYPE: "minecraft:compass",
  MENU_ITEM_NAME: "§6§lLAST LIFE Menu§r",
  MENU_ITEM_LORE: ["§7Right-click to view Lives, Objectives,", "§7Private Missions & Survivor Options"],

  // Basecamp Settings (Admin configurable in-game)
  DEFAULT_BASECAMP: {
    x: 0,
    y: 70,
    z: 0,
    radius: 30
  }
};

/**
 * 7 Session Challenges and Descriptions
 */
export const SESSIONS = [
  {
    number: 1,
    title: "The Lost",
    publicObjective: "Scattered across unknown lands with coordinates hidden. Find the Basecamp, reunite with all survivors, and pool initial survival supplies.",
    regenEnabled: true,
    details: "Coordinates disabled. Basecamp location must be found through exploration and cooperation."
  },
  {
    number: 2,
    title: "Build or Die",
    publicObjective: "Construct a functioning communal fortress featuring secure storage, crafting facilities, sustainable food production, and a fortified sleeping bunker.",
    regenEnabled: true,
    details: "Base must withstand nighttime mob assaults and provide shelter for all active survivors."
  },
  {
    number: 3,
    title: "The Supply Run",
    publicObjective: "Gather and securely deliver a massive stockpile of critical resources to the Basecamp supply depot (Iron, Wood, Food, Coal).",
    regenEnabled: true,
    details: "Establish supply lines and ensure collective stockpiles are prepared for harsh Nether expeditions."
  },
  {
    number: 4,
    title: "Into the Fire",
    publicObjective: "Enter the Nether, locate a Nether Fortress, harvest required Blaze Rods, Nether Wart, and return all survivors safely to the Overworld.",
    regenEnabled: true,
    details: "Nether hazards are lethal. Extreme caution is advised when collecting brewing supplies."
  },
  {
    number: 5,
    title: "Blood Debt",
    publicObjective: "Natural regeneration is now permanently disabled! Restock healing potions, protect remaining Golden Apples, and complete a high-risk expedition.",
    regenEnabled: false,
    details: "Eating food no longer restores health! Only potions and precious Golden Apples (max 16 event cap) heal wounds."
  },
  {
    number: 6,
    title: "The Point of No Return",
    publicObjective: "Locate the Stronghold, craft and insert the remaining Eyes of Ender, and activate the End Portal in preparation for the final battle.",
    regenEnabled: false,
    details: "Protect portal supplies from sabotage. Ensure recoverable fallback supplies remain at Basecamp."
  },
  {
    number: 7,
    title: "Last Life",
    publicObjective: "Cross into the End and slay the Ender Dragon before the 3-hour session clock expires! All active survivors who survive achieve victory.",
    regenEnabled: false,
    details: "The final showdown. Only survivors alive when the Dragon falls will claim ultimate victory."
  }
];

/**
 * Secret Mission Templates per Session
 * Categories: Assassin, Saboteur, Deceiver
 */
export const MISSION_TEMPLATES = {
  1: [
    {
      category: "Saboteur",
      title: "Supply Diversion",
      instructions: "Secretly divert or hide at least 16 Iron Ingots or 32 Wood Logs away from the Basecamp supply chests before the session ends.",
      successCriteria: "Successfully hide designated supplies in a hidden cache where teammates cannot recover them during Session 1.",
      failureCondition: "Teammates discover the hidden supplies or the diversion is prevented.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Deceiver",
      title: "The False Trail",
      instructions: "Mislead at least 2 teammates away from the true direction of Basecamp for at least 15 minutes without getting directly exposed.",
      successCriteria: "Convince 2 or more players to travel at least 300 blocks in the wrong direction.",
      failureCondition: "Players discover Basecamp immediately or realize the misdirection before moving away.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Assassin",
      title: "First Blood",
      instructions: "Directly or indirectly cause the death of your assigned target player before they successfully reach Basecamp.",
      successCriteria: "Target player dies while separated from Basecamp.",
      failureCondition: "Target reaches Basecamp safely and survives the entire session.",
      reward: "+1 Life",
      penalty: "-1 Life"
    }
  ],
  2: [
    {
      category: "Saboteur",
      title: "Structural Sabotage",
      instructions: "Disrupt base construction by secretly hiding 32 building blocks or creating a disguised structural vulnerability in the outer wall.",
      successCriteria: "Vulnerability causes a mob breach or base construction checklist fails verification.",
      failureCondition: "Sabotage is repaired before dusk without causing a breach.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Deceiver",
      title: "Dangerous Blueprint",
      instructions: "Persuade the team to build the sleeping quarters in a hazard-prone or mob-accessible location.",
      successCriteria: "Team places beds in an insecure perimeter agreed upon through your suggestion.",
      failureCondition: "Team rejects the suggestion and builds a secure bunker.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Assassin",
      title: "Nightfall Ambush",
      instructions: "Eliminate your assigned target during the nighttime building defense phase.",
      successCriteria: "Target player loses a Life during the nighttime construction hours.",
      failureCondition: "Target survives the entire night without dying.",
      reward: "+1 Life",
      penalty: "-1 Life"
    }
  ],
  3: [
    {
      category: "Saboteur",
      title: "Depleted Depots",
      instructions: "Secretly divert or retain at least 24 Iron Ingots or 32 Coal from the team's public supply depot into an unreachable stash.",
      successCriteria: "Delivery checklist shows a deficit in required resources at session end.",
      failureCondition: "Resources are fully delivered and verified by Admin checklist.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Deceiver",
      title: "Wild Goose Chase",
      instructions: "Convince the mining expedition to explore an unprofitable or flooded cave system for at least 20 minutes.",
      successCriteria: "Mining team spends 20+ minutes in an empty cave system yielding less than 16 iron.",
      failureCondition: "Team discovers rich veins or abandons the cave within 10 minutes.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Assassin",
      title: "Cave Collapse",
      instructions: "Eliminate or trap your assigned target player while deep underground on the resource expedition.",
      successCriteria: "Target player dies underground during Session 3.",
      failureCondition: "Target returns to the surface alive.",
      reward: "+1 Life",
      penalty: "-1 Life"
    }
  ],
  4: [
    {
      category: "Saboteur",
      title: "Blaze Rod Embezzlement",
      instructions: "Secretly withhold or hide at least 4 harvested Blaze Rods from the public brewing cache.",
      successCriteria: "Team fails to deliver the full quota of Blaze Rods to Basecamp.",
      failureCondition: "All harvested Blaze Rods are securely delivered to the base brewing station.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Deceiver",
      title: "Fortress Misdirection",
      instructions: "Lead the expedition into a dangerous Nether Fortress hazard (e.g., Wither Skeleton spawners or lava hazards).",
      successCriteria: "At least one teammate takes severe damage or falls into lava following your navigation.",
      failureCondition: "Expedition navigates the fortress flawlessly without incident.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Assassin",
      title: "Lavafall",
      instructions: "Eliminate your assigned target player inside the Nether dimension.",
      successCriteria: "Target player dies inside the Nether during Session 4.",
      failureCondition: "Target exits the Nether safely and survives the session.",
      reward: "+1 Life",
      penalty: "-1 Life"
    }
  ],
  5: [
    {
      category: "Saboteur",
      title: "Medicine Hoarder",
      instructions: "Hide or divert at least 3 healing potions or 1 Golden Apple from the collective medical chest while natural regen is off.",
      successCriteria: "Medical chest is short of designated emergency healing supplies when an active survivor requests it.",
      failureCondition: "All healing supplies are accounted for in the medical chest.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Deceiver",
      title: "Reckless Expedition",
      instructions: "Persuade the team to venture into a high-danger zone without brewing regeneration or health potions first.",
      successCriteria: "Team engages hostile mobs while at least 2 members are below half health.",
      failureCondition: "Team insists on full healing preparations before leaving base.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Assassin",
      title: "No Recovery",
      instructions: "Eliminate your assigned target player while natural health regeneration is disabled.",
      successCriteria: "Target player dies during Session 5.",
      failureCondition: "Target survives Session 5.",
      reward: "+1 Life",
      penalty: "-1 Life"
    }
  ],
  6: [
    {
      category: "Saboteur",
      title: "Missing Eye",
      instructions: "Secretly withhold, hide, or misplace at least 1 Eye of Ender before the End Portal can be fully activated.",
      successCriteria: "Portal frame is missing at least one Eye of Ender requiring backup search.",
      failureCondition: "End Portal is activated without delay.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Deceiver",
      title: "The Lost Stronghold",
      instructions: "Misguide the team regarding the Eye of Ender trajectory, delaying Stronghold discovery by at least 15 minutes.",
      successCriteria: "Team digs into a false location or delays Stronghold discovery past the halfway mark of the session.",
      failureCondition: "Stronghold is located directly within 30 minutes.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Assassin",
      title: "Threshold Ambush",
      instructions: "Eliminate your target player inside the Stronghold or near the portal room.",
      successCriteria: "Target player dies in the Stronghold.",
      failureCondition: "Target enters the End Portal room alive.",
      reward: "+1 Life",
      penalty: "-1 Life"
    }
  ],
  7: [
    {
      category: "Saboteur",
      title: "Healing Depletion",
      instructions: "Divert or exhaust the final healing and arrow supplies during the Ender Dragon confrontation.",
      successCriteria: "Team runs out of arrows or emergency healing during the Dragon fight.",
      failureCondition: "Dragon is slain with plenty of surplus supplies remaining.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Deceiver",
      title: "Crystal Chaos",
      instructions: "Convince players to rush the Ender Dragon before all End Crystals are neutralized, causing catastrophic explosion damage.",
      successCriteria: "Dragon heals from active crystals or players suffer crystal explosion damage.",
      failureCondition: "All crystals are systematically destroyed from safe range first.",
      reward: "+1 Life",
      penalty: "-1 Life"
    },
    {
      category: "Assassin",
      title: "Final Casualty",
      instructions: "Ensure your assigned target player does not survive the Ender Dragon battle.",
      successCriteria: "Target player dies during Session 7 and is eliminated.",
      failureCondition: "Target survives and celebrates victory over the Ender Dragon.",
      reward: "+1 Life",
      penalty: "-1 Life"
    }
  ]
};
