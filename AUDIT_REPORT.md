# AUDIT REPORT: Gameplay Verification

Starting Audit... (Target: http://localhost:3000/api, Chain: 97, Domain: localhost:5173)

## 1. Single Player Flow Audit

### Creating Player: Player A (0x3e814613733E2C48DB32723a837ad1EAB77d0A48)

- Minting Common Hero for Player A...

  - Minted Hero ID: 169 (Common)

  - Initial XP: 0

- Simulating Solo Game Match...

  - Final XP: 10

  [SUCCESS] XP increased correctly.

## 2. PvP Flow (Serverless Polling)

### Creating Player: Player B (0x3848314e8429a6e0B14502dAc90486Aa684964aE)

### Creating Player: Player C (0xBaf2bcBc5058DeC57E23f63295fa990911BA783d)

- Setting up Player B...

  - Added XP and BCOIN. Hero ID: 174

- Setting up Player C...

  - Added XP and BCOIN. Hero ID: 175

- Both players joining Wager Queue (Tier 1)...

  - Player B join result: 200 Entered Bronze wager queue!

  - Player C join result: 200 Match found for Bronze wager!

- Polling for Match...

  - Polling attempt 1: Status = found

  [SUCCESS] Match Found! Opponent: Ninja Hero

## 3. Rarity Gating Test

### Creating Player: Player D (0xEC11889C30DADEb987313a0BC8c5E232A501A9f0)

- Minting LEGENDARY Hero for Player D...

- Attempting to join PvP Queue with Legendary Hero...

  [SUCCESS] Blocked with 403: BETA RESTRICTION: Only Common Heroes allowed (You tried: Legend)

## 4. House Gating Test

- Minting HOUSE NFT for Player D...

- Attempting to join PvP Queue with House...

  [SUCCESS] Blocked as expected: BETA RESTRICTION: Houses cannot join PvP.

## 5. Tournament Lobby Flow

### Creating Player: TourneyPlayer 1 (0xb4D82608B5Ce1acA755069927dbD384A2e622D86)

### Creating Player: TourneyPlayer 2 (0xE9485E5bb3CAb2fE7084611B4E9eB695E92F42bF)

### Creating Player: TourneyPlayer 3 (0xdece269a2d69D0708d0AF272Dd45CC1E70A75363)

### Creating Player: TourneyPlayer 4 (0x02d04f930ba59BaEB08EA2E57693738799D510dC)

- All 4 players joining Tournament Lobby...

  - TourneyPlayer 1 registered.

    Lobby Status: Waiting (1/4)

  - TourneyPlayer 2 registered.

    Lobby Status: Waiting (2/4)

  - TourneyPlayer 3 registered.

    Lobby Status: Waiting (3/4)

  - TourneyPlayer 4 registered.

    Lobby Status: Ready (4/4)

  [SUCCESS] Lobby became Ready after 4th player.
