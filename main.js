// main.js

// 🎬 Importação das cenas principais do jogo
import LoadingScene from './src/scenes/LoadingScene.js';
import AuthChoiceScene from './src/scenes/AuthChoiceScene.js'; // ✨ Tela de Escolha de Autenticação
import RegisterScene from './src/scenes/RegisterScene.js';   // 🆕 Tela de Criação de Conta
import LoginScene from './src/scenes/LoginScene.js';
import StartScene from './src/scenes/StartScene.js';
import MenuScene from './src/scenes/MenuScene.js';
import GameScene from './src/scenes/GameScene.js';
import ShopScene from './src/scenes/ShopScene.js';
import RankingScene from './src/scenes/RankingScene.js';
import GameOverScene from './src/scenes/GameOverScene.js';
import ConfigScene from './src/scenes/ConfigScene.js';
import StatsScene from './src/scenes/StatsScene.js';

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
    parent: 'phaser-dom-container' // CORRIGIDO: Especifica o contêiner pai
  },
  scene: [
    LoadingScene,    // 🔄 Tela de carregamento (antes de tudo)
    AuthChoiceScene, // ✨ Tela de Escolha de Autenticação
    RegisterScene,   // 🆕 Tela de Criação de Conta
    LoginScene,      // 🔑 Tela de Login
    StartScene,      // 🎮 Tela de abertura estilo arcade
    MenuScene,       // 🧭 Menu principal
    GameScene,       // 🕹️ Cena principal do jogo
    ShopScene,       // 💰 Loja de atributos
    RankingScene,    // 🏆 Ranking de pontuação
    GameOverScene,   // ☠️ Tela de Game Over
    ConfigScene,     // ⚙️ Configurações de som, volume e reset
    StatsScene       // 📊 Tela com atributos comprados
  ],
  // Otimizações de performance e renderização
  render: {
    antialias: false, // Desativa antialiasing para um visual pixelado mais nítido
    pixelArt: true,   // Configura o renderizador para pixel art
    roundPixels: true // Ajuda a prevenir subpixel rendering que pode borrar pixel art
  },
  scale: {
    mode: Phaser.Scale.FIT, // Ajusta para caber na tela mantendo a proporção
    autoCenter: Phaser.Scale.CENTER_BOTH // Centraliza o jogo na tela
  }
};

// 🚀 Criação da instância do jogo
const game = new Phaser.Game(config);

// 🧪 Captura de erros em tempo de execução (útil para debug em produção)
window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.warn("Erro capturado no jogo: " + msg);
  console.error("Detalhes do Erro:", msg, "Arquivo:", url, "Linha:", lineNo, "Coluna:", columnNo, "Erro Obj:", error);
};
