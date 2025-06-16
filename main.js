// main.js

// 🎬 Importação das cenas principais do jogo
import LoadingScene from './src/scenes/LoadingScene.js';   // Tela de carregamento inicial
import LoginScene from './src/scenes/LoginScene.js';       // Tela de Login/Criação de Conta
import StartScene from './src/scenes/StartScene.js';       // Tela "Press any key"
import MenuScene from './src/scenes/MenuScene.js';         // Menu principal
import GameScene from './src/scenes/GameScene.js';         // Gameplay principal
import ShopScene from './src/scenes/ShopScene.js';         // Loja de upgrades
import RankingScene from './src/scenes/RankingScene.js';   // Ranking de pontuação
import GameOverScene from './src/scenes/GameOverScene.js'; // Tela de fim de jogo
import ConfigScene from './src/scenes/ConfigScene.js';     // Configurações
import StatsScene from './src/scenes/StatsScene.js';       // Tela de estatísticas

// ⚙️ Configurações gerais do Phaser
const config = {
  type: Phaser.AUTO,                // Usa WebGL se possível, senão fallback para Canvas
  width: 480,
  height: 800,
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,                // Desativa o modo de depuração
      gravity: { y: 0 }           // Sem gravidade no jogo (movimento top-down)
    }
  },
  dom: {
    createContainer: true         // Permite usar elementos DOM (ex: input de nome)
  },
  scene: [
    LoadingScene,    // 🔄 Tela de carregamento (antes de tudo)
    LoginScene,      // 🔑 Tela de Login
    StartScene,      // 🎮 Tela de abertura estilo arcade
    MenuScene,       // 🧭 Menu principal
    GameScene,       // 🕹️ Cena principal do jogo
    ShopScene,       // 💰 Loja de atributos
    RankingScene,    // 🏆 Ranking de pontuação
    GameOverScene,   // ☠️ Tela de Game Over
    ConfigScene,     // ⚙️ Configurações de som, volume e reset
    StatsScene       // 📊 Tela com atributos comprados
  ]
};

// 🚀 Criação da instância do jogo
const game = new Phaser.Game(config);

// 🧪 Captura de erros em tempo de execução (útil para debug em produção)
window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.warn("Erro capturado no jogo: " + msg); // Alterado de alert para console.warn
  console.error("Detalhes do Erro:", msg, "Arquivo:", url, "Linha:", lineNo, "Coluna:", columnNo, "Erro Obj:", error); // Melhorado o log detalhado
};
