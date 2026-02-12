// main.js

/*
 * 🌹 AVRE CLIENT CORE
 * Architect: Alan Victor Rocha Evangelista
 * ---------------------------------------
 * "Code is poetry written in logic."
 */

import * as Sentry from '@sentry/browser';

// Initialize Sentry for error reporting and session replay
Sentry.init({
  dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0', // Placeholder DSN
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Mask all text content to protect user privacy
      maskAllText: true,
      // Block all media to reduce replay size
      blockAllMedia: true,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  // Session Replay
  replaysSessionSampleRate: 1.0, // This sets the sample rate at 100%. You may want to change it in production
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, sample the session when an error occurs.
});

// 🎬 Importação das cenas principais do jogo
import api from './src/api.js';
import nftService from './src/web3/nft-service.js';
import bcoinService from './src/web3/bcoin-service.js';
import GameEventEmitter from './src/utils/GameEventEmitter.js';
import TermsScene from './src/scenes/TermsScene.js';
import LoadingScene from './src/scenes/LoadingScene.js';
import StartScene from './src/scenes/StartScene.js';
import MenuScene from './src/scenes/MenuScene.js';
import GameScene from './src/scenes/GameScene.js';
import ShopScene from './src/scenes/ShopScene.js';
import RankingScene from './src/scenes/RankingScene.js';
import GameOverScene from './src/scenes/GameOverScene.js';
import ConfigScene from './src/scenes/ConfigScene.js';
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

// --- Hardcoded Debug Mode ---
// This constant provides a simple, reliable way to toggle debug features
// without relying on the broken Vite environment variable system.
window.DEBUG_MODE = true;
// --------------------------

// ⚙️ Configurações gerais do Phaser
const config = {
  type: Phaser.AUTO,
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
    // CRITICAL FIX: LoadingScene must be the first scene. It handles all asset
    // pre-loading, including the i18n language files, before any other
    // scene is displayed. This prevents race conditions.
    LoadingScene,
    TermsScene,
    StartScene,
    AuthChoiceScene,
    MenuScene,
    GameScene,
    ShopScene,
    RankingScene,
    GameOverScene,
    ConfigScene,
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

// Esperar o DOM estar completamente carregado antes de iniciar o jogo Phaser
window.addEventListener('DOMContentLoaded', () => {
  // 🌹 AVRE CONSOLE WHISPER
  console.log(
    '%cCreated with passion by AVRE 🌹',
    'color: #DC143C; font-weight: bold; font-size: 16px;'
  );
  console.log('DOM completamente carregado e processado. Iniciando Phaser...');

  // Set up wallet event listeners as the app starts
  setupWalletListeners();

  // 🚀 Criação da instância do jogo
  const game = new Phaser.Game(config);
  window.game = game; // Expose for testing and automation
  window.nftService = nftService; // Expose for mocking in tests
  window.api = api; // Expose API client for mocking in tests
  window.bcoinService = bcoinService; // Expose for E2E testing
  window.GameEventEmitter = GameEventEmitter; // Expose for E2E testing

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
