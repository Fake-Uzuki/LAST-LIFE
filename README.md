# LAST LIFE: 7-Session Survival Add-on

> **Official Minecraft Bedrock Add-on for a 7-Day Multiplayer Survival Event**  
> **Creator:** TheDarkLight836  
> **Target Version:** Minecraft Bedrock Edition 1.20.80+ / 1.21+  
> **Package:** `dist/LAST-LIFE.mcaddon`

---

## 1. Overview & Official Branding

**LAST LIFE** is an event add-on for Minecraft Bedrock Edition designed for high-stakes, 7-session multiplayer survival. Across seven real-world days (with sessions up to 3 hours each), survivors compete to stay alive, uncover secret impostors, manage scarce healing supplies, survive the deadly armor curse, and ultimately slay the Ender Dragon.

- **Creator:** TheDarkLight836
- **Add-on Name:** LAST LIFE
- **Official Logo:** Uses TheDarkLight836's official artwork (`Pfp(1).png`), preserved with original colors and character framing, formatted as 512×512 `pack_icon.png` in both Behavior and Resource packs.

---

## 2. Event Progression & The 7 Sessions

| Session | Title | Natural Regen | Public Challenge | Secret Impostor Tasks |
|:---:|:---|:---:|:---|:---|
| **1** | **The Lost** | Enabled | Survivors spawn scattered across the world with coordinates hidden. Must locate Basecamp, reunite, and pool survival supplies. | Hide supplies, mislead teammates about terrain, eliminate isolated survivor. |
| **2** | **Build or Die** | Enabled | Construct a fortified communal fortress: crafting station, storage depot, sustainable food farm, and secure sleeping bunker. | Divert construction blocks, create defensive weak points, eliminate survivor at dusk. |
| **3** | **The Supply Run** | Enabled | Gather and deliver critical stockpiles of iron, wood, coal, and food to the Basecamp supply depot. | Divert delivery quotas, misdirect mining expeditions to empty caves, trap miners. |
| **4** | **Into the Fire** | Enabled | Venture into the Nether, secure Blaze Rods and brewing ingredients from a Fortress, and return safely. | Embezzle Blaze Rods, misdirect team into fortress hazards or lavafalls. |
| **5** | **Blood Debt** | **DISABLED** | Natural regeneration is shut off. Restock emergency healing potions and medical chests; complete high-hazard expedition. | Divert healing potions or Golden Apples, lure low-health teammates into combat. |
| **6** | **Point of No Return**| **DISABLED** | Locate the Stronghold, secure remaining Eyes of Ender, and activate the End Portal. | Withhold an Eye of Ender, mislead Stronghold navigation, ambush at portal threshold. |
| **7** | **Last Life** | **DISABLED** | Enter The End and slay the Ender Dragon before the session timer expires! Active survivors alive upon victory win. | Sabotage crystal timing, divert final healing items, prevent designated target from surviving. |

---

## 3. Core Survival Mechanics

### Cursed Armor
- **0.5 Hearts Damage Every Second:** Equipping **any** piece of armor (Helmet, Chestplate, Leggings, Boots, or Elytra) inflicts 1 point of magic damage every second.
- **Single-Damage Rule:** Armor damage is flat and does **not** multiply when wearing multiple pieces (wearing 1 piece or 4 pieces inflicts exactly 0.5 hearts/second).
- **Instant Removal:** Unequipping all armor immediately halts the curse.
- **Ordinary Protection Retained:** Armor still protects against ordinary mob and environmental attacks, making armor an intense tactical trade-off.
- **Unblockable Curse:** Curse damage utilizes `magic` damage to ensure enchantment and armor defense cannot negate the self-inflicted damage.
- **Shields Allowed:** Shields equipped in the offhand slot are permitted and **never** trigger the armor curse.
- **Totems of Undying Prohibited:** Totems bypass the event's core survival penalties and are immediately confiscated upon detection.
- **Elytra Prohibited/Cursed:** Elytra in the chest slot is treated as cursed equipment and triggers continuous damage.

### Lives & Elimination System
- **Starting Lives:** Every player begins with **3 Lives**.
- **Death Deduction:** Dying for any reason deducts **1 Life**.
- **Maximum Cap:** Players may hold a maximum of **5 Lives** (rewards and transfers cannot exceed this cap).
- **Elimination at Zero Lives:** When a player drops to **0 Lives**, they are permanently eliminated from active play and transitioned into a **Ghost Spectator** (`gamemode spectator`).
- **Ghost Rules:** Ghosts cannot interact with the world, cannot vote, and are restricted from leaking private assignments, spectator info, or locations to active players.
- **Winning Eligibility:** Only players who remain **active survivors** (Lives > 0) when the Ender Dragon is slain in Session 7 achieve ultimate victory.

### Life Transfers (Donations)
- Active players can voluntarily donate a Life to another active survivor via the interactive menu:
  - **Donor Rule:** The donor must have at least 2 Lives (cannot drop below 1 Life).
  - **Recipient Rule:** The recipient must have fewer than 5 Lives.
  - **Ghost Restriction:** Neither donors nor recipients can be Ghosts.
  - **Zero Duplication:** Transfers are atomic and cannot generate new Lives out of thin air.

### Healing & Golden Apple Limits
- **Sessions 1–4:** Natural regeneration from food is enabled.
- **Sessions 5–7:** Natural health regeneration from food is **disabled** (`gamerule naturalregeneration false`). Food still restores hunger bars and sprinting.
- **Potions Allowed:** Standard brewed healing and regeneration potions are permitted.
- **16 Golden Apples for the ENTIRE Event:** Ordinary Golden Apples are strictly limited to **16 across all players for the whole 7-day event**. When the 16-apple quota is exhausted, further apples are nullified.
- **Enchanted Golden Apples Banned:** Enchanted (God/Notch) Golden Apples are strictly prohibited and blocked from consumption.

---

## 4. Special Last-Life PvP & Recruitment

### Last-Life State (Exactly 1 Life)
- Any player with **exactly 1 Life** enters the **Last-Life** state.
- **Initiation Rights:** Last-Life players are permitted to initiate PvP attacks against any other player.
- **Restriction on >1 Life Players:** Players with 2+ Lives **cannot** initiate attacks against Last-Life players or fellow innocent survivors.

### 30-Second Retaliation Window
- If a Last-Life player attacks a survivor who has >1 Life:
  - The defender is granted an automatic **30-second self-defense retaliation window**.
  - Retaliation is strictly restricted to the **specific attacker** who initiated combat.
  - The defender cannot attack unrelated players.
  - Once 30 seconds expire, self-defense permission ends.

### Alliance Recruitment by Kills
- When a Last-Life player scores a verified PvP kill against an active survivor, they unlock an **Alliance Recruitment Opportunity** (default: 1 successful recruit per session).
- **Voluntary Allegiance:** The killer sends an invitation to an eligible survivor. The recipient may **Accept** or **Decline**.
- Recruited allies share combat cooperation but retain their own individual survival rules and victory eligibility.
- Eliminated Ghosts cannot be recruited.

---

## 5. Impostor Missions & Verification

At the beginning of each session, 1 or 2 active survivors are secretly designated as **Impostors**:
- **3 Mission Categories:**
  1. **Assassin:** Eliminate or cause the demise of an assigned target survivor.
  2. **Saboteur:** Withhold, divert, or hide critical supplies or progression items.
  3. **Deceiver:** Lead teammates astray, cause hazard traps, or mislead navigation.
- **Privacy:** Private mission instructions, targets, success criteria, and deadlines are only viewable by the assigned player inside their `LAST LIFE Menu`.
- **Admin Verification:** At the end of each session, admins review recorded evidence and assign an auditable status:
  - **Completed:** +1 Life reward (subject to voting outcomes).
  - **Failed:** -1 Life penalty.
  - **Invalidated:** 0 Life change (in the event of external technical disruptions).

---

## 6. End-of-Session Voting

When a session concludes, the voting protocol begins:
1. **Discussion Period:** Survivors converse and review suspicious activities and supply shortages.
2. **Private Balloting:** Eligible active survivors (who are not impostors and not ghosts) cast private ballots for up to 2 suspects via the menu.
3. **Threshold to Catch:** An impostor is caught **strictly if they receive votes from more than half (>50%) of eligible voters** (`votes > totalVoters / 2`).
4. **Tie / Insufficient Votes:** Ties or votes ≤ 50% result in nobody being caught.
5. **Innocent Protection:** Innocent survivors receiving votes **never** lose a Life.
6. **Settlement:**
   - A caught impostor loses **1 Life** instead of receiving a reward.
   - A successful un-caught impostor gains **+1 Life** (capped at 5).
   - A failed impostor loses **-1 Life** (no double penalty).
7. **The Grand Reveal:** Impostor identities, mission outcomes, and vote tallies are broadcast to all players.

---

## 7. Interactive Interfaces

### Player Interface
Accessible via right-clicking the **Menu Compass** or typing `/scriptevent lastlife:menu`:
- View current Lives and visual heart display (`❤❤❤♡♡ 3/5`).
- Session number, status, and remaining session countdown.
- Public challenge instructions.
- Secret Impostor assignment (only visible if assigned).
- Life Donation portal.
- Alliance Recruitment sender/receiver dialogs.
- Event rules handbook.

### Admin Dashboard
Accessible by players with tag `admin` or op:
- **Session Controls:** Start, Pause, Resume, End, and Switch Session (1–7).
- **Player & Lives Manager:** Modify Lives, force Ghost mode, or revive survivors.
- **Mission Verification:** Inspect all secret missions, review evidence logs, and verify outcomes.
- **Voting Manager:** Open discussion, open ballots, compute tallies, settle lives, and trigger Grand Reveal.
- **Golden Apple Supply:** Monitor consumption counter and adjust/restock event limits.
- **Audit Event Logs:** Browse real-time combat, death, and administrative logs.

---

## 8. Installation & Server Setup

### A. Installing the Add-on
1. Double-click or import `dist/LAST-LIFE.mcaddon` into Minecraft Bedrock Edition.
2. In your World Settings:
   - Apply **LAST LIFE (Behavior)** under Behavior Packs.
   - Apply **LAST LIFE (Resource)** under Resource Packs.
3. Under **Experiments**, enable:
   - **Beta APIs** (required for Bedrock Script API `@minecraft/server` and `@minecraft/server-ui`).

### B. Admin Setup
To grant administrator access to the event host, run:
```mcfunction
/tag @s add admin
```
To open the Admin Panel:
- Right-click the **LAST LIFE Menu Compass**, or
- Run command: `/scriptevent lastlife:admin`

### C. Freezing World Progression Outside Sessions
Between the scheduled 3-hour sessions, server hosts should freeze world simulation:
- **Dedicated Servers:** Stop or pause the Bedrock Dedicated Server (BDS) process.
- **Singleplayer / Realms:** Set game rules to halt time and tick progression:
  ```mcfunction
  /gamerule doDaylightCycle false
  /gamerule randomTickSpeed 0
  /gamerule doMobSpawning false
  ```
  Restore standard values (`randomTickSpeed 1`, `doDaylightCycle true`, `doMobSpawning true`) when launching the next session.

### D. Proximity Voice Chat Note
Behavior packs cannot provide in-engine proximity audio without external network proxies. Recommended compatible voice chat integrations:
- **Simple Voice Chat (Bedrock proxy integration)**
- **Plasmo Voice Bedrock**
- **Discord Mumble / TeamSpeak spatial audio channels**

---

## 9. Verification & Automated Testing

A full automated verification test suite is included in the project:
```bash
npm test
```
Tests verified:
- `Armor Curse:` 0 armor = 0 dmg; 1 armor = 1 dmg; 4 armor = flat 1 dmg (no stacking); shields = 0 dmg; totems blocked; elytra cursed.
- `Lives System:` 3 initial lives; death deduction; elimination at 0; max 5 cap; transfer constraints (donor keeps ≥ 1, recipient < 5).
- `Healing & Golden Apples:` Natural regen toggles by session; 16 apple event quota; enchanted apples blocked.
- `Voting Tallies:` Strictly >50% threshold to catch; tie handling; innocent protection; caught impostor penalty; evading reward.
- `Last-Life PvP:` 1-life initiation; 30s retaliation expiration; kill-based recruitment; ghost recruitment restriction.
- `Syntax Validation:` 100% valid ES module syntax across all script files.

---

## 10. File Structure

```
lives/
├── Pfp(1).png                     # Official Creator Artwork / Logo
├── BP/                            # Behavior Pack
│   ├── manifest.json              # UUIDs & Script entry
│   ├── pack_icon.png              # 512x512 Resized Official Logo
│   └── scripts/
│       ├── main.js                # Core events & tick listeners
│       ├── config.js              # Event settings, 7 sessions, mission pool
│       ├── state.js               # DynamicProperty world & player persistence
│       ├── sessionManager.js      # Session lifecycle, timer, challenges
│       ├── livesManager.js        # Lives tracking, deductions, donations
│       ├── armorCurseManager.js   # Cursed armor & prohibited items
│       ├── healingManager.js      # Natural regen & 16-apple limiter
│       ├── impostorManager.js     # Secret missions & evidence tracking
│       ├── pvpManager.js          # Last-life PvP, retaliation & recruitment
│       ├── votingManager.js       # Ballots, tally & Grand Reveal
│       ├── logger.js              # Auditable persistent event logger
│       └── ui/
│           ├── playerMenu.js      # Survivor menu & forms
│           └── adminMenu.js       # Admin console & verification
├── RP/                            # Resource Pack
│   ├── manifest.json              # Resource manifest & dependencies
│   ├── pack_icon.png              # 512x512 Resized Official Logo
│   └── texts/
│       ├── en_US.lang             # Localization
│       └── languages.json
├── test/
│   ├── test-mechanics.js          # Unit & integration test suite
│   └── syntax-check.js           # ES module syntax validator
├── scripts/
│   ├── package-addon.ps1          # .mcaddon packager script
│   └── resize-icon.ps1            # High-fidelity icon resizer
├── dist/
│   ├── LAST-LIFE.mcaddon          # Distributable ready-to-import add-on
│   ├── LAST_LIFE_BP.mcpack        # Standalone Behavior Pack
│   └── LAST_LIFE_RP.mcpack        # Standalone Resource Pack
├── package.json
└── README.md
```

---

## 11. License & Credits

- **Add-on Design & Development:** TheDarkLight836
- **Logo Artwork:** TheDarkLight836
- **License:** MIT
