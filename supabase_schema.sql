-- Drop existing tables if they exist (clean slate for initial setup)
DROP TABLE IF EXISTS "solo_game_history" CASCADE;
DROP TABLE IF EXISTS "altar_donations" CASCADE;
DROP TABLE IF EXISTS "altar_status" CASCADE;
DROP TABLE IF EXISTS "matchmaking_queue" CASCADE;
DROP TABLE IF EXISTS "player_checkpoints" CASCADE;
DROP TABLE IF EXISTS "wager_matches" CASCADE;
DROP TABLE IF EXISTS "game_settings" CASCADE;
DROP TABLE IF EXISTS "wager_tiers" CASCADE;
DROP TABLE IF EXISTS "heroes" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- 1. Users Table
CREATE TABLE "users" (
    "id" SERIAL PRIMARY KEY,
    "wallet_address" VARCHAR(255) NOT NULL UNIQUE,
    "max_score" INTEGER DEFAULT 0,
    "account_level" INTEGER DEFAULT 1,
    "account_xp" INTEGER DEFAULT 0,
    "coins" INTEGER DEFAULT 1000,
    "last_score_timestamp" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Heroes Table
CREATE TABLE "heroes" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER REFERENCES "users" ("id") ON DELETE CASCADE,
    "hero_type" VARCHAR(50) NOT NULL CHECK (hero_type IN ('mock', 'nft')),
    "nft_id" INTEGER,
    "level" INTEGER DEFAULT 1,
    "xp" INTEGER DEFAULT 0,
    "hp" INTEGER DEFAULT 100,
    "maxHp" INTEGER DEFAULT 100,
    "damage" INTEGER DEFAULT 1,
    "speed" INTEGER DEFAULT 200,
    "extraLives" INTEGER DEFAULT 1,
    "fireRate" INTEGER DEFAULT 600,
    "bombSize" REAL DEFAULT 1.0,
    "multiShot" INTEGER DEFAULT 0,
    "sprite_name" VARCHAR(255),
    "status" VARCHAR(50) DEFAULT 'in_wallet' NOT NULL CHECK (status IN ('in_wallet', 'staked')),
    "last_updated" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE ("user_id", "nft_id") -- Ensure unique NFT per user if nft_id is set
);

-- 3. Wager Tiers Table
CREATE TABLE "wager_tiers" (
    "id" INTEGER PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "bcoin_cost" INTEGER NOT NULL,
    "xp_cost" INTEGER NOT NULL
);

-- 4. Game Settings Table
CREATE TABLE "game_settings" (
    "key" VARCHAR(255) PRIMARY KEY,
    "value" VARCHAR(255) NOT NULL
);

-- 5. Wager Matches Table
CREATE TABLE "wager_matches" (
    "match_id" INTEGER PRIMARY KEY,
    "tier_id" INTEGER NOT NULL,
    "player1_address" VARCHAR(255) NOT NULL,
    "player2_address" VARCHAR(255) NOT NULL,
    "status" VARCHAR(50) DEFAULT 'pending' NOT NULL,
    "winner_address" VARCHAR(255),
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Player Checkpoints Table
CREATE TABLE "player_checkpoints" (
    "user_id" INTEGER PRIMARY KEY REFERENCES "users" ("id") ON DELETE CASCADE,
    "highest_wave_reached" INTEGER DEFAULT 0 NOT NULL
);

-- 7. Matchmaking Queue Table
CREATE TABLE "matchmaking_queue" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL UNIQUE REFERENCES "users" ("id") ON DELETE CASCADE,
    "hero_id" INTEGER NOT NULL REFERENCES "heroes" ("id") ON DELETE CASCADE,
    "tier" VARCHAR(50) DEFAULT 'default' NOT NULL,
    "entry_time" TIMESTAMPTZ DEFAULT NOW(),
    "status" VARCHAR(50) DEFAULT 'searching' NOT NULL,
    "match_data" TEXT -- Storing JSON as text
);

-- 8. Altar Status Table
CREATE TABLE "altar_status" (
    "id" INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    "current_donations" INTEGER DEFAULT 0,
    "donation_goal" INTEGER DEFAULT 10000,
    "active_buff_type" VARCHAR(255),
    "buff_expires_at" TIMESTAMPTZ
);

-- 9. Altar Donations Table
CREATE TABLE "altar_donations" (
    "tx_hash" VARCHAR(255) PRIMARY KEY,
    "amount" INTEGER NOT NULL,
    "timestamp" TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Solo Game History Table
CREATE TABLE "solo_game_history" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    "timestamp" TIMESTAMPTZ DEFAULT NOW(),
    "claimed" BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_solo_game_history_user_id ON "solo_game_history" ("user_id");
CREATE INDEX idx_solo_game_history_timestamp ON "solo_game_history" ("timestamp");

-- SEED DATA
-- Insert Wager Tiers
INSERT INTO "wager_tiers" ("id", "name", "bcoin_cost", "xp_cost") VALUES
(1, 'Bronze', 10, 20),
(2, 'Silver', 50, 100),
(3, 'Gold', 200, 500)
ON CONFLICT ("id") DO NOTHING;

-- Insert Default Game Settings
INSERT INTO "game_settings" ("key", "value") VALUES
('xp_multiplier', '1.0')
ON CONFLICT ("key") DO NOTHING;

-- Initialize Altar Status
INSERT INTO "altar_status" ("id", "current_donations", "donation_goal") VALUES
(1, 0, 10000)
ON CONFLICT ("id") DO NOTHING;
