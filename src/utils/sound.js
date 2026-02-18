/**
 * @class SoundManager
 * @description A static utility class to manage all game audio, including music and sound effects.
 * It handles loading, playing, and stopping sounds, and manages volume levels for master,
 * music, and SFX channels, persisting settings to localStorage.
 */
export default class SoundManager {
  /** @type {number} The master volume for all game audio. */
  static masterVolume = 1;
  /** @type {number} The volume for background music. */
  static musicVolume = 1;
  /** @type {number} The volume for sound effects. */
  static sfxVolume = 1;
  /** @type {boolean} Flag to ensure initialization only occurs once. */
  static initialized = false;
  /** @type {Map<string, Phaser.Sound.BaseSound>} A map to store and manage music instances. */
  static music = new Map();

  /**
   * Initializes the SoundManager. It loads volume settings from localStorage
   * and applies the master volume to the global Phaser sound object.
   * @param {Phaser.Scene} scene - The Phaser scene instance.
   */
  static init(scene) {
    if (this.initialized) {
      return;
    }
    console.log('[SoundManager] Initializing...');

    this.masterVolume = parseFloat(localStorage.getItem('masterVolume') ?? 1.0);
    this.musicVolume = parseFloat(localStorage.getItem('musicVolume') ?? 1.0);
    this.sfxVolume = parseFloat(localStorage.getItem('sfxVolume') ?? 1.0);

    if (scene && scene.sound) {
      scene.sound.volume = this.masterVolume;
    }
    this.initialized = true;

    console.log(
      `[SoundManager] Volumes Loaded: Master=${this.masterVolume}, Music=${this.musicVolume}, SFX=${this.sfxVolume}`
    );
  }

  /**
   * Sets the master volume for all sounds and persists it to localStorage.
   * @param {Phaser.Scene} scene - The Phaser scene instance to apply the volume.
   * @param {number} volume - The volume level (0 to 1).
   */
  static setMasterVolume(scene, volume) {
    this.masterVolume = Phaser.Math.Clamp(volume, 0, 1);
    localStorage.setItem('masterVolume', this.masterVolume.toString());
    if (scene && scene.sound) {
      scene.sound.volume = this.masterVolume;
    }
    console.log(`[SoundManager] Master Volume set to ${this.masterVolume}`);
  }

  /**
   * Sets the volume for music tracks and persists it to localStorage.
   * Updates the volume of any currently playing music.
   * @param {number} volume - The volume level (0 to 1).
   */
  static setMusicVolume(volume) {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
    localStorage.setItem('musicVolume', this.musicVolume.toString());
    this.music.forEach((musicInstance) => {
      if (musicInstance.isPlaying) {
        musicInstance.setVolume(this.musicVolume);
      }
    });
    console.log(`[SoundManager] Music Volume set to ${this.musicVolume}`);
  }

  /**
   * Sets the volume for sound effects and persists it to localStorage.
   * @param {number} volume - The volume level (0 to 1).
   */
  static setSfxVolume(volume) {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
    localStorage.setItem('sfxVolume', this.sfxVolume.toString());
    console.log(`[SoundManager] SFX Volume set to ${this.sfxVolume}`);
  }

  /**
   * Plays a sound effect, applying the current SFX volume.
   * It waits for the sound to be decoded before playing to prevent race conditions.
   * @param {Phaser.Scene} scene - The scene in which to play the sound.
   * @param {string} key - The key of the sound effect to play.
   * @param {Phaser.Types.Sound.SoundConfig} [config={}] - Optional configuration for the sound.
   */
  static play(scene, key, config = {}) {
    if (!scene?.sound) {
      console.error('[SoundManager] Invalid scene for playing sound:', key);
      return;
    }

    // Guard clause: if audio not in cache, fallback to synthetic to prevent crash
    if (!scene.cache.audio.exists(key)) {
      console.warn(`[SoundManager] Audio key "${key}" missing. Using synthetic fallback.`);
      this.generateSyntheticSound(scene, key);
      return;
    }

    const sfxConfig = { ...config, volume: this.sfxVolume };
    const sfx = scene.sound.add(key, sfxConfig);

    const playAction = () => sfx?.play();

    if (sfx.isDecoded) {
      playAction();
    } else {
      sfx.once('decoded', playAction);
    }
  }

  /**
   * Generates a synthetic sound using Web Audio API to prevent crashes when assets are missing.
   * @param {Phaser.Scene} scene - The scene context.
   * @param {string} key - The type of sound to emulate (key name).
   */
  static generateSyntheticSound(scene, key) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = scene?.sound?.context || new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const now = ctx.currentTime;
      const vol = 0.1 * this.sfxVolume;

      // Connect graph
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Determine sound type based on key string
      if (key.includes('explosion') || key.includes('bomb') || key.includes('fire')) {
        // White Noise Approximation (using random frequency modulation for chaos)
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(10, now + 0.2);
        gain.gain.setValueAtTime(vol * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);

      } else if (key.includes('click') || key.includes('menu') || key.includes('ui')) {
        // High Blip
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);

      } else if (key.includes('wave') || key.includes('powerup')) {
        // Rising Tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.5);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);

      } else {
        // Default Generic Blip
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      }

    } catch (e) {
      console.warn('[SoundManager] Failed to generate synthetic audio', e);
    }
  }

  /**
   * Generates a synthetic 8-bit beep using Web Audio API.
   * Legacy wrapper for backward compatibility.
   */
  static playClick(scene) {
    this.play(scene, 'click'); // Will use fallback if 'click' is missing
  }

  /**
   * Plays a music track, ensuring it loops. It stops all other music first.
   * Returns a promise that resolves when the music starts playing.
   * @param {Phaser.Scene} scene - The scene in which to play the music.
   * @param {string} key - The key of the music track.
   * @returns {Promise<Phaser.Sound.BaseSound>} A promise that resolves with the sound instance.
   */
  static playMusic(scene, key) {
    return new Promise((resolve, reject) => {
      if (!scene?.sound) {
        const errorMsg = `[SoundManager] Invalid scene for playing music: ${key}`;
        console.error(errorMsg);
        return resolve(null); // Resolve null instead of reject to prevent crash
      }

      if (!scene.cache.audio.exists(key)) {
        console.warn(`[SoundManager] Music key "${key}" not found. Skipping.`);
        // Don't reject, just resolve null to allow flow to continue
        return resolve(null);
      }

      this.stopAllMusic();

      let musicInstance = this.music.get(key);
      if (!musicInstance) {
        musicInstance = scene.sound.add(key, {
          loop: true,
          volume: this.musicVolume,
        });
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

  /**
   * Stops a specific sound if it is playing.
   * @param {Phaser.Scene} scene - The scene containing the sound.
   * @param {string} key - The key of the sound to stop.
   */
  static stop(scene, key) {
    const sound = scene.sound.get(key);
    if (sound?.isPlaying) sound.stop();
  }

  /**
   * Stops all sounds in a given scene, including music.
   * @param {Phaser.Scene} scene - The scene in which to stop all sounds.
   */
  static stopAll(scene) {
    if (scene && scene.sound) {
      scene.sound.stopAll();
    }
    this.music.clear();
  }

  /**
   * Stops all currently playing music tracks managed by the SoundManager.
   */
  static stopAllMusic() {
    this.music.forEach((musicInstance) => {
      if (musicInstance.isPlaying) {
        musicInstance.stop();
      }
    });
  }

  /**
   * Plays the appropriate music for a given world number.
   * @param {Phaser.Scene} scene - The scene in which to play the music.
   * @param {number} worldNumber - The number of the world.
   * @returns {Promise<void>}
   */
  static async playWorldMusic(scene, worldNumber) {
    if (!scene?.sound) return;
    const musicKey = `world${Math.min(worldNumber, 5)}_music`;
    await this.playMusic(scene, musicKey); // Try to play, but don't catch error as we now resolve null
  }
}
