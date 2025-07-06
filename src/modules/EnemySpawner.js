import SoundManager from '../utils/sound.js';

// Constantes
const MAX_WORLD = 5;
const BOSS_INTERVAL = 5;
const MAX_ENEMIES_BASE = 11; // Renomeado para indicar que é o base
const SPAWN_DELAY_BASE = 800; // Renomeado para indicar que é o base

export default class EnemySpawner {
  constructor(scene) {
    this.scene = scene;
    this.spawnInterval = SPAWN_DELAY_BASE; // Usar this.spawnInterval para que possa ser modificado
    this.maxEnemiesBase = MAX_ENEMIES_BASE; // Usar this.maxEnemiesBase

    // getUpgrades e saveUpgrades não são mais usados aqui desde a remoção do sistema de upgrades.js
    // A lógica de fim de jogo no nível 25 foi movida para GameScene.js ou será tratada lá.
  }

  // Método para PowerupLogic obter o intervalo de spawn atual
  getSpawnInterval() {
    return this.spawnInterval;
  }

  // Método para PowerupLogic definir um novo intervalo de spawn
  setSpawnInterval(newInterval) {
    this.spawnInterval = Math.max(50, newInterval); // Adicionar um limite mínimo para o intervalo (ex: 50ms)
    console.log(`[EnemySpawner] Spawn interval set to: ${this.spawnInterval}`);
    // Se um timer de spawn estiver ativo, ele precisaria ser reiniciado para usar o novo intervalo.
    // A lógica atual em spawn() já cria um novo timer a cada chamada, então isso deve funcionar.
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

    // Lógica de fim de jogo no nível 25 foi movida para GameScene.js (ou será tratada lá)
    // if (level > 25) { ... return 'GAME_SHOULD_END'; } // REMOVIDO DAQUI

    this.scene.enemies.clear(true, true);
    this.scene.bossDefeated = false;
    this.scene.bossSpawned = false;
    this.scene.enemiesSpawned = 0;
    this.scene.enemiesKilled = 0;

    if (level % BOSS_INTERVAL === 0) {
      const bossIndex = Math.min(world, MAX_WORLD);
      const bossKey = this.scene.textures.exists(`boss${bossIndex}`) ? `boss${bossIndex}` : 'boss5';
      const boss = this.scene.enemies.create(this.scene.scale.width / 2, -50, bossKey);
      boss.setVelocityY(28);
      boss.setDisplaySize(48, 48);
      boss.hp = (this.scene.baseBossHp || 100) + level * 2;
      boss.isBoss = true;
      this.scene.bossSpawned = true;
      this.scene.enemiesSpawned = 1;
      SoundManager.play(this.scene, 'boss_spawn');
      console.log(`[ENEMY SPAWNER] Boss wave ${level} (world ${world}) - Spawned ${bossKey} with HP ${boss.hp}`);
      return;
    }

    const enemyIndex = Math.min(world, MAX_WORLD);
    const spriteKey = this.scene.textures.exists(`enemy${enemyIndex}`) ? `enemy${enemyIndex}` : 'enemy5';

    // Aplicar multiplicador de inimigos do powerup6 (Anti-buff)
    let currentMaxEnemies = this.maxEnemiesBase;
    if (this.scene.enemySpawnMultiplierActive) {
      currentMaxEnemies = Math.floor(this.maxEnemiesBase * (this.scene.enemySpawnMultiplier || 1));
      console.log(`[EnemySpawner] Anti-buff: Multiplicando inimigos. Base: ${this.maxEnemiesBase}, Multiplicador: ${this.scene.enemySpawnMultiplier}, Atual: ${currentMaxEnemies}`);
    }

    // Garante que pelo menos um inimigo seja spawnado se currentMaxEnemies for maior que 0
    currentMaxEnemies = Math.max(1, currentMaxEnemies);


    this._spawnEnemy(spriteKey, level); // Spawna o primeiro inimigo

    if (currentMaxEnemies > 1) { // Só cria o timer se houver mais inimigos para spawnar
        // O timer usará this.spawnInterval, que pode ser modificado pelo powerup7
        this.scene.time.addEvent({
        delay: this.spawnInterval,
        repeat: currentMaxEnemies - 1, // Ajustado para currentMaxEnemies
        callback: () => this._spawnEnemy(spriteKey, level)
        });
    } else {
        // Se currentMaxEnemies for 1 (ou menos, mas corrigido para 1),
        // e o primeiro já foi spawnado, não precisamos do timer de repetição.
        // A lógica de this.scene.enemiesSpawned já conta o primeiro.
    }


    SoundManager.play(this.scene, 'wave_start');
    console.log(`[ENEMY SPAWNER] Regular wave ${level} (world ${world}) - Spawning up to ${currentMaxEnemies} ${spriteKey} enemies with interval ${this.spawnInterval}ms`);
  }

  _spawnEnemy(spriteKey, level) {
    if (!this.scene.enemies || !this.scene.player || !this.scene.player.active) {
        // Não spawna se o jogador não estiver ativo (ex: durante transição de game over)
        return;
    }

    const enemy = this.scene.enemies.create(
      Phaser.Math.Between(50, this.scene.scale.width - 50),
      -50,
      spriteKey
    );

    let baseSpeed = (100 + level * 2) * 0.7;
    if (this.scene.increaseEnemySpeedActive) {
      baseSpeed *= 1.5; // Increase speed by 50% if anti-buff is active
      console.log(`[EnemySpawner] Anti-buff: Spawning enemy with increased speed: ${baseSpeed}`);
    }
    enemy.setVelocityY(baseSpeed);
    enemy.setDisplaySize(32, 32);
    enemy.hp = (this.scene.baseEnemyHp || 1) + Math.floor((level - 1) / 2);
    enemy.isBoss = false;

    this.scene.enemiesSpawned++;
  }

  spawnImmediateWave(count = 10, specificSpriteKey = null) {
    if (!this.scene || !this.scene.enemies || !this.scene.player || !this.scene.player.active) {
      console.warn('[EnemySpawner] Cannot spawn immediate wave: Scene, enemies group, or player invalid/inactive.');
      return;
    }
    console.log(`[EnemySpawner] Spawning immediate wave of ${count} enemies.`);

    const level = this.scene.level || 1;
    const world = Math.min(Math.ceil(level / BOSS_INTERVAL), MAX_WORLD);

    // Determine the enemy sprite key for this wave
    // If a specificSpriteKey is provided (e.g., for a special event), use it. Otherwise, determine by world.
    const enemySpriteKey = specificSpriteKey || (this.scene.textures.exists(`enemy${world}`) ? `enemy${world}` : 'enemy5');

    for (let i = 0; i < count; i++) {
      // Use a slight delay for each enemy in the immediate wave to prevent them all overlapping perfectly
      this.scene.time.delayedCall(i * 50, () => {
        if (!this.scene.player || !this.scene.player.active || this.scene.gamePaused) return; // Check player status again before actual spawn

        const enemy = this.scene.enemies.create(
          Phaser.Math.Between(50, this.scene.scale.width - 50),
          Phaser.Math.Between(-20, -100), // Spawn them slightly off-screen from top, varied
          enemySpriteKey
        );

        enemy.setVelocityY((100 + level * 2) * 0.7); // Standard speed
        enemy.setDisplaySize(32, 32);
        enemy.hp = (this.scene.baseEnemyHp || 1) + Math.floor((level - 1) / 2); // Standard HP
        enemy.isBoss = false;

        // this.scene.enemiesSpawned++; // Do not increment global this.scene.enemiesSpawned for this special wave,
                                      // as it might interfere with normal wave completion logic.
                                      // Or, decide if these count towards "wave total". For an anti-buff, maybe they shouldn't clear the wave.
      });
    }
    SoundManager.play(this.scene, 'boss_spawn'); // Re-use a dramatic sound
  }
}
