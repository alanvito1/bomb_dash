import SoundManager from '../utils/sound.js';

export default class PowerupLogic {
  constructor(scene) {
    this.scene = scene;
    if (!this.scene.activePowerups) {
        this.scene.activePowerups = {};
    }
    this.activePowerups = this.scene.activePowerups;
  }

  spawn(x, y) {
    // Chance de spawn permanece 12%
    if (Phaser.Math.Between(1, 100) <= 12) {
      // Agora inclui tipos 1-8 (5 power-ups, 3 anti-buffs)
      const type = Phaser.Math.Between(1, 8);
      const key = `powerup${type}`; // Assets powerup6, powerup7, powerup8 devem existir
      const powerup = this.scene.powerups.create(x, y, key);
      if (powerup) {
        powerup.setVelocityY(80);
        powerup.setDisplaySize(30, 30);
      } else {
        console.warn(`[PowerupLogic] Falha ao criar powerup com a chave: ${key}`);
      }
    }
  }

  collect(player, powerup) {
    const id = powerup?.texture?.key;

    if (!id || typeof id !== 'string' || !id.startsWith('powerup')) {
      console.warn('[PowerupLogic] Power-up com ID/textura inválida:', powerup);
      powerup?.destroy();
      return;
    }

    powerup.destroy();
    SoundManager.play(this.scene, 'powerup_collect');

    let currentEffectDuration = (id === 'powerup6' || id === 'powerup7' || id === 'powerup8') ? 15000 : 10000; // Anti-buffs now 15s

    // Show message for anti-buffs
    const antiBuffColor = '#ff6666'; // A reddish color for warnings
    if (id === 'powerup6') {
      this.scene.hud?.showTemporaryMessage?.('MORE ENEMIES!', 3000, antiBuffColor);
    } else if (id === 'powerup7') {
      this.scene.hud?.showTemporaryMessage?.('FASTER SPAWNS!', 3000, antiBuffColor);
    } else if (id === 'powerup8') {
      this.scene.hud?.showTemporaryMessage?.('BOMB SIZE DOWN!', 3000, antiBuffColor);
    }


    if (this.activePowerups[id] && this.activePowerups[id].event) {
        this.activePowerups[id].event.remove(false);
    }

    // Se o power-up não está ativo ou não tem tempo (ex: vida extra), aplica o efeito.
    // Se já está ativo, apenas soma o tempo (exceto para vida extra e dano que stackam).
    if (!this.activePowerups[id] || typeof this.activePowerups[id].time !== 'number') {
      this.activePowerups[id] = { time: 0 };
      this.applyEffect(id);
      this.activePowerups[id].time = currentEffectDuration;
    } else {
      this.activePowerups[id].time += currentEffectDuration;
      // Reaplicar efeitos que stackam ou são incrementais
      if (id === 'powerup3' || id === 'powerup5') { // powerup3 (Dano), powerup5 (Vida Extra)
          this.applyEffect(id);
      }
      // Anti-buffs geralmente não stackam, apenas resetam sua duração ou o mais forte prevalece.
      // Para esta implementação, apenas resetamos/estendemos a duração.
      // Se um anti-buff for coletado novamente, o applyEffect é chamado para garantir que o estado correto seja definido.
      if (id === 'powerup6' || id === 'powerup7' || id === 'powerup8') {
          this.applyEffect(id); // Garante que o estado do anti-buff seja o correto
      }
    }

    this.scene.hud?.showPowerup?.(id, this.activePowerups[id].time / 1000);

    this.activePowerups[id].event = this.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const entry = this.activePowerups[id];
        if (!entry || typeof entry.time !== 'number') {
            if(this.activePowerups[id] && this.activePowerups[id].event) {
                this.activePowerups[id].event.remove(false);
            }
            return;
        }
        entry.time -= 1000;
        if (entry.time <= 0) {
          this.removeEffect(id);
          if (this.activePowerups[id] && this.activePowerups[id].event) {
            this.activePowerups[id].event.remove(false);
          }
          delete this.activePowerups[id];
          this.scene.hud?.removePowerup?.(id);
          SoundManager.play(this.scene, 'powerup_expire');
        } else {
          this.scene.hud?.showPowerup?.(id, entry.time / 1000);
        }
      }
    });
  }

  applyEffect(id) {
    const stats = this.scene.playerStats;
    if (!stats) {
        console.error("[PowerupLogic] playerStats não encontrado na cena!");
        return;
    }
    // Assegura que DEFAULT_STATS está disponível na cena para powerup8
    const DEFAULT_BOMB_SIZE = this.scene.DEFAULT_STATS?.bombSize || 1;

    console.log(`[PowerupLogic] Aplicando efeito para: ${id}`);
    switch (id) {
      case 'powerup1': // Fire Rate
        stats.fireRate = Math.max(100, stats.fireRate - 100);
        this._refreshBombTimer();
        break;
      case 'powerup2': // MultiShot
        stats.multiShot = Math.min((stats.multiShot || 0) + 1, 3);
        break;
      case 'powerup3': // AUMENTAR DANO
        stats.damage = (stats.damage || 1) + 1;
        console.log(`[PowerupLogic] Dano aumentado para: ${stats.damage}`);
        break;
      case 'powerup4': // AUMENTAR TAMANHO DA BOMBA
        stats.bombSize = (stats.bombSize || 1) * 1.5;
        console.log(`[PowerupLogic] Tamanho da bomba aumentado para: ${stats.bombSize}`);
        break;
      case 'powerup5': // VIDA EXTRA
        stats.extraLives = (stats.extraLives || 0) + 1;
        console.log(`[PowerupLogic] Vida extra. Vidas agora: ${stats.extraLives}`);
        break;

      // Anti-Buffs (Power-downs)
      case 'powerup6': // More Enemies - Instant Wave
        if (this.scene.enemySpawner && typeof this.scene.enemySpawner.spawnImmediateWave === 'function') {
          const waveSize = 10 + Math.floor((this.scene.level || 1) / 5); // Example: 10 enemies + 1 per world
          this.scene.enemySpawner.spawnImmediateWave(waveSize);
          console.log(`[PowerupLogic] Anti-buff: Spawned immediate wave of ${waveSize} enemies.`);
        } else {
          console.warn('[PowerupLogic] EnemySpawner or spawnImmediateWave method not found for powerup6.');
        }
        // No longer setting enemySpawnMultiplierActive, this is an instant effect.
        // If we want it to *also* multiply regular spawns during its duration, that would be an addition.
        // For now, focusing on the "instant wave" aspect.
        break;
      case 'powerup7': // Acelerar Spawn de Inimigos
        if (!this.scene.enemySpawnSpeedActive && this.scene.enemySpawner && typeof this.scene.enemySpawner.getSpawnInterval === 'function') {
          this.scene.originalEnemySpawnInterval = this.scene.enemySpawner.getSpawnInterval();
          if (typeof this.scene.enemySpawner.setSpawnInterval === 'function') {
            this.scene.enemySpawner.setSpawnInterval(this.scene.originalEnemySpawnInterval / 2); // Ou fator
          }
        } else if (!this.scene.enemySpawner || typeof this.scene.enemySpawner.getSpawnInterval !== 'function') {
             console.warn('[PowerupLogic] EnemySpawner ou seus métodos de intervalo não encontrados na cena para powerup7.');
        }
        this.scene.enemySpawnSpeedActive = true; // Flag for faster spawn interval
        this.scene.increaseEnemySpeedActive = true; // Flag for faster enemy movement
        console.log('[PowerupLogic] Anti-buff: Acelerar Spawn de Inimigos E Velocidade de Movimento ATIVADO');
        break;
      case 'powerup8': // Diminuir Tamanho do Tiro
        if (!this.scene.bombSizeDebuffActive) {
          // Salva o tamanho atual APENAS se o debuff não estiver ativo, para não sobrescrever com o tamanho já reduzido
          this.scene.playerStats.originalBombSizeForDebuff = stats.bombSize;
        }
        stats.bombSize = DEFAULT_BOMB_SIZE; // Usa o DEFAULT_BOMB_SIZE da GameScene
        this.scene.bombSizeDebuffActive = true;
        console.log(`[PowerupLogic] Anti-buff: Tamanho do Tiro DIMINUÍDO para ${stats.bombSize}`);
        break;

      default:
        console.warn(`[PowerupLogic] Tipo de power-up desconhecido ao aplicar: ${id}`);
    }
    this.scene.hud?.updateHUD?.();
  }

  removeEffect(id) {
    const stats = this.scene.playerStats;
     if (!stats) {
        console.error("[PowerupLogic] playerStats não encontrado na cena ao remover efeito!");
        return;
    }
    const DEFAULT_BOMB_SIZE = this.scene.DEFAULT_STATS?.bombSize || 1;

    console.log(`[PowerupLogic] Removendo efeito para: ${id}`);
    switch (id) {
      case 'powerup1': // Fire Rate
        stats.fireRate += 100;
        this._refreshBombTimer();
        break;
      case 'powerup2': // MultiShot
        stats.multiShot = Math.max(0, (stats.multiShot || 0) - 1);
        break;
      case 'powerup3': // DANO
        stats.damage = Math.max(1, (stats.damage || 1) - 1);
        console.log(`[PowerupLogic] Dano revertido para: ${stats.damage}`);
        break;
      case 'powerup4': // TAMANHO DA BOMBA
        stats.bombSize = Math.max(DEFAULT_BOMB_SIZE, (stats.bombSize || DEFAULT_BOMB_SIZE) / 1.5); // Reverte para o tamanho original ou o base
        console.log(`[PowerupLogic] Tamanho da bomba revertido para: ${stats.bombSize}`);
        break;
      // case 'powerup5': // VIDA EXTRA - Não tem remoção.

      // Anti-Buffs (Power-downs)
      case 'powerup6': // More Enemies - Instant Wave
        // This is now an instant effect, no specific removal logic needed unless it also applies a timed multiplier.
        // If it only spawns an instant wave, this removal part is not strictly necessary for that aspect.
        console.log('[PowerupLogic] Anti-buff: More Enemies (instant wave) effect period ended (no specific state to revert for instant part).');
        break;
      case 'powerup7': // Acelerar Spawn de Inimigos
        if (this.scene.enemySpawner && typeof this.scene.enemySpawner.setSpawnInterval === 'function' && this.scene.originalEnemySpawnInterval) {
          this.scene.enemySpawner.setSpawnInterval(this.scene.originalEnemySpawnInterval);
        } else if (!this.scene.enemySpawner || typeof this.scene.enemySpawner.setSpawnInterval !== 'function') {
            console.warn('[PowerupLogic] EnemySpawner ou setSpawnInterval não encontrado na cena ao remover powerup7.');
        }
        this.scene.enemySpawnSpeedActive = false;
        this.scene.increaseEnemySpeedActive = false; // Revert enemy speed flag
        console.log('[PowerupLogic] Anti-buff: Acelerar Spawn de Inimigos E Velocidade de Movimento DESATIVADO');
        break;
      case 'powerup8': // Diminuir Tamanho do Tiro
        // Restaura para o tamanho que era ANTES do debuff ser aplicado.
        // Se outro power-up de tamanho foi pego ENQUANTO o debuff estava ativo, esta lógica simples pode precisar de ajuste.
        // Por agora, ela restaura para o valor salvo quando o debuff foi ativado pela primeira vez.
        if (typeof stats.originalBombSizeForDebuff !== 'undefined') {
             stats.bombSize = stats.originalBombSizeForDebuff;
        } else {
            stats.bombSize = DEFAULT_BOMB_SIZE; // Fallback se originalBombSizeForDebuff não foi setado
        }
        this.scene.bombSizeDebuffActive = false;
        console.log(`[PowerupLogic] Anti-buff: Tamanho do Tiro RESTAURADO para ${stats.bombSize}`);
        break;

      default:
        console.warn(`[PowerupLogic] Tipo de power-up desconhecido ao remover: ${id}`);
    }
    this.scene.hud?.updateHUD?.();
  }

  _refreshBombTimer() {
    if (this.scene.bombTimer) {
      this.scene.bombTimer.remove(false);
    }
    if (this.scene.playerStats && typeof this.scene.playerStats.fireRate === 'number') { // Adicionado check
        this.scene.bombTimer = this.scene.time.addEvent({
        delay: this.scene.playerStats.fireRate,
        loop: true,
        callback: () => {
            if (this.scene && typeof this.scene.fireBomb === 'function' && this.scene.player?.active) { // Adicionado this.scene.player?.active
            this.scene.fireBomb();
            }
        }
        });
    } else {
        console.warn('[PowerupLogic] fireRate inválido ou playerStats não definido ao tentar refreshBombTimer.');
    }
  }
}
