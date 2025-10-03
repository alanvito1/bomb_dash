// main.js

// 🎬 Importação das cenas principais do jogo
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
import PopupScene from './src/scenes/PopupScene.js';
import AltarScene from './src/scenes/AltarScene.js';

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
      debug: false, // Will be enabled dynamically by the preBoot callback if DEBUG_MODE is true.
      gravity: { y: 0 }
    }
  },
  callbacks: {
    preBoot: (game) => {
        if (window.DEBUG_MODE) {
            console.log('[DEBUG] Debug mode activated. Enabling verbose logging and physics visualization.');
            game.setDebug(true, true);
            game.physics.config.debug = true;
        }
    }
  },
  dom: {
    createContainer: true,
    parent: 'phaser-dom-container' // Especifica o contêiner pai
  },
  scene: [
    LoadingScene,
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
    PopupScene,
    AltarScene
  ],
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

// Esperar o DOM estar completamente carregado antes de iniciar o jogo Phaser
window.addEventListener('DOMContentLoaded', () => {
  console.log("DOM completamente carregado e processado. Iniciando Phaser...");

  // Set up wallet event listeners as the app starts
  setupWalletListeners();

  // 🚀 Criação da instância do jogo
  const game = new Phaser.Game(config);
  window.game = game; // Expose for testing and automation

  // 🧪 Captura de erros em tempo de execução (útil para debug em produção)
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.warn("Erro capturado no jogo: " + msg);
    console.error("Detalhes do Erro:", msg, "Arquivo:", url, "Linha:", lineNo, "Coluna:", columnNo, "Erro Obj:", error);
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
