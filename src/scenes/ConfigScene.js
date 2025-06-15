import SoundManager from '../utils/sound.js';

export default class ConfigScene extends Phaser.Scene {
  constructor() {
    super('ConfigScene');
  }

  preload() {
    SoundManager.loadAll(this);
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.text(centerX, 80, 'SETTINGS', {
      fontSize: '28px',
      fill: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    // Carrega configurações
    let musicEnabled = this.registry.get('musicEnabled') ?? true;
    let sfxEnabled = this.registry.get('sfxEnabled') ?? true;
    let volume = this.registry.get('volume') ?? 0.5;

    // === Música ===
    const musicLabel = () => `[ MUSIC: ${musicEnabled ? 'ON' : 'OFF'} ]`;
    const musicText = this.add.text(centerX, 150, musicLabel(), {
      fontSize: '20px',
      fill: '#ffff00',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive();

    musicText.on('pointerdown', () => {
      musicEnabled = !musicEnabled;
      this.registry.set('musicEnabled', musicEnabled);
      localStorage.setItem('musicEnabled', musicEnabled);
      musicText.setText(musicLabel());

      const music = this.sound.get(this.scene.key === 'MenuScene' ? 'menu_music' : 'background_music');
      if (music) {
        musicEnabled ? music.play() : music.pause();
      }

      SoundManager.play(this, 'click');
    });

    // === Efeitos Sonoros ===
    const sfxLabel = () => `[ SFX: ${sfxEnabled ? 'ON' : 'OFF'} ]`;
    const sfxText = this.add.text(centerX, 210, sfxLabel(), {
      fontSize: '20px',
      fill: '#00ffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive();

    sfxText.on('pointerdown', () => {
      sfxEnabled = !sfxEnabled;
      this.registry.set('sfxEnabled', sfxEnabled);
      localStorage.setItem('sfxEnabled', sfxEnabled);
      sfxText.setText(sfxLabel());

      SoundManager.play(this, 'click');
    });

    // === Volume ===
    const volumeLabel = () => `[ VOLUME: ${Math.round(volume * 100)}% ]`;
    const volumeText = this.add.text(centerX, 270, volumeLabel(), {
      fontSize: '20px',
      fill: '#00ff88',
      fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive();

    volumeText.on('pointerdown', () => {
      volume += 0.25;
      if (volume > 1) volume = 0;

      this.registry.set('volume', volume);
      localStorage.setItem('volume', volume);
      this.sound.volume = volume;

      volumeText.setText(volumeLabel());
      SoundManager.play(this, 'click');
    });

    // === Reset ===
    this.add.text(centerX, 350, '[ RESET GAME DATA ]', {
      fontSize: '20px',
      fill: '#ff5555',
      fontFamily: 'monospace'
    })
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', () => {
        SoundManager.play(this, 'click');
        if (confirm('This will erase all progress. Are you sure?')) {
          localStorage.clear();
          this.scene.start('MenuScene');
        }
      });

    // === Voltar ===
    this.add.text(centerX, 420, '[ BACK ]', {
      fontSize: '20px',
      fill: '#00ffff',
      fontFamily: 'monospace'
    })
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', () => {
        SoundManager.play(this, 'click');
        this.scene.start('MenuScene');
      });
  }
}
