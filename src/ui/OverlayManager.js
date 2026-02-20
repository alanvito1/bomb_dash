import ToSManager from './ToSManager.js';
import AuthManager from './AuthManager.js';
import LanguageManager from '../utils/LanguageManager.js';

export default class OverlayManager {
  constructor() {
    this.container = document.getElementById('ui-layer');
    this.tosManager = new ToSManager(this);
    this.authManager = new AuthManager(this);
    this.audio = null;
  }

  init() {
    console.log('🕹️ Arcade Overlay Initialized');
    this.container.style.display = 'flex';

    // Initialize Audio
    this.audio = new Audio('/assets/audio/menu.mp3');
    this.audio.volume = 0.2;
    // this.audio.loop = true; // Optional: Loop background ambient?

    // Check for previous acceptance
    const termsAccepted = localStorage.getItem('termsAccepted');

    if (termsAccepted === 'true') {
      console.log('[Overlay] Terms already accepted. Launching Game directly.');
      this.startGameDirectly();
      return;
    }

    // Ensure LanguageManager is ready before showing ToS
    const mockScene = { registry: { set: () => {} } };

    LanguageManager.init(mockScene)
      .then(() => {
        this.tosManager.init();
      })
      .catch((e) => {
        console.warn('Language Init Failed', e);
        this.tosManager.init(); // Proceed anyway
      });
  }

  startGameDirectly() {
    // Hide Overlay
    this.container.style.display = 'none';

    // Show Game Container
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.style.display = 'block';
    }

    // Launch Game
    if (window.launchGame) {
      requestAnimationFrame(() => {
        window.launchGame();
      });
    } else {
      console.error('Game Launcher not found!');
    }
  }

  playSound(type) {
    if (type === 'click') {
      this.playSynthClick();
    }
  }

  playSynthClick() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Audio Context Error', e);
    }
  }

  // Deprecated Flow: Only used if we explicitly want to show auth menu
  showAuthMenu() {
    this.authManager.init();
  }
}
