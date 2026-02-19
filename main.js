// main.js

/*
 * 🌹 AVRE CLIENT CORE
 * Architect: Alan Victor Rocha Evangelista
 * ---------------------------------------
 * "Code is poetry written in logic."
 */

// 🎬 Importação das cenas principais do jogo
import api from './src/api.js';
import nftService from './src/web3/nft-service.js';
import bcoinService from './src/web3/bcoin-service.js';
import GameEventEmitter from './src/utils/GameEventEmitter.js';
import TermsScene from './src/scenes/TermsScene.js';
import HomeScene from './src/scenes/HomeScene.js';
import LoadingScene from './src/scenes/LoadingScene.js';
import StartScene from './src/scenes/StartScene.js';
import MenuScene from './src/scenes/MenuScene.js';
import WorldMapScene from './src/scenes/WorldMapScene.js';
import GameScene from './src/scenes/GameScene.js';
import GameOverScene from './src/scenes/GameOverScene.js';
import ProfileScene from './src/scenes/ProfileScene.js';
import CharacterSelectionScene from './src/scenes/CharacterSelectionScene.js';
import AuthChoiceScene from './src/scenes/AuthChoiceScene.js';
import HUDScene from './src/scenes/HUDScene.js';
import PauseScene from './src/scenes/PauseScene.js';
import NotificationScene from './src/scenes/NotificationScene.js';
import AltarScene from './src/scenes/AltarScene.js';
import PvpScene from './src/scenes/PvpScene.js';
import TournamentLobbyScene from './src/scenes/TournamentLobbyScene.js';
import TournamentBracketScene from './src/scenes/TournamentBracketScene.js';
import OverlayManager from './src/ui/OverlayManager.js';

// --- Hardcoded Debug Mode ---
// This constant provides a simple, reliable way to toggle debug features
// without relying on the broken Vite environment variable system.
window.DEBUG_MODE = true;
// --------------------------

// ⚙️ Configurações gerais do Phaser
const config = {
  type: Phaser.AUTO,
  parent: 'game-container', // Ensure canvas is attached to our controlled container
  width: 480,
  height: 800,
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      // Definitive Fix: Set debug mode directly and safely based on the global constant.
      // This removes the unreliable preBoot callback that was causing the crash.
      debug: window.DEBUG_MODE,
      gravity: { y: 0 },
    },
  },
  dom: {
    createContainer: true,
    parent: 'phaser-dom-container', // Especifica o contêiner pai
  },
  scene: [
    // NEW ENTRY POINT: HomeScene provides a lightweight landing page.
    HomeScene,
    // LoadingScene follows, handling heavy asset loading and initialization.
    LoadingScene,
    TermsScene,
    StartScene,
    AuthChoiceScene,
    MenuScene,
    WorldMapScene,
    GameScene,
    GameOverScene,
    ProfileScene,
    CharacterSelectionScene,
    HUDScene,
    PauseScene,
    NotificationScene,
    AltarScene,
    PvpScene,
    TournamentLobbyScene,
    TournamentBracketScene,
  ],
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

// 🎬 Start Game Logic
window.launchGame = function () {
  console.log(
    '%cCreated with passion by AVRE 🌹',
    'color: #DC143C; font-weight: bold; font-size: 16px;'
  );
  console.log('🚀 Launching Phaser...');

  // 🚀 Criação da instância do jogo
  const game = new Phaser.Game(config);
  window.game = game; // Expose for testing and automation
};

// Esperar o DOM estar completamente carregado
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded. Waiting for user interaction...');

  // Set up wallet event listeners as the app starts
  setupWalletListeners();

  // Expose services for E2E testing
  window.nftService = nftService;
  window.api = api;
  window.bcoinService = bcoinService;
  window.GameEventEmitter = GameEventEmitter;

  // Setup Landing Page Button
  const startBtn = document.getElementById('start-game-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      console.log('🚀 Entering Arcade Mode...');
      const landingPage = document.getElementById('landing-page');

      // Hide Landing Page
      if (landingPage) {
        landingPage.style.display = 'none';
      }

      // Initialize Overlay Manager
      try {
        const overlayManager = new OverlayManager();
        overlayManager.init();
      } catch (error) {
        console.error('CRITICAL: Failed to initialize Overlay.', error);
        alert('System Error: Overlay failed to load. Checking console.');
        // Fallback or recovery could go here
      }
    });
  }

  // 🧪 Captura de erros em tempo de execução (útil para debug em produção)
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.warn('Erro capturado no jogo: ' + msg);
    console.error(
      'Detalhes do Erro:',
      msg,
      'Arquivo:',
      url,
      'Linha:',
      lineNo,
      'Coluna:',
      columnNo,
      'Erro Obj:',
      error
    );
  };
});

/**
 * Sets up listeners for critical wallet events like account or network changes.
 * To ensure the application state stays synchronized with the user's wallet,
 * the page is reloaded upon detection of these events.
 */
function setupWalletListeners() {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      console.log('Account changed, reloading page...');
      window.location.reload();
    });

    window.ethereum.on('chainChanged', (chainId) => {
      console.log('Network changed, reloading page...');
      window.location.reload();
    });
  }
}
