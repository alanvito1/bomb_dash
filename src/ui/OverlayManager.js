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

  async init() {
    console.log('🕹️ Arcade Overlay Initialized');
    this.container.style.display = 'flex';

    // Initialize Audio
    this.audio = new Audio('/assets/audio/menu.mp3');
    this.audio.volume = 0.2;

    // Check for previous acceptance
    const termsAccepted = localStorage.getItem('termsAccepted');

    // Ensure LanguageManager is ready before showing UI
    const mockScene = { registry: { set: () => {} } };
    try {
      await LanguageManager.init(mockScene);
    } catch (e) {
      console.warn('Language Init Failed', e);
    }

    if (termsAccepted === 'true') {
      console.log('[Overlay] Terms already accepted. Proceeding to Auth Gate.');
      this.checkSession();
    } else {
      this.tosManager.init();
    }
  }

  async checkSession() {
    // In Offline Mode, we skip supabase session check.
    // We show the auth menu (Identification) where only Guest is active,
    // or skip directly to guest if we want absolute friction-less.
    // Let's show the auth menu as the Identifty/Identification gate.
    console.log('[Overlay] Offline Mode: Showing Auth Gate.');
    this.showAuthMenu();
  }

  startGameWithUser(user) {
    // Hide Overlay
    this.container.style.display = 'none';
    this.showGameContainer();

    // Launch Game with User
    if (window.launchGame) {
      requestAnimationFrame(() => {
        window.launchGame(user);
      });
    } else {
      console.error('Game Launcher not found!');
    }
  }

  startGameAsGuest() {
    console.log('[Overlay] Starting as Guest...');
    // Hide Overlay
    this.container.style.display = 'none';
    this.showGameContainer();

    // Launch Game (No User -> Guest Mode)
    if (window.launchGame) {
      requestAnimationFrame(() => {
        window.launchGame(null);
      });
    } else {
      console.error('Game Launcher not found!');
    }
  }

  showGameContainer() {
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.style.display = 'block';
    }
  }

  // Deprecated Alias for compatibility
  startGameDirectly() {
    this.startGameAsGuest();
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
