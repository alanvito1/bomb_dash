import ClassicBomb from '../modules/BattleRoyale/ClassicBomb.js';
import BattleRoyalePlayer from '../modules/BattleRoyale/BattleRoyalePlayer.js';
import BotPlayer from '../modules/BattleRoyale/BotPlayer.js';
import playerStateService from '../services/PlayerStateService.js';
import { createRetroPanel } from '../utils/ui.js';
import SoundManager from '../utils/sound.js';
import { CST } from '../CST.js';

export default class BattleRoyaleScene extends Phaser.Scene {
    constructor() {
        super('BattleRoyaleScene');
    }

    create() {
        console.log('⚔️ BATTLE ROYALE STARTED ⚔️');

        // Hotfix: Texture Fallback for BCOIN
        if (!this.textures.exists('icon_bcoin')) {
             const g = this.make.graphics({ x: 0, y: 0, add: false });
             g.fillStyle(0xffff00, 1);
             g.fillCircle(12, 12, 12);
             g.generateTexture('icon_bcoin', 24, 24);
        }

        // Initialize Analytics
        this.matchStats = [];

        // Economy: Entry Fee (Mock)
        const user = playerStateService.getUser();
        if (user && user.bcoin >= 10) {
             user.bcoin -= 10;
        }

        // Map Config
        this.GRID_W = 31;
        this.GRID_H = 31;
        this.TILE_SIZE = 48;
        this.PLAYERS_ALIVE = 16;

        // Initialize Grid (0: Empty, 1: Hard, 2: Soft, 3: Bomb)
        this.grid = Array(this.GRID_H).fill(null).map(() => Array(this.GRID_W).fill(0));

        // Physics Groups
        this.hardGroup = this.physics.add.staticGroup();
        this.softGroup = this.physics.add.staticGroup();
        this.bombGroup = this.add.group();
        this.explosionGroup = this.add.group();
        this.itemGroup = this.physics.add.group();
        this.playersGroup = this.add.group(); // Custom group for logic
        this.botGroup = this.add.group();

        // Background
        this.add.tileSprite(
            (this.GRID_W * this.TILE_SIZE) / 2,
            (this.GRID_H * this.TILE_SIZE) / 2,
            this.GRID_W * this.TILE_SIZE,
            this.GRID_H * this.TILE_SIZE,
            'bg1' // Use existing BG or tile
        ).setScrollFactor(1); // Moves with camera

        // Generate Map
        this.generateMap();

        // Spawn Players
        this.spawnPlayers();

        // Colliders
        // We need physics groups for arcade collision
        // Extract physics bodies from custom groups? No, add them to physics world directly?
        // Players are Physics Sprites, so they are in physics world.
        // Blocks are Static Groups.
        this.physics.add.collider(this.playersGroup.getChildren(), this.hardGroup);
        this.physics.add.collider(this.playersGroup.getChildren(), this.softGroup);

        // Bombs - tricky. Should collide.
        // We'll handle bomb collision dynamically or iterate.
        // For now, let's assume bombs are not solid to simplify movement for bots,
        // OR add them to a static group.
        // Classic bomberman: Bombs are solid.
        // We'll make bombs solid.
        this.physics.add.collider(this.playersGroup.getChildren(), this.bombGroup);

        // Item Pickup
        this.physics.add.overlap(this.playersGroup.getChildren(), this.itemGroup, this.collectItem, null, this);

        // Camera
        this.cameras.main.setBounds(0, 0, this.GRID_W * this.TILE_SIZE, this.GRID_H * this.TILE_SIZE);
        this.physics.world.setBounds(0, 0, this.GRID_W * this.TILE_SIZE, this.GRID_H * this.TILE_SIZE);

        if (this.hero) {
             this.cameras.main.startFollow(this.hero, true, 0.1, 0.1);
        }

        // HUD
        this.createHUD();

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        if (this.hero) this.hero.setupInput(this.cursors, this.spaceKey);

        // Music
        SoundManager.playMusic(this, 'menu_music'); // Reuse menu music or battle?
    }

    update(time, delta) {
        // Update Players
        this.playersGroup.getChildren().forEach(p => p.update(time, delta));

        // Update HUD
        if (this.aliveText) {
            this.aliveText.setText(`ALIVE: ${this.PLAYERS_ALIVE}/16`);
        }
        if (this.coinText && this.hero) {
            this.coinText.setText(`BAG: ${this.hero.collectedBcoins}`);
        }
    }

    generateMap() {
        // 1. Hard Blocks Pattern (Every odd x, odd y)
        for (let y = 0; y < this.GRID_H; y++) {
            for (let x = 0; x < this.GRID_W; x++) {
                // Border
                if (x === 0 || x === this.GRID_W - 1 || y === 0 || y === this.GRID_H - 1) {
                    this.placeBlock(x, y, true);
                    continue;
                }

                // Inner Hard Blocks
                if (x % 2 === 0 && y % 2 === 0) {
                    this.placeBlock(x, y, true);
                }
            }
        }

        // 2. Soft Blocks (Random 160)
        let softCount = 0;
        const targetSoft = 160;

        // Safe Zone around (1,1) for player
        const safeZones = [
            {x: 1, y: 1}, {x: 1, y: 2}, {x: 2, y: 1}, // Top Left
            {x: this.GRID_W-2, y: this.GRID_H-2}, // Bottom Right
            // Add more for bots if needed
        ];

        let attempts = 0;
        while (softCount < targetSoft && attempts < 1000) {
            const rx = Phaser.Math.Between(1, this.GRID_W - 2);
            const ry = Phaser.Math.Between(1, this.GRID_H - 2);

            // Check if empty
            if (this.grid[ry][rx] === 0) {
                // Check Safe Zone
                const isSafe = safeZones.some(s => s.x === rx && s.y === ry);
                if (!isSafe) {
                    this.placeBlock(rx, ry, false);
                    softCount++;
                }
            }
            attempts++;
        }
    }

    placeBlock(x, y, isHard) {
        const px = x * this.TILE_SIZE + this.TILE_SIZE / 2;
        const py = y * this.TILE_SIZE + this.TILE_SIZE / 2;

        this.grid[y][x] = isHard ? 1 : 2;

        // Asset keys? Assuming 'block_hard', 'block_soft' exist or using placeholders
        // Use 'block_soft' from asset manifest if available, or 'wall'.
        // Existing assets: 'wall', 'box' (maybe?)
        // Let's use generic names and fallback.
        // Using 'ui_panel' tinted for now if textures missing?
        // Actually, existing code has blocks.
        // Let's assume 'block_hard' and 'block_soft' textures exist.
        // If not, I'll use a color box.

        const texture = isHard ? 'block_hard' : 'block_soft';
        // Fallback checks
        let sprite;
        if (this.textures.exists(texture)) {
            sprite = (isHard ? this.hardGroup : this.softGroup).create(px, py, texture);
        } else {
            // Create graphics texture on fly? Or use 'metal' panel.
            sprite = (isHard ? this.hardGroup : this.softGroup).create(px, py, 'ui_panel');
            sprite.setTint(isHard ? 0x555555 : 0xcd853f);
        }

        sprite.setDisplaySize(this.TILE_SIZE, this.TILE_SIZE);
        sprite.body.updateFromGameObject(); // Sync physics body size
    }

    spawnPlayers() {
        // 1. Hero (User)
        const startX = 1 * this.TILE_SIZE + this.TILE_SIZE / 2;
        const startY = 1 * this.TILE_SIZE + this.TILE_SIZE / 2;

        // Get Stats
        const heroData = this.registry.get('selectedHero') || { sprite_name: 'player_default' };
        // Map stats roughly
        const stats = {
            speed: 160 + (heroData.stats?.speed || 0) * 10,
            bombRange: 2 + (heroData.stats?.range || 0),
            bombCount: 1 + (heroData.stats?.bomb_num || 0)
        };

        const texture = heroData.sprite_name ? `${heroData.sprite_name.toLowerCase()}_hero` : 'player_default';

        // Analytics for Hero
        const user = playerStateService.getUser();
        const heroStats = {
             id: 'hero',
             name: user.username || 'Summoner',
             isUser: true,
             blocksDestroyed: 0,
             bcoinsCollected: 0,
             bcoinsLost: 0,
             killerName: '-',
             placement: 16
        };
        this.matchStats.push(heroStats);

        this.hero = new BattleRoyalePlayer(this, startX, startY, texture, stats, heroStats);
        this.playersGroup.add(this.hero);

        // 2. Bots (15)
        for (let i = 0; i < 15; i++) {
            this.spawnBot(i);
        }
    }

    spawnBot(index) {
        // Find valid spot
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            const rx = Phaser.Math.Between(1, this.GRID_W - 2);
            const ry = Phaser.Math.Between(1, this.GRID_H - 2);

            // Empty and far from player?
            if (this.grid[ry][rx] === 0) {
                // Ensure distance from player
                const dist = Phaser.Math.Distance.Between(rx, ry, 1, 1);
                if (dist > 5) {
                    const px = rx * this.TILE_SIZE + this.TILE_SIZE / 2;
                    const py = ry * this.TILE_SIZE + this.TILE_SIZE / 2;

                    const botStats = {
                        id: `bot_${index}`,
                        name: `Bot #${index + 1}`,
                        isUser: false,
                        blocksDestroyed: 0,
                        bcoinsCollected: 0,
                        bcoinsLost: 0,
                        killerName: '-',
                        placement: 16
                    };
                    this.matchStats.push(botStats);

                    const bot = new BotPlayer(this, px, py, 'player_default', {
                        speed: 140, // Slightly slower than hero
                        bombRange: 2,
                        bombCount: 1
                    }, botStats);
                    this.playersGroup.add(bot);
                    this.botGroup.add(bot);
                    placed = true;
                }
            }
            attempts++;
        }
    }

    // --- GAME LOGIC ---

    tryPlaceBomb(x, y, range, owner) {
        const gridX = Math.floor(x / this.TILE_SIZE);
        const gridY = Math.floor(y / this.TILE_SIZE);

        // Check grid bounds
        if (gridX < 0 || gridX >= this.GRID_W || gridY < 0 || gridY >= this.GRID_H) return false;

        // Check if blocked by wall or another bomb
        if (this.grid[gridY][gridX] !== 0 && this.grid[gridY][gridX] !== 4) return false; // 0 is empty, 4 is item (can place on item?)
        // Ideally can place on item.

        // Create Bomb
        const bomb = new ClassicBomb(this,
            gridX * this.TILE_SIZE + this.TILE_SIZE / 2,
            gridY * this.TILE_SIZE + this.TILE_SIZE / 2,
            range,
            owner
        );
        bomb.startTimer(3000);

        this.grid[gridY][gridX] = 3; // Mark as Bomb
        this.bombGroup.add(bomb);

        SoundManager.play(this, 'bomb_fire'); // Reuse existing sound
        return true;
    }

    triggerExplosion(x, y, range, owner) {
        const gridX = Math.floor(x / this.TILE_SIZE);
        const gridY = Math.floor(y / this.TILE_SIZE);

        // Clear bomb from grid
        this.grid[gridY][gridX] = 0;

        // Directions: Center, Up, Down, Left, Right
        const directions = [
            {x: 0, y: 0},
            {x: 0, y: -1}, {x: 0, y: 1},
            {x: -1, y: 0}, {x: 1, y: 0}
        ];

        // Center Explosion
        this.createExplosionSprite(x, y);
        this.damageAt(gridX, gridY, owner);

        // Arms
        directions.slice(1).forEach(dir => {
            for (let i = 1; i <= range; i++) {
                const tx = gridX + dir.x * i;
                const ty = gridY + dir.y * i;

                // Bounds
                if (tx < 0 || tx >= this.GRID_W || ty < 0 || ty >= this.GRID_H) break;

                const cell = this.grid[ty][tx];

                if (cell === 1) { // Hard Block
                    break; // Stop ray
                }

                // Visual
                this.createExplosionSprite(
                    tx * this.TILE_SIZE + this.TILE_SIZE / 2,
                    ty * this.TILE_SIZE + this.TILE_SIZE / 2
                );

                // Damage
                this.damageAt(tx, ty, owner);

                if (cell === 2) { // Soft Block
                    // Destroy block
                    this.destroyBlock(tx, ty, owner);
                    break; // Stop ray after breaking block
                }
            }
        });

        SoundManager.play(this, 'explosion');
    }

    createExplosionSprite(x, y) {
        // Reuse ExplosionManager or create simple sprite
        // Using built-in simplified sprite for this mode
        const sprite = this.add.sprite(x, y, 'explosion_sheet');
        sprite.play('explosion_anim');
        sprite.on('animationcomplete', () => sprite.destroy());
    }

    damageAt(gridX, gridY, killer) {
        // Check players at this grid cell
        const px = gridX * this.TILE_SIZE + this.TILE_SIZE / 2;
        const py = gridY * this.TILE_SIZE + this.TILE_SIZE / 2;

        // Use overlap check with a small hitbox at center of tile
        const zone = new Phaser.Geom.Rectangle(px - 20, py - 20, 40, 40);

        this.playersGroup.getChildren().forEach(p => {
            if (p.active && p.isAlive) {
                if (Phaser.Geom.Rectangle.Contains(zone, p.x, p.y) ||
                    Phaser.Geom.Intersects.RectangleToRectangle(zone, p.body)) {
                    this.killPlayer(p, killer);
                }
            }
        });
    }

    killPlayer(p, killer) {
        if (!p.isAlive) return;
        p.die();
        this.PLAYERS_ALIVE--;

        const rank = this.PLAYERS_ALIVE + 1; // +1 because we just decremented
        console.log(`Player died. Rank: ${rank}`);

        // Update Stats
        if (p.matchStats) {
            p.matchStats.placement = rank;
            p.matchStats.killerName = killer && killer.matchStats ? killer.matchStats.name : 'Zone';
        }

        if (rank > 3) {
            // Drop Everything
            const coins = p.collectedBcoins;
            if (coins > 0) {
                this.spawnItem(p.x, p.y, coins);
                p.collectedBcoins = 0;

                if (p.matchStats) {
                    p.matchStats.bcoinsLost = coins;
                }
            }
        } else {
            // Keep loot
            if (p === this.hero) {
                console.log("HERO SECURED LOOT via Rank Top 3!");
                const user = playerStateService.getUser();
                if (user) {
                    user.bcoin += p.collectedBcoins;
                }
                // Notify User
                this.add.text(this.hero.x, this.hero.y - 40, "SECURED!", { fontSize: '10px', color: '#00ff00' }).setOrigin(0.5);
            }
        }

        // Check Win
        if (this.PLAYERS_ALIVE <= 1) {
            this.handleWin();
        } else if (p === this.hero) {
            this.handleGameOver(rank);
        }
    }

    destroyBlock(gridX, gridY, destroyer) {
        this.grid[gridY][gridX] = 0; // Clear grid

        // Find sprite
        const px = gridX * this.TILE_SIZE + this.TILE_SIZE / 2;
        const py = gridY * this.TILE_SIZE + this.TILE_SIZE / 2;

        // Iterate softGroup children to find matching position
        // Inefficient but 160 blocks is okay.
        this.softGroup.getChildren().some(b => {
            if (b.active && Math.abs(b.x - px) < 5 && Math.abs(b.y - py) < 5) {
                b.destroy();
                return true;
            }
            return false;
        });

        // Update Stats
        if (destroyer && destroyer.matchStats) {
            destroyer.matchStats.blocksDestroyed++;
        }

        // Drop Item (100% chance for BCOIN in this mode as per spec "160 BCOINs... 160 Soft Blocks")
        this.spawnItem(px, py, 1);
    }

    spawnItem(x, y, value) {
        const item = this.itemGroup.create(x, y, 'icon_bcoin');
        item.setDisplaySize(24, 24);
        item.value = value;

        // Tween bob
        this.tweens.add({
            targets: item,
            y: y - 5,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    collectItem(player, item) {
        if (!item.active) return;
        const val = (item.value || 1);
        player.collectedBcoins += val;
        if (player.matchStats) {
            player.matchStats.bcoinsCollected += val;
        }
        item.destroy();
        SoundManager.play(this, 'coin_collect');
    }

    isSoftBlock(gridX, gridY) {
        if (gridX < 0 || gridX >= this.GRID_W || gridY < 0 || gridY >= this.GRID_H) return false;
        return this.grid[gridY][gridX] === 2;
    }

    isBlocked(gridX, gridY) {
        if (gridX < 0 || gridX >= this.GRID_W || gridY < 0 || gridY >= this.GRID_H) return true;
        return this.grid[gridY][gridX] !== 0 && this.grid[gridY][gridX] !== 4; // 4 is Item (passable)
    }

    // --- HUD & END GAME ---

    createHUD() {
        const cam = this.cameras.main;

        // Using ScrollFactor 0 for fixed HUD
        this.aliveText = this.add.text(10, 10, `ALIVE: 16/16`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#ff0000',
            stroke: '#000000',
            strokeThickness: 3
        }).setScrollFactor(0).setDepth(100);

        this.coinText = this.add.text(10, 30, `BAG: 0`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3
        }).setScrollFactor(0).setDepth(100);
    }

    handleWin() {
        console.log("VICTORY!");
        if (this.hero && this.hero.isAlive) {
            // Update Hero Stats
            const loot = this.hero.collectedBcoins;
            if (this.hero.matchStats) {
                 this.hero.matchStats.placement = 1;
            }

            // Secure Loot
            const user = playerStateService.getUser();
            if (user) {
                 user.bcoin += loot;
            }

            this.time.delayedCall(2000, () => {
                this.scene.start(CST.SCENES.POST_MATCH, {
                    isVictory: true,
                    stats: this.matchStats,
                    heroStats: this.hero.matchStats
                });
            });
        }
    }

    handleGameOver(rank) {
        console.log("GAME OVER. Rank:", rank);

        this.time.delayedCall(2000, () => {
            this.scene.start(CST.SCENES.POST_MATCH, {
                isVictory: rank === 1,
                stats: this.matchStats,
                heroStats: this.hero.matchStats
            });
        });
    }
}
