# ORANGE PAPER: The Living GDD

> **WARNING:** This document is the SINGLE SOURCE OF TRUTH for game mechanics.
> If the code changes, this document MUST be updated in the same Pull Request.

## 1. Vision & Overview
**Neon Rogue** is a retro-style PvE survival game where players defend against waves of enemies, collect loot, and upgrade their heroes. The core loop involves a "Solo Run" where players test their build against escalating difficulty.

## 2. Economy (Hardcore Model)
The game uses a dual-currency system: **BCOIN** (Premium/Earned) and **Fragments** (Crafting Material).

### Earnings (Session Based)
- **Solo Run Victory:** Awards **50 Account XP** + **Looted Coins** (Session Coins) + **Hero Skill XP** (Manual Training).
- **Boss Defeat:** Bosses drop significant coins (5x normal mob) and XP (3x normal mob).
- **Loot Drop Chance (Soft Blocks):**
  - **Account Level 1-7 (Starter Blocks):** 1 HP, **0% Drop Rate** (Training Wheels).
  - **Account Level 8+ (Standard Soft Blocks):**
    - **Nothing:** 70%
    - **Common Fragment:** 25% (Crafting Material)
    - **BCOIN:** 5% (Premium Currency)
- **Daily Faucet (MVP Feature):**
  - **Action:** Player can claim **5 BCOIN** once every 24 hours.
  - **Constraint:** Strict local timestamp check. UI displays precise countdown "WAIT Xh Ym".
  - **Location:** Profile Modal / Main Menu.
  - **Purpose:** Ensure players have resources to test upgrades daily.

### Spending Costs
- **XP Boost (10 Minutes):**
  - **Effect:** Doubles (2x) ALL XP gains (Summoner Account XP + Hero Skill XP) for 10 minutes.
  - **Cost:** Progressive daily cost.
    - 1st Use: `1.00 BCOIN`
    - 2nd Use: `1.30 BCOIN` (+30%)
    - 3rd Use: `1.69 BCOIN` (+30% compounded)
  - **Reset:** Cost resets to `1.00` every 24 hours.

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

### Global Summoner Buff
- **Effect:** +1% to ALL stats per **Account Level**.
- **Source:** `PlayerStateService.getAccountLevel()`.
- **Scope:** Applies to Speed, HP, and Damage.

### Level Gating (Feature Unlocks)
To prevent overwhelming new players, features are unlocked in stages:
- **Level 1 - 7 (The Grind):**
  - **Unlocked:** Solo Mode (PvE), Heroes Menu (Roster).
  - **Locked:** Forge (Upgrades), Shop (Marketplace).
  - *Goal:* Focus purely on gameplay mechanics and XP accumulation.
- **Level 8+ (The End-Game):**
  - **Unlocked:** ALL Features (Forge, Shop, Trading).
  - **Status:** `isEndGame: true`.
  - **Bonus:** Exclusive drop chance for "Boss Cores" (Ascension Material) in Solo Mode.

## 4. Hero Progression (Manual Training)
The NFT only evolves if used manually. Botting is discouraged by design.

### The 4 Skill Bars (Manual Training)
Each Hero has 4 distinct "Skill XP" pools that fill during gameplay.
- **Speed XP:** Increases with **distance walked**.
- **Fire Rate XP:** Increases with **bombs planted / shots fired**.
- **Range XP:** Increases based on **targets hit / blocks destroyed** per explosion.
- **Power (Damage) XP:** Increases with **total damage dealt** to enemies.

### The 0.01% Rule (Micro-Progress)
Massive upgrades are gone. Every Level gained in a Skill Bar grants a tiny, permanent bonus.
- **Bonus:** +0.01% effectiveness per Skill Level.
- **Forge Training:** Spending **1 BCOIN** at the Eternal Forge grants **+100 Skill XP**, effectively adding **+0.01%** to the chosen stat (Power, Speed, Range, or Fire Rate).
- **Visuals:** UI displays decimals (e.g., "Speed Lvl: 10.42") to show granular progress.
- **Formula:** `EffectiveStat = BaseStat * (1 + (SkillLevel * 0.0001))`.

### Ascension (System V1.0)
- **Concept:** Unlocking higher skill caps by burning Boss Cores.
- **Requirement:**
  1.  **Soft Cap Reached:** The sum of all Skill Levels (Speed + Power + Range + FireRate) must meet the current Cap.
  2.  **Material:** 1x **Boss Core** (Legendary Drop from Level 8+ Bosses).
- **Cost:** `1 Boss Core` + `(100 * (AscensionLevel + 1))` BCOIN.
- **Effect:**
  - **Ascension Level:** Increases by +1.
  - **Unlock:** Increases `MAX_SKILL_LEVEL`, allowing further training.
  - **Visual:** Adds a Star to the Hero Card.

## 5. Solo Mode Mechanics (PvE)
The core gameplay happens in `GameScene.js`.

### Match Rules
- **Duration:** 270 Seconds (4.5 Minutes).
- **Waves:** 30 Waves Total.
- **Wave Quota:** 6 Kills (Base) to advance wave (adjusted dynamically).
- **Boss Fight:** Occurs at **Wave 30**.

### Physics & Controls (Fluid Grid System)
- **Player Hitbox:** Reduced to **20x20px** (offset Y+20) to prevent corner snagging in corridors.
- **Enemy Hitbox:** **Circular Physics** (Radius 11px for Mobs, Radius 36px for Bosses) to enable "Sliding" around corners.
- **Bomb Placement:** Bombs use **Grid Snapping** (Center of 48x48 Tile) to ensure consistent Cross Explosions.

### AI Behavior (Hybrid System)
- **Seek vs Wander:** Enemies use Raycasting to detect Line of Sight (LoS).
  - **Clear LoS:** State = `SEEK` (Move directly to Player).
  - **Blocked LoS:** State = `WANDER` (Move randomly to find a path).
- **Throttling:** AI decision making is throttled to **250ms** for performance.

### Map Generation (Bomberman Survival)
- **Randomized Layout:** The map is procedurally generated every stage.
- **Logic:**
  - The map is filled with Soft Blocks (destructible).
  - Hard Blocks (indestructible) are scattered randomly but **NEVER** block the path completely (Guaranteed Connectivity).
  - A path always exists from Player Spawn to Enemy Spawn, though it may be blocked by Soft Blocks initially.
- **Spawns:**
  - **Player:** Bottom-Left Corner (Safe Zone).
  - **Enemies:** Top-Center (Base/Portal).
- **Block Types:**
  - **Starter Blocks (Level 1-7):** 1 HP, No Loot. Purely for cover/obstacle mechanics.
  - **Standard Blocks (Level 8+):** HP scales, Drops Loot (BCOIN/Fragments).

### Difficulty Scaling
The difficulty multiplier scales exponentially:
- Formula: `TotalDifficulty = StageMultiplier * (1.15 ^ WaveIndex)`
- Example: Wave 1 = 1.15x, Wave 10 = ~4.0x, Wave 30 = ~66.2x.

### Enemy Stats
- **Boss HP:** `5 * (20 * DifficultyMultiplier)`.
  - At Wave 30 (Diff ~66x): `100 * 66 = 6600 HP` (Approx).
- **Leak Penalty:** Enemies reaching the bottom of the screen do NOT cause instant Game Over (Visual Zone only for now). Game Over is triggered only by Player Death or Time Out.

### Boss Mechanics (Task Force: Threat Intelligence)
Bosses appear at **Waves 10, 20, and 30**. They are "GIGANTE" (3x Scale) and possess unique AI.

- **Scale:** 3x Normal Mob (96px Visual, 72px Hitbox).
- **Skills:**
  1.  **Shooting:** Fires a magma projectile at the player every 2 seconds.
  2.  **Summoning:** Summons 2 common minions near itself every 8 seconds.
- **Enrage Mode (Phase 2):**
  - **Trigger:** HP drops below 50%.
  - **Visual:** Boss turns Red-Orange (`0xff4500`) and roars.
  - **Buffs:**
    - Movement Speed: +50%.
    - Shooting Speed: 2x (Every 1 second).

## 6. Combat Formulas (`GameScene.js`)
Hero stats are derived from base NFT metadata, Skill Levels (Manual Training), and Account Buffs.

- **Damage (POW):** `(10 * HeroPOW) + AccountLevel` * `(1 + PowerSkillLevel * 0.0001)`
- **Speed (SPD):** `160 + (AccountLevel * 5)` (Capped at 300). **Note:** Speed is strictly tied to Account Level and cannot be trained manually.
- **Max HP:** `(BaseStamina * 100)` * `(1 + AccountLevel * 0.01)`
- **Bomb Range (RNG):** `HeroRNG` * `(1 + RangeSkillLevel * 0.0001)`
- **Fire Rate:** `BaseFireRate` * `(1 - FireRateSkillLevel * 0.0001)` (Lower is faster)

## 7. Spells & Abilities
Spells are special modifiers attached to heroes.

- **Multishot (`multishot`):**
  - **Effect:** Fires **3 Parallel Projectiles** aligned to grid lanes (Center, Left, Right).
  - **Constraint:** Projectiles travel in strict straight lines (0, 90, 180, 270 degrees). No diagonals.
  - **Logic:** `GameScene.fireMultishot`.

- **Freeze Bomb (`freeze_bomb`):**
  - **Effect:** Freezes enemies within the explosion area for **2 seconds**.
  - **Logic:** The freeze area strictly follows the **Cross Pattern** of the explosion rays.
  - **Implementation:** `CollisionHandler.applyFreeze` / `GameScene.triggerExplosion`.

- **Poison Bomb (`poison_bomb`):**
  - **Effect:** Applies a green tint and Damage-over-Time (DoT).
  - **Damage:** 3 Ticks of `5% MaxHP` (or 1 dmg min) over 3 seconds.
  - **Logic:** `CollisionHandler.applyPoison`.

## 8. Analytics & Admin Tools
To facilitate balancing, the Admin Panel tracks key metrics:
- **Summoner Level:** Current account progression.
- **Economy:** Total BCOIN Earned vs. Spent.
- **Engagement:** Days Logged In.
