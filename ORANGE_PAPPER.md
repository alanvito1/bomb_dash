# ORANGE PAPER: The Living GDD

> **WARNING:** This document is the SINGLE SOURCE OF TRUTH for game mechanics.
> If the code changes, this document MUST be updated in the same Pull Request.

## 1. Vision & Overview
**Neon Rogue** is a retro-style PvE survival game where players defend against waves of enemies, collect loot, and upgrade their heroes. The core loop involves a "Solo Run" where players test their build against escalating difficulty.

## 2. Economy (Mock Tokenomics)
The game uses a dual-currency system: **BCOIN** (Premium/Earned) and **Fragments** (Crafting Material).

### Earnings
- **Solo Run Victory:** Awards **50 Account XP** + **Looted Coins** (Session Coins).
- **Boss Defeat:** Bosses drop significant coins (5x normal mob) and XP (3x normal mob).
- **Loot Drop Chance (Soft Blocks):**
  - **Nothing:** 70%
  - **Common Fragment:** 25% (Crafting Material)
  - **BCOIN:** 5% (Premium Currency)
- **Daily Faucet (MVP Feature):**
  - **Action:** Player can claim **5 BCOIN** once every 24 hours.
  - **Location:** Profile Modal / Main Menu.
  - **Purpose:** Ensure players have resources to test Forge upgrades daily.

### Spending Costs
- **Hero Level Up (Eternal Forge):**
  - **Cost:** `1 BCOIN` + `50 Common Fragments` per level.
  - *Note: Guest Mode currently mocks fragment costs but enforces BCOIN.*

- **Spell Reroll (Heroes Modal):**
  - **Cost:** **FREE** (Mock API returns success immediately for MVP).
  - **UI Display:** `1000 BCOIN`.

## 3. Summoner Progression (Metagame)
The account level dictates feature access and global power.

### Hardcore XP Curve
Leveling up is designed to be exponential and punitive, inspired by classic MMOs (e.g., Tibia x2).
- **Formula:** `XP_Required = 1000 * (1.5 ^ Level)`
- **Progression:**
  - Level 1 -> 2: Fast.
  - Level 8 -> 9: Requires days of grind.

### Level Gating (Feature Unlocks)
To prevent overwhelming new players, features are unlocked in stages:
- **Level 1 - 7 (The Grind):**
  - **Unlocked:** Solo Mode (PvE), Heroes Menu (Roster).
  - **Locked:** Forge (Upgrades), Shop (Marketplace).
  - *Goal:* Focus purely on gameplay mechanics and XP accumulation.
- **Level 8+ (The End-Game):**
  - **Unlocked:** ALL Features (Forge, Shop, Trading).
  - **Status:** `isEndGame: true`.
  - **Bonus:** Exclusive drop chance for "Rare Items" (e.g., Boss Fragments) in Solo Mode.

## 4. Solo Mode Mechanics (PvE)
The core gameplay happens in `GameScene.js`.

### Match Rules
- **Duration:** 270 Seconds (4.5 Minutes).
- **Waves:** 30 Waves Total.
- **Wave Quota:** 6 Kills (Base) to advance wave (adjusted dynamically).
- **Boss Fight:** Occurs at **Wave 30**.

### Physics & Controls (Fluid Grid System)
- **Player Hitbox:** Reduced to **20x20px** (offset Y+20) to prevent corner snagging in corridors.
- **Enemy Hitbox:** Reduced by ~25% (24x24px for Mobs, 48x48px for Bosses) for better AI navigation.
- **Bomb Placement:** Bombs use **Grid Snapping** (Center of 48x48 Tile) to ensure consistent Cross Explosions.

### Difficulty Scaling
The difficulty multiplier scales exponentially:
- Formula: `TotalDifficulty = StageMultiplier * (1.15 ^ WaveIndex)`
- Example: Wave 1 = 1.15x, Wave 10 = ~4.0x, Wave 30 = ~66.2x.

### Enemy Stats
- **Boss HP:** `5 * (20 * DifficultyMultiplier)`.
  - At Wave 30 (Diff ~66x): `100 * 66 = 6600 HP` (Approx).
- **Leak Penalty:** If an enemy passes the bottom screen edge, it deals damage equal to its remaining HP to the player.

## 5. NFT Attributes (Hero Stats)
Hero stats are derived from base NFT metadata and scaled by Level and Account Buffs.

### Combat Formulas (`GameScene.js`)
- **Damage (POW):** `(10 * HeroPOW) + AccountLevel`
  - *Base Bomb Damage:* 10
  - *Hero POW:* From NFT Stats.
  - *Account Level:* Flat bonus.
- **Speed (SPD):** `(150 + BaseSpeed * 10) * (1 + (Level - 1) * 0.02) * GlobalBuff`
- **Max HP:** `(BaseStamina * 100) * GlobalBuff`
- **Bomb Range (RNG):** `HeroRNG` (Strict NFT Stat)
  - *Logic:* Explosion covers Center + `RNG` tiles in each direction (Up, Down, Left, Right).

### Global Summoner Buff
- **Effect:** +1% to ALL stats per **Account Level**.
- **Source:** `PlayerStateService.getAccountLevel()`.
- *Note:* Currently applies to Speed and HP. Damage uses the specific formula above. Range is strict.

## 6. Spells & Abilities
Spells are special modifiers attached to heroes.

- **Multishot (`multishot`):**
  - **Effect:** Increases projectile count by 2 (Fires 3 bombs total in a spread).
  - **Logic:** `Bomb.js` / `GameScene.fireBomb`.

- **Poison Bomb (`poison_bomb`):**
  - **Effect:** Applies a green tint and Damage-over-Time (DoT).
  - **Damage:** 3 Ticks of `5% MaxHP` (or 1 dmg min) over 3 seconds.
  - **Logic:** `CollisionHandler.applyPoison`.

## 7. Analytics & Admin Tools
To facilitate balancing, the Admin Panel tracks key metrics:
- **Summoner Level:** Current account progression.
- **Economy:** Total BCOIN Earned vs. Spent.
- **Engagement:** Days Logged In.
