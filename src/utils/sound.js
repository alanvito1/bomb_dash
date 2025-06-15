// src/utils/sound.js

export default class SoundManager {
  static loadAll(scene) {
    if (!scene || !scene.load) {
      console.error('[SoundManager] Cena inválida para carregar sons');
      return;
    }

    const sounds = [
      'menu_music', 'click', 'bomb_fire', 'explosion',
      'coin_collect', 'powerup_collect', 'enemy_death', 'boss_death',
      'gameover', 'next_stage', 'submit', 'pause', 'open_shop',
      'hit_enemy', 'player_hit', 'upgrade', 'wave_start',
      'boss_spawn', 'powerup_expire'
    ];

    sounds.forEach(key => {
      const mp3 = `src/assets/sounds/${key}.mp3`;
      const wav = `src/assets/sounds/${key}.wav`;
      scene.load.audio(key, [mp3, wav]);
      console.log(`[SoundManager] Carregando som: ${key} (${mp3}, ${wav})`);
    });

    // 🎶 Carregar músicas dos mundos (world1_music até world5_music)
    for (let i = 1; i <= 5; i++) {
      const key = `world${i}_music`;
      const mp3 = `src/assets/sounds/${key}.mp3`;
      const wav = `src/assets/sounds/${key}.wav`;
      scene.load.audio(key, [mp3, wav]);
      console.log(`[SoundManager] Carregando música do mundo: ${key} (${mp3}, ${wav})`);
    }
  }

  static play(scene, key, config = {}) {
    if (!scene?.sound) {
      console.error('[SoundManager] Cena inválida para tocar som:', key);
      return;
    }

    let sound = scene.sound.get(key);
    if (!sound) {
      try {
        sound = scene.sound.add(key, config);
      } catch (e) {
        console.error(`[SoundManager] Erro ao adicionar som ${key}:`, e);
        return;
      }
    }

    if (sound) {
      sound.play();
      console.log(`[SoundManager] 🔊 ${key} tocado`);
    }
  }

  static playMusic(scene, key) {
    if (!scene?.sound) {
      console.error('[SoundManager] Cena inválida para tocar música:', key);
      return;
    }

    let music = scene.sound.get(key);
    if (!music) {
      try {
        music = scene.sound.add(key, { loop: true, volume: 0.5 });
      } catch (e) {
        console.error(`[SoundManager] Erro ao adicionar música ${key}:`, e);
        return;
      }
    }

    if (!music.isPlaying) {
      music.play();
      console.log(`[SoundManager] 🎵 Música ${key} iniciada`);
    }
  }

  static stop(scene, key) {
    if (!scene?.sound) return;

    const sound = scene.sound.get(key);
    if (sound) {
      sound.stop();
      console.log(`[SoundManager] ⏹️ Som ${key} parado`);
    }
  }

  static stopAll(scene) {
    if (!scene?.sound) return;

    scene.sound.stopAll();
    console.log('[SoundManager] 🔇 Todos os sons parados');
  }

  static playWorldMusic(scene, worldNumber) {
    if (!scene?.sound) return;

    const nextKey = `world${Math.min(worldNumber, 5)}_music`;
    if (scene.currentMusicKey && scene.currentMusicKey !== nextKey) {
      this.stop(scene, scene.currentMusicKey);
    }

    this.playMusic(scene, nextKey);
    scene.currentMusicKey = nextKey;
  }
}
