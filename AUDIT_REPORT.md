# AUDIT REPORT: Gameplay Verification

Starting Audit... (Target: http://localhost:3000/api, Chain: 97, Domain: localhost:5173)


## 1. Single Player Flow Audit

### Creating Player: Player A (0x2002aD584D57b2799A060ca328029F523D75F1DF)

* Minting Common Hero for Player A...

  - Minted Hero ID: 94 (Common)

  - Initial XP: 0

* Simulating Solo Game Match...

  - Final XP: 10

  [SUCCESS] XP increased correctly.


## 2. PvP Flow (Serverless Polling)

### Creating Player: Player B (0x701F5D3c9DeDE5013F9264dbC9af047A75bFA7C0)

### Creating Player: Player C (0xD865bc3043362957E6F2914c34502e0C1b8843bE)

* Setting up Player B...

  - Added XP and BCOIN. Hero ID: 99

* Setting up Player C...

  - Added XP and BCOIN. Hero ID: 100

* Both players joining Wager Queue (Tier 1)...

  - Player B join result: 200 Entered Bronze wager queue!

  - Player C join result: 200 Match found for Bronze wager!

* Polling for Match...

  - Polling attempt 1: Status = found

  [SUCCESS] Match Found! Opponent: undefined


## 3. Rarity Gating Test

### Creating Player: Player D (0x66E1290Ae45acad76DC6bEC0bE531cf15E4e87Ba)

* Minting LEGENDARY Hero for Player D...

* Attempting to join PvP Queue with Legendary Hero...

  [SUCCESS] Blocked with 403: BETA RESTRICTION: Only Common Heroes allowed (You tried: Legend)


## 4. House Gating Test

* Minting HOUSE NFT for Player D...

* Attempting to join PvP Queue with House...

  [SUCCESS] Blocked as expected: BETA RESTRICTION: Houses cannot join PvP.


## 5. Tournament Lobby Flow

### Creating Player: TourneyPlayer 1 (0x314e8849dDd435c8AeffF0bC908B1a1610ff7dA7)

### Creating Player: TourneyPlayer 2 (0x7aF1F289900782e11b7FCFC1a07d4547059a8A1e)

### Creating Player: TourneyPlayer 3 (0xA4f4a0A201CD399c6DaE21285AEB08602ca33Aa2)

### Creating Player: TourneyPlayer 4 (0x38ad856dA4439C0B0323db7dD3d4bb6D919e4f17)

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
