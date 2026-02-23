# AGENTS.md

## The Golden Rule: ORANGE PAPER
The file `ORANGE_PAPPER.md` in the root directory is the **Living Game Design Document (GDD)** and the **Source of Truth** for all game mechanics.

**Rule:** Whenever you modify any `.js` file that changes:
1.  **Combat Mechanics** (Damage, HP, Speed, Ranges, Formulas).
2.  **Economy** (Costs, Earnings, Drop Rates).
3.  **Game Rules** (Match duration, Wave counts, Quotas).
4.  **NFT Attributes** or **Spells**.

**You MUST open `ORANGE_PAPPER.md` in the same Pull Request/Commit and update it to reflect the new code reality.**

This ensures documentation never drifts from the codebase.
