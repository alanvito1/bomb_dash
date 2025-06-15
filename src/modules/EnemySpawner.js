import { getUpgrades, saveUpgrades } from '../systems/upgrades.js';
import SoundManager from '../utils/sound.js';

// Constantes
const MAX_WORLD = 5;
const BOSS_INTERVAL = 5;
const MAX_ENEMIES = 11;
const SPAWN_DELAY = 800;

export default class EnemySpawner {
  constructor(scene) {
    this.scene = scene;
    this.spawnDelay = SPAWN_DELAY;
    this.maxEnemies = MAX_ENEMIES;
  }

  spawn() {
    if (!this.scene || !this.scene.enemies) {
      console.error('[ENEMY SPAWNER] Cena ou grupo de inimigos inválido');
      return;
    }

    const level = this.scene.level || 1;
    const world = Math.min(Math.ceil(level / BOSS_INTERVAL), MAX_WORLD);
    const stageInWorld = ((level - 1) % BOSS_INTERVAL) + 1;
    this.scene.stageCode = `${world}-${stageInWorld}`;

    // Fim do jogo após nível 25
    if (level > 25) {
      console.log(`[ENEMY SPAWNER] Fim do jogo no nível ${level}`);
      const upgrades = getUpgrades();
      upgrades.coins += this.scene.coinsEarned || 0;
      saveUpgrades(upgrades);

      this.scene.scene.start('GameOverScene', {
        score: this.scene.score || 0,
        coinsEarned: this.scene.coinsEarned || 0
      });
      return;
    }

    // Limpar inimigos anteriores
    this.scene.enemies.clear(true, true);
    this.scene.bossDefeated = false;
    this.scene.bossSpawned = false;
    this.scene.enemiesSpawned = 0;
    this.scene.enemiesKilled = 0;

    // Boss a cada 5 níveis
    if (level % BOSS_INTERVAL === 0) {
      const bossIndex = Math.min(world, MAX_WORLD);
      const bossKey = this.scene.textures.exists(`boss${bossIndex}`) ? `boss${bossIndex}` : 'boss5';

      const boss = this.scene.enemies.create(this.scene.scale.width / 2, -50, bossKey);
      boss.setVelocityY(28);
      boss.setDisplaySize(48, 48);
      boss.hp = (this.scene.baseBossHp || 10) + level * 2;
      boss.isBoss = true;

      this.scene.bossSpawned = true;
      this.scene.enemiesSpawned = 1;

      SoundManager.play(this.scene, 'boss_spawn');

      console.log(`[ENEMY SPAWNER] Boss wave ${level} (world ${world}) - Spawned ${bossKey} with HP ${boss.hp}`);
      return;
    }

    // Spawn de inimigos comuns
    const enemyIndex = Math.min(world, MAX_WORLD);
    const spriteKey = this.scene.textures.exists(`enemy${enemyIndex}`) ? `enemy${enemyIndex}` : 'enemy5';

    this._spawnEnemy(spriteKey, level);

    this.scene.time.addEvent({
      delay: this.spawnDelay,
      repeat: this.maxEnemies - 1,
      callback: () => this._spawnEnemy(spriteKey, level)
    });

    SoundManager.play(this.scene, 'wave_start');

    console.log(`[ENEMY SPAWNER] Regular wave ${level} (world ${world}) - Spawning ${this.maxEnemies} ${spriteKey} enemies`);
  }

  _spawnEnemy(spriteKey, level) {
    if (!this.scene.enemies) return;

    const enemy = this.scene.enemies.create(
      Phaser.Math.Between(50, this.scene.scale.width - 50),
      -50,
      spriteKey
    );

    enemy.setVelocityY((100 + level * 2) * 0.7);
    enemy.setDisplaySize(32, 32);
    enemy.hp = (this.scene.baseEnemyHp || 1) + Math.floor((level - 1) / 2);
    enemy.isBoss = false;

    this.scene.enemiesSpawned++;
  }
}
