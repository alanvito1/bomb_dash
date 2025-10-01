// src/utils/sound.js

export default class SoundManager {
  static loadFromManifest(scene, manifest) {
    if (!scene || !scene.load || !manifest || !manifest.sounds) {
      console.error('[SoundManager] Cena, loader ou manifesto inválido para carregar sons');
      return;
    }

    const { music, sfx } = manifest.sounds;

    // Carregar músicas
    for (const key in music) {
      const path = music[key];
      scene.load.audio(key, path);
      console.log(`[SoundManager] Carregando música: ${key} (${path})`);
    }

    // Carregar efeitos sonoros
    for (const key in sfx) {
      const path = sfx[key];
      scene.load.audio(key, path);
      console.log(`[SoundManager] Carregando SFX: ${key} (${path})`);
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
