import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class ConfigScene extends Phaser.Scene {
  constructor() {
    super('ConfigScene');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.add.text(centerX, 80, LanguageManager.get('config_title'), {
      fontSize: '28px',
      fill: '#ffffff',
      fontFamily: 'monospace'
    }).setOrigin(0.5);

    let musicEnabled = this.registry.get('musicEnabled') ?? true;
    let sfxEnabled = this.registry.get('sfxEnabled') ?? true;
    let volume = this.registry.get('volume') ?? 0.5;

    const musicLabel = () => LanguageManager.get(musicEnabled ? 'config_music_on' : 'config_music_off');
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

    const sfxLabel = () => LanguageManager.get(sfxEnabled ? 'config_sfx_on' : 'config_sfx_off');
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

    const volumeLabel = () => LanguageManager.get('config_volume', { volume: Math.round(volume * 100) });
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

    this.add.text(centerX, 350, LanguageManager.get('config_reset_data'), {
      fontSize: '20px',
      fill: '#ff5555',
      fontFamily: 'monospace'
    })
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerdown', () => {
        SoundManager.play(this, 'click');
        if (confirm(LanguageManager.get('config_reset_confirm'))) {
          localStorage.clear();
          this.scene.start('MenuScene');
        }
      });

    this.add.text(centerX, 420, LanguageManager.get('config_back'), {
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
