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
import playerStateService from './src/services/PlayerStateService.js'; // Imported Service

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
window.DEBUG_MODE = true;
// --------------------------

// ⚙️ Configurações gerais do Phaser
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 480,
  height: 800,
  backgroundColor: '#050505',
  physics: {
    default: 'arcade',
    arcade: {
      debug: window.DEBUG_MODE,
      gravity: { y: 0 },
    },
  },
  dom: {
    createContainer: true,
    parent: 'phaser-dom-container',
  },
  scene: [
    HomeScene, // Entry
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
window.launchGame = async function () {
  console.log(
    '%cCreated with passion by AVRE 🌹',
    'color: #FF5F1F; font-weight: bold; font-size: 16px;'
  );
  console.log('🚀 Launching Phaser...');

  // Initialize Player State (Guest Mode by default if no auth)
  await playerStateService.init();

  // 🚀 Criação da instância do jogo
  const game = new Phaser.Game(config);
  window.game = game;

  // Pre-seed Registry for "Direct to Game" Flow
  // We can't access registry immediately because scenes aren't started.
  // We will let LoadingScene handle the reading of PlayerStateService.
};

// Esperar o DOM estar completamente carregado
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded. Waiting for user interaction...');

  setupWalletListeners();

  window.nftService = nftService;
  window.api = api;
  window.bcoinService = bcoinService;
  window.GameEventEmitter = GameEventEmitter;
  window.playerStateService = playerStateService; // Expose

  // Setup Landing Page Button
  const startBtn = document.getElementById('start-game-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      console.log('🚀 Entering Arcade Mode...');
      const landingPage = document.getElementById('landing-page');

      if (landingPage) {
        landingPage.style.display = 'none';
      }

      try {
        const overlayManager = new OverlayManager();
        window.overlayManager = overlayManager; // Expose globally for GameScene triggers
        overlayManager.init();
      } catch (error) {
        console.error('CRITICAL: Failed to initialize Overlay.', error);
        alert('System Error: Overlay failed to load.');
      }
    });
  }

  window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.warn('Erro capturado no jogo: ' + msg);
  };
});

function setupWalletListeners() {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => window.location.reload());
    window.ethereum.on('chainChanged', () => window.location.reload());
  }
}
