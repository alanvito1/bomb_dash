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
    }

    // Carregar efeitos sonoros
    for (const key in sfx) {
      const path = sfx[key];
      scene.load.audio(key, path);
    }
  }

  static play(scene, key, config = {}) {
    if (!scene?.sound) {
      console.error('[SoundManager] Cena inválida para tocar som:', key);
      return;
    }
    // Simple sfx play, assuming they are small and decode fast.
    scene.sound.play(key, config);
  }

  /**
   * Toca uma música de forma robusta, lidando com a decodificação assíncrona.
   * Garante que a música só toque quando estiver pronta.
   * @param {Phaser.Scene} scene - A cena que está tocando a música.
   * @param {string} key - A chave do recurso de áudio da música.
   */
  static playMusic(scene, key) {
    if (!scene?.sound) {
      console.error('[SoundManager] Cena inválida para tocar música:', key);
      return;
    }

    // Para qualquer música que esteja tocando atualmente para evitar sobreposição
    if (scene.currentMusicKey && scene.currentMusicKey !== key) {
      const oldMusic = scene.sound.get(scene.currentMusicKey);
      if (oldMusic && oldMusic.isPlaying) {
        oldMusic.stop();
      }
    }
    // Se a música já for a mesma, não faz nada.
    else if (scene.currentMusicKey === key && scene.sound.get(key)?.isPlaying) {
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

    // Função para tocar a música, a ser chamada quando o áudio estiver pronto
    const play = () => {
      if (music && !music.isPlaying) {
        music.play();
        scene.currentMusicKey = key; // Rastreia a música atual
        console.log(`[SoundManager] 🎵 Música ${key} iniciada.`);
      }
    };

    // 1.2: Fix Audio Race Condition.
    // Verifica se o áudio está decodificado. Se não, espera pelo evento 'decoded'.
    if (music.isDecoded) {
      play();
    } else {
      console.log(`[SoundManager] Música ${key} não está decodificada. Aguardando...`);
      music.once('decoded', play);
    }
  }

  static stop(scene, key) {
    if (!scene?.sound) return;

    const sound = scene.sound.get(key);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
  }

  static stopAll(scene) {
    if (!scene?.sound) return;
    scene.sound.stopAll();
  }

  static playWorldMusic(scene, worldNumber) {
    if (!scene?.sound) return;
    const musicKey = `world${Math.min(worldNumber, 5)}_music`;
    this.playMusic(scene, musicKey);
  }
}
