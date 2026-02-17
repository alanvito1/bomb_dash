# AUDIT REPORT: Gameplay Verification

Starting Audit... (Target: http://localhost:3000/api, Chain: 97, Domain: localhost:5173)


## 1. Single Player Flow Audit

### Creating Player: Player A (0xA8fb11B020b2C872bb7be0de585983Dd70895F46)

* Minting Common Hero for Player A...

  - Minted Hero ID: 119 (Common)

  - Initial XP: 0

* Simulating Solo Game Match...

  - Final XP: 10

  [SUCCESS] XP increased correctly.


## 2. PvP Flow (Serverless Polling)

### Creating Player: Player B (0x9eEf7E5B7bcB2Db5EdEfe8a028BdCC519AB326DD)

### Creating Player: Player C (0x851E54A8a1204d74691a586Cb3c7837c693B7f1F)

* Setting up Player B...

  - Added XP and BCOIN. Hero ID: 124

* Setting up Player C...

  - Added XP and BCOIN. Hero ID: 125

* Both players joining Wager Queue (Tier 1)...

  - Player B join result: 200 Entered Bronze wager queue!

  - Player C join result: 200 Match found for Bronze wager!

* Polling for Match...

  - Polling attempt 1: Status = found

  [SUCCESS] Match Found! Opponent: undefined


## 3. Rarity Gating Test

### Creating Player: Player D (0x9A8Fc428B2D722aA156705e78BA966d3d8f26d07)

* Minting LEGENDARY Hero for Player D...

* Attempting to join PvP Queue with Legendary Hero...

  [SUCCESS] Blocked with 403: BETA RESTRICTION: Only Common Heroes allowed (You tried: Legend)


## 4. House Gating Test

* Minting HOUSE NFT for Player D...

* Attempting to join PvP Queue with House...

  [SUCCESS] Blocked as expected: BETA RESTRICTION: Houses cannot join PvP.


## 5. Tournament Lobby Flow

### Creating Player: TourneyPlayer 1 (0x5b50abc45cE86Fef48046207FC563d0E711C6aC2)

### Creating Player: TourneyPlayer 2 (0x76dAD310C6a6e333920DB0f290fEcdf52E6A30f7)

### Creating Player: TourneyPlayer 3 (0x1676eC4E486cc855f39507eF56222E48846AF61A)

### Creating Player: TourneyPlayer 4 (0xFC5B236B41C3b43C935d32138f74E6e72e560051)

* All 4 players joining Tournament Lobby...

  - TourneyPlayer 1 registered.

    Lobby Status: Waiting (1/4)

  - TourneyPlayer 2 registered.

    Lobby Status: Waiting (2/4)

  - TourneyPlayer 3 registered.

    Lobby Status: Waiting (3/4)

  - TourneyPlayer 4 registered.

    Lobby Status: Ready (4/4)

  [SUCCESS] Lobby became Ready after 4th player.
