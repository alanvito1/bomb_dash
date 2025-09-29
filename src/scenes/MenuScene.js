// src/scenes/MenuScene.js
import { backgroundImages } from '../config/background.js';
import SoundManager from '../utils/sound.js';
import { savePlayerStatsToServer, enterWagerMatch } from '../api.js'; // Import for saving stats and entering wager

// --- Configuração da Wager Arena ---
// ATENÇÃO: Substitua este endereço pelo endereço do seu contrato WagerArena.sol após o deploy!
const WAGER_ARENA_ADDRESS = "0x0000000000000000000000000000000000000000";
const WAGER_ARENA_ABI = [
    "function enterWagerQueue(uint256 _tierId)",
    "event WagerMatchCreated(uint256 indexed matchId, uint256 indexed tierId, address player1, address player2, uint256 totalWager)"
];
// ------------------------------------

// Helper to get stats from localStorage, similar to other scenes
function getPlayerStatsFromLocalStorage() {
  const stats = localStorage.getItem('playerStats');
  return stats ? JSON.parse(stats) : null;
}

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  preload() {
    // 🎨 Carrega o fundo visual específico dessa cena
    const bgImage = backgroundImages[this.scene.key] || 'menu_bg_vertical.png';
    this.load.image('bg', `src/assets/${bgImage}`);

    // 🔊 Carrega todos os sons via gerenciador
    SoundManager.loadAll(this);

    // 🅰️ Fonte retrô arcade
    this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');
  }

  create() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    this.createBackground(centerX, centerY);

    if (window.WebFont) {
      WebFont.load({
        google: { families: ['Press Start 2P'] },
        active: () => this.createMenuContent(centerX, centerY)
      });
    } else {
      console.warn('[MenuScene] WebFont indisponível, usando fallback.');
      this.createMenuContent(centerX, centerY, true);
    }

    this.playMenuMusic(); // 🎵 Garante que a música do menu toque
  }

  createBackground(centerX, centerY) {
    this.add.image(centerX, centerY, 'bg')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);
  }

  createMenuContent(centerX, centerY, useFallback = false) {
    // 🎮 Título do jogo
    this.add.text(centerX, 100, '💣 BOMB DASH 💥', {
      fontFamily: useFallback ? 'monospace' : '"Press Start 2P"',
      fontSize: '20px',
      fill: '#FFD700',
      stroke: '#000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5);

    this.createMenu(centerX, centerY, useFallback);
  }

  createMenu(centerX, centerY, useFallback = false) {
    const menuItems = [
      { label: '⚔️ PVP', scene: null, action: 'showPvpLobby' }, // Alterado de PLAY para PVP
      { label: '🛒 SHOP', scene: 'ShopScene', action: null },
      { label: '📊 STATS', scene: 'StatsScene', action: null },
      { label: '🏆 RANKING', scene: 'RankingScene', action: null },
      { label: '⚙️ SETTINGS', scene: 'ConfigScene', action: null },
      { label: '↪️ LOGOUT', scene: 'LoginScene', action: 'logout' }
    ];

    const buttonStartY = centerY - 100;
    const buttonSpacing = 50;

    menuItems.forEach((item, i) => {
      const button = this.add.text(centerX, buttonStartY + i * buttonSpacing, item.label, {
        fontFamily: useFallback ? 'monospace' : '"Press Start 2P"',
        fontSize: '14px',
        fill: item.action === 'logout' ? '#FF6347' : '#00ffff',
        backgroundColor: '#000000cc',
        padding: { x: 10, y: 8 },
        align: 'center'
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', async () => {
          SoundManager.play(this, 'click');

          if (item.action === 'showPvpLobby') {
            this.showPvpLobby();
          } else if (item.action === 'logout') {
            // Lógica de logout existente
            const username = localStorage.getItem('loggedInUser') || this.registry.get('loggedInUser')?.username;
            const token = localStorage.getItem('jwtToken') || this.registry.get('jwtToken');
            const currentStats = getPlayerStatsFromLocalStorage();
            if (username && token && currentStats) {
              try {
                await savePlayerStatsToServer(username, currentStats, token);
              } catch (error) {
                console.error('[MenuScene LOGOUT] Error calling savePlayerStatsToServer:', error);
              }
            }
            localStorage.removeItem('loggedInUser');
            localStorage.removeItem('jwtToken');
            localStorage.removeItem('playerStats');
            this.registry.remove('loggedInUser');
            this.registry.remove('jwtToken');
            this.scene.start('AuthChoiceScene');
          } else {
            this.scene.start(item.scene);
          }
        })
        .on('pointerover', () => button.setStyle({ fill: '#ffffff' }))
        .on('pointerout', () => button.setStyle({ fill: item.action === 'logout' ? '#FF6347' : '#00ffff' }));
    });
  }

  showPvpLobby() {
    this.game.canvas.style.display = 'none'; // Esconde o canvas do jogo
    const pvpLobby = document.getElementById('pvp-lobby-container');
    pvpLobby.style.display = 'flex';

    // Adiciona listeners uma única vez
    if (!pvpLobby.dataset.listenersAdded) {
      document.getElementById('ranked-mode-button').addEventListener('click', () => {
        SoundManager.play(this, 'click');
        pvpLobby.style.display = 'none';
        this.game.canvas.style.display = 'block';
        this.scene.start('GameScene'); // Inicia o modo de jogo ranqueado
      });

      document.getElementById('wager-arena-button').addEventListener('click', () => {
        SoundManager.play(this, 'click');
        pvpLobby.style.display = 'none';
        this.showWagerArena(); // Mostra a UI da arena
      });

      document.getElementById('pvp-lobby-back-button').addEventListener('click', () => {
        SoundManager.play(this, 'click');
        pvpLobby.style.display = 'none';
        this.game.canvas.style.display = 'block'; // Mostra o canvas novamente
      });

      pvpLobby.dataset.listenersAdded = 'true';
    }
  }

  showWagerArena() {
    const wagerArena = document.getElementById('wager-arena-container');
    const messageEl = document.getElementById('wager-arena-message');
    wagerArena.style.display = 'flex';
    messageEl.textContent = 'Selecione o tier da sua aposta. A fortuna favorece os bravos.'; // Reset message
    messageEl.style.color = '#ffffff';

    // Adiciona listeners uma única vez
    if (!wagerArena.dataset.listenersAdded) {
      // Listener para os botões de tier
      document.querySelectorAll('.wager-tier-button').forEach(button => {
        button.addEventListener('click', async () => {
          SoundManager.play(this, 'click');
          const tierId = button.dataset.tierId;
          const token = localStorage.getItem('jwtToken');

          messageEl.textContent = 'Verificando elegibilidade...';
          messageEl.style.color = '#ffff00'; // Amarelo para processamento

          try {
            const response = await enterWagerMatch(tierId, token);
            if (response.success) {
              this.showWagerConfirmation(response.tier);
            } else {
              messageEl.textContent = response.message || 'Você não pode entrar nesta aposta.';
              messageEl.style.color = '#ff0000'; // Vermelho para erro
            }
          } catch (error) {
            console.error('Erro ao verificar aposta:', error);
            messageEl.textContent = error.message || 'Erro de comunicação com o servidor.';
            messageEl.style.color = '#ff0000';
          }
        });
      });

      // Listener para o botão de voltar
      document.getElementById('wager-arena-back-button').addEventListener('click', () => {
        SoundManager.play(this, 'click');
        wagerArena.style.display = 'none';
        this.showPvpLobby(); // Volta para o lobby pvp
      });

      wagerArena.dataset.listenersAdded = 'true';
    }
  }

  async showWagerConfirmation(tier) {
    const confirmDialog = document.getElementById('wager-confirm-dialog');
    const messageEl = document.getElementById('wager-confirm-message');
    const wagerArenaMsg = document.getElementById('wager-arena-message');

    messageEl.innerHTML = `Você está prestes a arriscar <span style="color: #00ffff;">${tier.bcoin_cost} BCOIN</span> e <span style="color: #ffff00;">${tier.xp_cost} XP</span>. Se perder, você pode perder um nível. Esta ação não pode ser desfeita.`;
    confirmDialog.style.display = 'flex';

    const confirmButton = document.getElementById('wager-confirm-button');
    const cancelButton = document.getElementById('wager-cancel-button');

    // Usamos .cloneNode e .replaceWith para remover listeners antigos
    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    newConfirmButton.addEventListener('click', async () => {
        SoundManager.play(this, 'click');
        confirmDialog.style.display = 'none';
        wagerArenaMsg.textContent = 'Abra sua carteira para aprovar a transação...';
        wagerArenaMsg.style.color = '#ffff00'; // Amarelo

        try {
            // 1. Conectar à carteira e ao contrato
            if (typeof window.ethereum === 'undefined') {
                throw new Error('MetaMask não está instalado. Por favor, instale para continuar.');
            }
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []); // Solicita conexão com a carteira
            const signer = provider.getSigner();

            // Usa as constantes definidas no topo do arquivo
            const wagerArenaContract = new ethers.Contract(WAGER_ARENA_ADDRESS, WAGER_ARENA_ABI, signer);

            // 2. Chamar a função do contrato
            wagerArenaMsg.textContent = 'Enviando transação para a blockchain...';
            const tx = await wagerArenaContract.enterWagerQueue(tier.id);

            wagerArenaMsg.textContent = 'Aguardando confirmação da transação...';
            await tx.wait(); // Espera a transação ser minerada

            wagerArenaMsg.textContent = `Transação confirmada! Buscando oponente para a aposta ${tier.name}...`;
            wagerArenaMsg.style.color = '#00ff00'; // Verde

            // Aqui, o jogo entraria em um estado de "espera", escutando por um evento do backend/websocket
            // que informaria quando a partida foi encontrada.

        } catch (error) {
            console.error('Falha na transação da aposta:', error);
            wagerArenaMsg.textContent = `Erro: ${error.message.substring(0, 50)}...`;
            wagerArenaMsg.style.color = '#ff0000'; // Vermelho
        }
    }, { once: true });

    const newCancelButton = cancelButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    newCancelButton.addEventListener('click', () => {
        SoundManager.play(this, 'click');
        confirmDialog.style.display = 'none';
    }, { once: true });
  }

  playMenuMusic() {
    const musicEnabled = this.registry.get('musicEnabled') ?? true;

    // 🎵 Para qualquer música que possa estar tocando (ex: mundo anterior)
    SoundManager.stopAll(this);

    // ▶ Toca música do menu se ativada
    if (musicEnabled) {
      SoundManager.playMusic(this, 'menu_music');
    }
  }
}
