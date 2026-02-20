# Supabase Schema Documentation (The Ledger)

This document outlines the database schema required for the **Task Force: Web 2.5 Supabase Migration**. The schema is designed to support the Hybrid Architecture (Direct Read, API Write) and is aligned with the existing `backend/database.js` models.

## Core Tables

### 1. Users (`users`)

Stores player account information and global progression.

| Column Name       | Type          | Constraints                 | Description                                   |
| :---------------- | :------------ | :-------------------------- | :-------------------------------------------- |
| `id`              | `int8`        | Primary Key, Auto Increment | Unique user identifier.                       |
| `wallet_address`  | `text`        | Unique, Not Null            | The player's Web3 wallet address (lowercase). |
| `coins`           | `int4`        | Default: 1000               | The player's BCOIN balance.                   |
| `account_level`   | `int4`        | Default: 1                  | The Summoner's Level (Account Level).         |
| `account_xp`      | `int4`        | Default: 0                  | Current XP towards next Account Level.        |
| `max_score`       | `int4`        | Default: 0                  | Legacy high score tracking.                   |
| `flagged_cheater` | `bool`        | Default: false              | Anti-cheat flag.                              |
| `created_at`      | `timestamptz` | Default: now()              | Account creation timestamp.                   |

### 2. Heroes (`heroes`)

Stores NFT and Non-NFT hero data.

| Column Name    | Type          | Constraints                                                        | Description                                         |
| :------------- | :------------ | :----------------------------------------------------------------- | :-------------------------------------------------- |
| `id`           | `int8`        | Primary Key, Auto Increment                                        | Unique hero instance identifier.                    |
| `user_id`      | `int8`        | Foreign Key (`users.id`), On Delete CASCADE                        | The owner of the hero.                              |
| `hero_type`    | `text`        | Check: `'mock'`, `'nft'`                                           | Distinguishes between trial heroes and minted NFTs. |
| `nft_id`       | `int4`        | Nullable                                                           | The on-chain ID (Token ID) if minted.               |
| `level`        | `int4`        | Default: 1                                                         | The hero's level (upgraded via Forge).              |
| `xp`           | `int4`        | Default: 0                                                         | Current XP towards next Hero Level.                 |
| `rarity`       | `text`        | Check: `'Common'`, `'Rare'`, `'Super Rare'`, `'Legend'`, `'House'` | The rarity tier of the hero.                        |
| `max_stage`    | `int4`        | Default: 1                                                         | The highest stage this hero has unlocked.           |
| `status`       | `text`        | Default: `'in_wallet'`                                             | Status: `'in_wallet'`, `'staked'`, `'market'`.      |
| `hp`           | `int4`        | Default: 100                                                       | Base Health Points.                                 |
| `damage`       | `int4`        | Default: 1                                                         | Base Damage.                                        |
| `speed`        | `int4`        | Default: 200                                                       | Movement Speed.                                     |
| `bomb_size`    | `float4`      | Default: 1.0                                                       | Explosion Radius Multiplier.                        |
| `sprite_name`  | `text`        | Nullable                                                           | Reference to the visual asset (e.g., `hero_s1_c2`). |
| `last_updated` | `timestamptz` | Default: now()                                                     | Last modification timestamp.                        |

### 3. Inventory (`user_items` & `items`)

Manages fungible items (Fragments, Potions, Materials).

#### Items Catalog (`items`)

Defines the base properties of items.

| Column Name | Type   | Constraints                 | Description                                                       |
| :---------- | :----- | :-------------------------- | :---------------------------------------------------------------- |
| `id`        | `int8` | Primary Key, Auto Increment | Unique item definition ID.                                        |
| `name`      | `text` | Not Null                    | Display name (e.g., 'Common Fragment').                           |
| `type`      | `text` | Not Null                    | Category: `'weapon'`, `'consumable'`, `'material'`, `'fragment'`. |
| `rarity`    | `text` | Default: `'Common'`         | Rarity tier.                                                      |
| `image_url` | `text` | Nullable                    | Asset path.                                                       |

#### User Inventory (`user_items`)

Links users to items with quantities.

| Column Name | Type   | Constraints                 | Description                           |
| :---------- | :----- | :-------------------------- | :------------------------------------ |
| `id`        | `int8` | Primary Key, Auto Increment | Unique inventory slot ID.             |
| `user_id`   | `int8` | Foreign Key (`users.id`)    | The owner.                            |
| `item_id`   | `int8` | Foreign Key (`items.id`)    | Reference to the item definition.     |
| `quantity`  | `int4` | Default: 1                  | Amount held.                          |
| `equipped`  | `bool` | Default: false              | Whether the item is currently in use. |

### 4. Bestiary (`user_bestiary`)

Tracks player kills per enemy type.

| Column Name  | Type   | Constraints                 | Description                                         |
| :----------- | :----- | :-------------------------- | :-------------------------------------------------- |
| `id`         | `int8` | Primary Key, Auto Increment | Unique record ID.                                   |
| `user_id`    | `int8` | Foreign Key (`users.id`)    | The player.                                         |
| `enemy_type` | `text` | Not Null                    | The enemy identifier (e.g., `'slime'`, `'goblin'`). |
| `kill_count` | `int4` | Default: 0                  | Total confirmed kills.                              |

---

## Security Policy (RLS) - Phase 1 (MVP)

- **Enable Row Level Security (RLS)**: Yes, on all tables.
- **Policy**: Allow `SELECT` for `anon` role (Public Read) based on `wallet_address` knowledge (Implicit Security).
- **Policy**: Allow `INSERT/UPDATE/DELETE` **ONLY** for `service_role` (Backend Node API).

## Notes

- **Currency**: `bcoin` in frontend is mapped to `coins` in the `users` table.
- **Rarity Mapping**: Frontend uses Integer Rarity (0-5), Database uses String Rarity ('Common', 'Rare', etc.). The `PlayerStateService` adapter handles this conversion.
