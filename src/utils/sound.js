// src/utils/sound.js

export default class SoundManager {
  static masterVolume = 1;
  static musicVolume = 1;
  static sfxVolume = 1;
  static initialized = false;
  static music = new Map(); // Armazena instâncias de música para controle de volume

  static init(scene) {
    if (this.initialized) {
      return;
    }
    console.log('[SoundManager] Inicializando...');

    // Carrega as configurações de volume do localStorage ou usa valores padrão
    this.masterVolume = parseFloat(localStorage.getItem('masterVolume') ?? 1.0);
    this.musicVolume = parseFloat(localStorage.getItem('musicVolume') ?? 1.0);
    this.sfxVolume = parseFloat(localStorage.getItem('sfxVolume') ?? 1.0);

    // Aplica o volume principal ao gerenciador de som global do Phaser
    if (scene && scene.sound) {
      scene.sound.volume = this.masterVolume;
    }
    this.initialized = true;

    console.log(`[SoundManager] Volumes Carregados: Master=${this.masterVolume}, Music=${this.musicVolume}, SFX=${this.sfxVolume}`);
  }

  // Setters para os volumes
  static setMasterVolume(scene, volume) {
    this.masterVolume = Phaser.Math.Clamp(volume, 0, 1);
    localStorage.setItem('masterVolume', this.masterVolume);
    if (scene && scene.sound) {
      scene.sound.volume = this.masterVolume; // Aplica globalmente
    }
    console.log(`[SoundManager] Master Volume set to ${this.masterVolume}`);
  }

  static setMusicVolume(volume) {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    localStorage.setItem('musicVolume', this.musicVolume);
    // Atualiza o volume de todas as músicas que estão tocando
    this.music.forEach(musicInstance => {
      if (musicInstance.isPlaying) {
        musicInstance.setVolume(this.musicVolume);
      }
    });
    console.log(`[SoundManager] Music Volume set to ${this.musicVolume}`);
  }

  static setSfxVolume(volume) {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    localStorage.setItem('sfxVolume', this.sfxVolume);
    console.log(`[SoundManager] SFX Volume set to ${this.sfxVolume}`);
  }

  static loadFromManifest(scene, manifest) {
    if (!scene || !scene.load || !manifest || !manifest.sounds) {
      console.error('[SoundManager] Cena, loader ou manifesto inválido para carregar sons');
      return;
    }

    const { music, sfx } = manifest.sounds;
    Object.keys(music).forEach(key => scene.load.audio(key, music[key]));
    Object.keys(sfx).forEach(key => scene.load.audio(key, sfx[key]));
  }

  static play(scene, key, config = {}) {
    if (!scene?.sound) {
      console.error('[SoundManager] Cena inválida para tocar som:', key);
      return;
    }
    // Aplica o volume de SFX ao som individual
    const sfxConfig = { ...config, volume: this.sfxVolume };
    const sfx = scene.sound.add(key, sfxConfig);

    const playAction = () => sfx?.play();

    if (sfx.isDecoded) {
      playAction();
    } else {
      sfx.once('decoded', playAction);
    }
  }

  static playMusic(scene, key) {
    return new Promise((resolve, reject) => {
      if (!scene?.sound) {
        const errorMsg = `[SoundManager] Invalid scene for playing music: ${key}`;
        console.error(errorMsg);
        return reject(new Error(errorMsg));
      }

      if (!scene.cache.audio.exists(key)) {
        const errorMsg = `[SoundManager] Audio key "${key}" not found in cache.`;
        console.error(errorMsg);
        return reject(new Error(errorMsg));
      }

      this.stopAllMusic();

      let musicInstance = this.music.get(key);
      if (!musicInstance) {
        musicInstance = scene.sound.add(key, { loop: true, volume: this.musicVolume });
        this.music.set(key, musicInstance);
      }

      musicInstance.setVolume(this.musicVolume);

      const play = () => {
        if (musicInstance && !musicInstance.isPlaying) {
          musicInstance.play();
          console.log(`[SoundManager] 🎵 Music ${key} started.`);
        }
        resolve(musicInstance);
      };

      if (musicInstance.isDecoded) {
        play();
      } else {
        console.log(`[SoundManager] Music ${key} is not decoded. Waiting...`);
        musicInstance.once('decoded', play);
      }
    });
  }

  static stop(scene, key) {
    const sound = scene.sound.get(key);
    if (sound?.isPlaying) sound.stop();
  }

  static stopAll(scene) {
    if (scene && scene.sound) {
        scene.sound.stopAll();
    }
    this.music.clear();
  }

  static stopAllMusic() {
    this.music.forEach(musicInstance => {
      if (musicInstance.isPlaying) {
        musicInstance.stop();
      }
    });
  }

  static async playWorldMusic(scene, worldNumber) {
    if (!scene?.sound) return;
    const musicKey = `world${Math.min(worldNumber, 5)}_music`;
    try {
      await this.playMusic(scene, musicKey);
    } catch (error) {
      console.error(`[SoundManager] Could not play world music for world ${worldNumber}.`, error);
    }
  }
}