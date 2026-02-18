-- Initialize Items for MVP Hardcore
-- Run this in Supabase SQL Editor

INSERT INTO items (name, type, rarity, stats, image_url) VALUES
('Rusty Sword', 'weapon', 'Common', '{"damage": 5}', 'item_rusty_sword'),
('Iron Katana', 'weapon', 'Rare', '{"damage": 12}', 'item_iron_katana'),
('Leather Vest', 'armor', 'Common', '{"hp": 50}', 'item_leather_vest'),
('Nano Vest', 'armor', 'Rare', '{"hp": 120}', 'item_nano_vest'),
('Neon Boots', 'armor', 'Rare', '{"speed": 5}', 'item_neon_boots'),
('Health Potion', 'consumable', 'Common', '{"heal": 50}', 'item_health_potion'),
('Scrap Metal', 'material', 'Common', '{}', 'item_scrap'),
('Cyber Core', 'material', 'Rare', '{}', 'item_cyber_core')
ON CONFLICT (id) DO NOTHING;
