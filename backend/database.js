require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { getExperienceForLevel } = require('./rpg');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'CRITICAL: Supabase URL or Service Role Key missing from environment variables.'
  );
  // In production, we might want to exit, but for dev robustness we'll warn.
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// --- SEED DATA (Economy Injection) ---
async function seedEconomy() {
  console.log('🌱 Seeding Economy: Checking Fragment Items...');

  const fragments = [
    {
      name: 'Common Fragment',
      type: 'fragment',
      rarity: 'Common',
      stats: {},
      image_url: 'fragment_common',
    },
    {
      name: 'Rare Fragment',
      type: 'fragment',
      rarity: 'Rare',
      stats: {},
      image_url: 'fragment_rare',
    },
    {
      name: 'Super Rare Fragment',
      type: 'fragment',
      rarity: 'Super Rare',
      stats: {},
      image_url: 'fragment_super_rare',
    },
    {
      name: 'Epic Fragment',
      type: 'fragment',
      rarity: 'Epic',
      stats: {},
      image_url: 'fragment_epic',
    },
    {
      name: 'Legendary Fragment',
      type: 'fragment',
      rarity: 'Legendary',
      stats: {},
      image_url: 'fragment_legendary',
    },
    {
      name: 'Super Legendary Fragment',
      type: 'fragment',
      rarity: 'Super Legendary',
      stats: {},
      image_url: 'fragment_super_legendary',
    },
  ];

  for (const fragment of fragments) {
    const { data, error } = await supabase
      .from('items')
      .select('id')
      .eq('name', fragment.name)
      .maybeSingle();

    if (error) {
      console.error(`Error checking fragment ${fragment.name}:`, error.message);
      continue;
    }

    if (!data) {
      console.log(`Creating ${fragment.name}...`);
      const { error: insertError } = await supabase
        .from('items')
        .insert([fragment]);

      if (insertError) {
        console.error(
          `Failed to create ${fragment.name}:`,
          insertError.message
        );
      }
    }
  }
  console.log('✅ Economy Seed Complete.');
}

// --- USER MANAGEMENT ---

async function createUserByAddress(address, initialCoins = 1000) {
  const { data, error } = await supabase
    .from('users')
    .insert([{ wallet_address: address, coins: initialCoins }])
    .select()
    .single();

  if (error) throw new Error(`Create User Failed: ${error.message}`);
  return { success: true, userId: data.id, user: data };
}

async function findUserByAddress(address) {
  const { data, error } = await supabase
    .from('users')
    .select('id, wallet_address, account_level, account_xp, coins')
    .eq('wallet_address', address)
    .maybeSingle();

  if (error) throw new Error(`Find User Failed: ${error.message}`);
  return data;
}

async function getUserByAddress(address) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', address)
    .maybeSingle();

  if (error) throw new Error(`Get User Failed: ${error.message}`);
  return data;
}

async function getUserById(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(`Get User Failed: ${error.message}`);
  return data;
}

async function addXpToUser(address, xpAmount) {
  const user = await getUserByAddress(address);
  if (!user) throw new Error('User not found');
  return grantRewards(user.id, 0, xpAmount);
}

// --- HERO MANAGEMENT ---

async function createHeroForUser(userId, heroData) {
  // Ensure snake_case for DB
  const dbHeroData = {
    user_id: userId,
    hero_type: heroData.hero_type || 'mock',
    nft_id: heroData.nft_id,
    level: heroData.level || 1,
    xp: heroData.xp || 0,
    hp: heroData.hp || 100,
    max_hp: heroData.maxHp || 100, // Map camelCase to snake_case
    damage: heroData.damage || 10,
    speed: heroData.speed || 100, // Default speed
    sprite_name: heroData.sprite_name || 'ninja_hero',
    rarity: heroData.rarity || 'Common',
    status: heroData.status || 'in_wallet',
    last_updated: new Date(),
  };

  const { data, error } = await supabase
    .from('heroes')
    .insert([dbHeroData])
    .select()
    .single();

  if (error) throw new Error(`Create Hero Failed: ${error.message}`);
  return { success: true, heroId: data.id, hero: data };
}

async function getHeroesByUserId(userId) {
  const { data, error } = await supabase
    .from('heroes')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error(`Get Heroes Failed: ${error.message}`);

  return data.map((h) => ({
    ...h,
    maxHp: h.max_hp, // Map back for compatibility
    bombSize: h.bomb_size,
    multiShot: h.multi_shot,
    bombMasteryXp: h.bomb_mastery_xp,
    agilityXp: h.agility_xp,
    maxStage: h.max_stage,
    // Name Logic
    name: h.sprite_name
      ? h.sprite_name
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
      : 'Unknown Hero',
  }));
}

async function updateHeroStats(heroId, stats) {
  // Map camelCase stats to snake_case columns
  const updatePayload = {};
  if (stats.level !== undefined) updatePayload.level = stats.level;
  if (stats.xp !== undefined) updatePayload.xp = stats.xp;
  if (stats.hp !== undefined) updatePayload.hp = stats.hp;
  if (stats.maxHp !== undefined) updatePayload.max_hp = stats.maxHp;
  if (stats.damage !== undefined) updatePayload.damage = stats.damage;
  if (stats.speed !== undefined) updatePayload.speed = stats.speed;
  if (stats.bombSize !== undefined) updatePayload.bomb_size = stats.bombSize;
  if (stats.multiShot !== undefined) updatePayload.multi_shot = stats.multiShot;
  if (stats.status !== undefined) updatePayload.status = stats.status;

  updatePayload.last_updated = new Date();

  const { error } = await supabase
    .from('heroes')
    .update(updatePayload)
    .eq('id', heroId);

  if (error) throw new Error(`Update Hero Failed: ${error.message}`);
  return { success: true };
}

async function updateHeroStatus(nftId, newStatus) {
  const { error } = await supabase
    .from('heroes')
    .update({ status: newStatus })
    .eq('nft_id', nftId)
    .eq('hero_type', 'nft');

  if (error) throw new Error(`Update Hero Status Failed: ${error.message}`);
  return { success: true };
}

async function addXpToHero(heroId, xpAmount) {
  // Fetch current hero
  const { data: hero, error: fetchError } = await supabase
    .from('heroes')
    .select('*')
    .eq('id', heroId)
    .single();

  if (fetchError || !hero)
    throw new Error(`Hero not found: ${fetchError?.message}`);

  let newXp = (hero.xp || 0) + xpAmount;

  const xpForNextLevel = getExperienceForLevel(hero.level + 1);

  // Allow reaching the cap exactly so manual level up is possible.
  const xpCap = xpForNextLevel;

  if (newXp > xpCap) newXp = xpCap;

  const { error: updateError } = await supabase
    .from('heroes')
    .update({ xp: newXp })
    .eq('id', heroId);

  if (updateError) throw new Error(`Add XP Failed: ${updateError.message}`);
  return { success: true };
}

// --- GAME STATE ---

async function savePlayerCheckpoint(userId, waveNumber) {
  // Check existing
  const { data: existing, error: fetchError } = await supabase
    .from('player_checkpoints')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError)
    throw new Error(`Fetch Checkpoint Failed: ${fetchError.message}`);

  if (existing) {
    if (waveNumber > existing.highest_wave_reached) {
      const { error: updateError } = await supabase
        .from('player_checkpoints')
        .update({ highest_wave_reached: waveNumber })
        .eq('user_id', userId);
      if (updateError)
        throw new Error(`Update Checkpoint Failed: ${updateError.message}`);
      return { success: true, updated: true };
    }
    return { success: true, updated: false };
  } else {
    const { error: insertError } = await supabase
      .from('player_checkpoints')
      .insert([{ user_id: userId, highest_wave_reached: waveNumber }]);
    if (insertError)
      throw new Error(`Create Checkpoint Failed: ${insertError.message}`);
    return { success: true, updated: true };
  }
}

async function getPlayerCheckpoint(userId) {
  const { data, error } = await supabase
    .from('player_checkpoints')
    .select('highest_wave_reached')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return 0;
  return data ? data.highest_wave_reached : 0;
}

async function getGameSetting(key) {
  const { data } = await supabase
    .from('game_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return data ? data.value : null;
}

async function updateGameSetting(key, value) {
  await supabase.from('game_settings').upsert({ key, value });
  return { success: true };
}

// --- ECONOMY & ITEMS ---

async function getItemByName(name) {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('name', name)
    .maybeSingle();
  if (error) throw new Error(`Get Item Failed: ${error.message}`);
  return data;
}

async function getUserItems(userId) {
  const { data, error } = await supabase
    .from('user_items')
    .select('*, item:items(*)') // Join with items
    .eq('user_id', userId);

  if (error) throw new Error(`Get User Items Failed: ${error.message}`);
  return data;
}

async function addItemToUser(userId, itemId, quantity = 1) {
  // Check if user already has item
  const { data: existing, error: fetchError } = await supabase
    .from('user_items')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (fetchError)
    throw new Error(`Fetch User Item Failed: ${fetchError.message}`);

  if (existing) {
    const { error: updateError } = await supabase
      .from('user_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    if (updateError)
      throw new Error(`Update Item Quantity Failed: ${updateError.message}`);
  } else {
    const { error: insertError } = await supabase
      .from('user_items')
      .insert([{ user_id: userId, item_id: itemId, quantity }]);
    if (insertError) throw new Error(`Add Item Failed: ${insertError.message}`);
  }
  return { success: true };
}

async function removeItemFromUser(userId, itemId, quantity = 1) {
  const { data: existing, error: fetchError } = await supabase
    .from('user_items')
    .select('*')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (fetchError)
    throw new Error(`Fetch User Item Failed: ${fetchError.message}`);
  if (!existing || existing.quantity < quantity) {
    return { success: false, message: 'Insufficient quantity' };
  }

  if (existing.quantity === quantity) {
    await supabase.from('user_items').delete().eq('id', existing.id);
  } else {
    await supabase
      .from('user_items')
      .update({ quantity: existing.quantity - quantity })
      .eq('id', existing.id);
  }
  return { success: true };
}

async function grantRewards(userId, bcoinReward, accountXpReward) {
  // Sequential Update (No Transaction for MVP)
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError || !user)
    throw new Error(`User not found: ${fetchError?.message}`);

  let newCoins = (user.coins || 0) + bcoinReward;
  let newXp = (user.account_xp || 0) + accountXpReward;
  let newLevel = user.account_level || 1;

  // Summoner's Journey Logic
  let requiredXp = newLevel * 100;
  while (newXp >= requiredXp) {
    newXp -= requiredXp;
    newLevel++;
    requiredXp = newLevel * 100;
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ coins: newCoins, account_xp: newXp, account_level: newLevel })
    .eq('id', userId);

  if (updateError)
    throw new Error(`Grant Rewards Failed: ${updateError.message}`);
  return {
    success: true,
    user: {
      ...user,
      coins: newCoins,
      account_xp: newXp,
      account_level: newLevel,
    },
  };
}

// --- BESTIARY ---
async function getBestiary(userId) {
  const { data, error } = await supabase
    .from('user_bestiary')
    .select('*')
    .eq('user_id', userId);

  if (error) return {};

  const result = {};
  data.forEach((entry) => {
    result[entry.enemy_type] = entry.kill_count;
  });
  return result;
}

async function updateBestiary(userId, updates) {
  for (const [enemyType, count] of Object.entries(updates)) {
    if (count <= 0) continue;

    const { data: existing } = await supabase
      .from('user_bestiary')
      .select('*')
      .eq('user_id', userId)
      .eq('enemy_type', enemyType)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('user_bestiary')
        .update({ kill_count: existing.kill_count + count })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('user_bestiary')
        .insert([
          { user_id: userId, enemy_type: enemyType, kill_count: count },
        ]);
    }
  }
  return { success: true };
}

// --- PROFICIENCY ---
async function updateHeroProficiency(heroId, updates) {
  const { data: hero } = await supabase
    .from('heroes')
    .select('*')
    .eq('id', heroId)
    .single();
  if (!hero) return;

  const updatePayload = {};
  if (updates.bombMasteryXp)
    updatePayload.bomb_mastery_xp =
      (hero.bomb_mastery_xp || 0) + updates.bombMasteryXp;
  if (updates.agilityXp)
    updatePayload.agility_xp = (hero.agility_xp || 0) + updates.agilityXp;

  await supabase.from('heroes').update(updatePayload).eq('id', heroId);
  return { success: true };
}

// --- OTHER STUBS/HELPERS ---
async function addDonationToAltar(amount, txHash) {
  const { data: altar } = await supabase
    .from('altar_status')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  let currentDonations = 0;
  if (altar) currentDonations = altar.current_donations;
  else
    await supabase
      .from('altar_status')
      .insert([{ id: 1, current_donations: 0 }]);

  await supabase.from('altar_donations').insert([{ tx_hash: txHash, amount }]);
  await supabase
    .from('altar_status')
    .update({ current_donations: currentDonations + amount })
    .eq('id', 1);
  return { success: true };
}

async function getRanking(limit = 10) {
  const { data, error } = await supabase
    .from('player_checkpoints')
    .select('*, users(wallet_address)')
    .order('highest_wave_reached', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data;
}

// STUBS for PvP/Wagers to prevent crashes
async function getWagerTier() {
  return null;
}
async function getWagerTiers() {
  return [];
}
async function processWagerMatchResult() {
  return { success: false, message: 'PvP disabled in Refactor' };
}
async function createWagerMatch() {
  return { success: false };
}
async function getWagerMatch() {
  return null;
}
async function updateWagerMatch() {
  return { success: false };
}
async function addToMatchmakingQueue() {
  return { success: false };
}
async function removeFromMatchmakingQueue() {
  return { success: true };
}
async function getMatchmakingQueueUser() {
  return null;
}
async function updateMatchmakingQueueStatus() {
  return { success: true };
}

// --- Guilds Stub ---
const GuildMember = {
  findOne: async ({ where, include }) => {
    if (where && where.user_id) {
      const { data: member } = await supabase
        .from('guild_members')
        .select('*, guilds(name, tag)')
        .eq('user_id', where.user_id)
        .maybeSingle();

      if (member && member.guilds) {
        return { Guild: { name: member.guilds.name, tag: member.guilds.tag } };
      }
    }
    return null;
  },
};

const Guild = {};
const Item = {};
const UserItem = {};

module.exports = {
  supabase,
  seedEconomy,
  createUserByAddress,
  findUserByAddress,
  getUserByAddress,
  getUserById,
  addXpToUser,
  createHeroForUser,
  getHeroesByUserId,
  updateHeroStats,
  updateHeroStatus,
  addXpToHero,
  savePlayerCheckpoint,
  getPlayerCheckpoint,
  getGameSetting,
  updateGameSetting,
  getItemByName,
  getUserItems,
  addItemToUser,
  removeItemFromUser,
  grantRewards,
  getBestiary,
  updateBestiary,
  updateHeroProficiency,
  addDonationToAltar,
  getRanking,
  getWagerTier,
  getWagerTiers,
  processWagerMatchResult,
  createWagerMatch,
  getWagerMatch,
  updateWagerMatch,
  addToMatchmakingQueue,
  removeFromMatchmakingQueue,
  getMatchmakingQueueUser,
  updateMatchmakingQueueStatus,
  GuildMember,
  Guild,
  Item,
  UserItem,
};
