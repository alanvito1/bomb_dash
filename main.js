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

// ⚙️ Configurações gerais do Phaser
const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 800,
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
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
    CharacterSelectionScene
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
  // 🚀 Criação da instância do jogo
  const game = new Phaser.Game(config);

  // 🧪 Captura de erros em tempo de execução (útil para debug em produção)
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    console.warn("Erro capturado no jogo: " + msg);
    console.error("Detalhes do Erro:", msg, "Arquivo:", url, "Linha:", lineNo, "Coluna:", columnNo, "Erro Obj:", error);
  };
});
