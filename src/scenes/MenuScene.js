// src/scenes/MenuScene.js
import { backgroundImages } from '../config/background.js';
import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js'; // Import the centralized api client
import { ethers } from 'ethers'; // Required for Wager Arena contract interaction

// --- Configuração da Wager Arena ---
// ATENÇÃO: Substitua este endereço pelo endereço do seu contrato WagerArena.sol após o deploy!
const WAGER_ARENA_ADDRESS = "0x0000000000000000000000000000000000000000";
const WAGER_ARENA_ABI = [
    "function enterWagerQueue(uint256 _tierId)",
    "event WagerMatchCreated(uint256 indexed matchId, uint256 indexed tierId, address player1, address player2, uint256 totalWager)"
];
// ------------------------------------

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
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
    this.add.image(centerX, centerY, 'menu_bg_vertical')
      .setOrigin(0.5)
      .setDisplaySize(this.scale.width, this.scale.height);
  }

  createMenuContent(centerX, centerY, useFallback = false) {
    // 🎮 Título do jogo
    this.add.text(centerX, 100, LanguageManager.get(this, 'game_title'), {
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
    // Part 2.3: Menu Structure Change
    const menuItems = [
      { label: 'SOLO', scene: 'CharacterSelectionScene', action: 'start_solo' },
      { label: 'PVP', scene: null, action: 'showPvpLobby' },
      { label: LanguageManager.get(this, 'menu_shop'), scene: 'ShopScene', action: null },
      { label: 'PROFILE', scene: 'ProfileScene', action: null },
      { label: LanguageManager.get(this, 'menu_ranking'), scene: 'RankingScene', action: null },
      { label: LanguageManager.get(this, 'menu_logout'), scene: 'LoginScene', action: 'logout' }
    ];

    const buttonStartY = centerY - 120;
    const buttonSpacing = 55;

    menuItems.forEach((item, i) => {
      const button = this.add.text(centerX, buttonStartY + i * buttonSpacing, item.label, {
        fontFamily: useFallback ? 'monospace' : '"Press Start 2P"',
        fontSize: '16px',
        fill: item.action === 'logout' ? '#FF6347' : '#00ffff',
        backgroundColor: '#000000cc',
        padding: { x: 15, y: 10 },
        align: 'center'
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', async () => {
          SoundManager.play(this, 'click');

          if (item.action === 'showPvpLobby') {
            this.showPvpLobby();
          } else if (item.action === 'start_solo') {
            // As per plan 2.1, this will eventually go to CharacterSelectionScene first
            // For now, it goes directly to GameScene
            this.scene.start(item.scene);
          } else if (item.action === 'logout') {
            api.logout();
            this.registry.remove('loggedInUser');
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
        // This button now leads to the Character Selection screen before the game.
        this.scene.start('CharacterSelectionScene');
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
    messageEl.textContent = LanguageManager.get(this, 'wager_arena_welcome');
    messageEl.style.color = '#ffffff';

    // Adiciona listeners uma única vez
    if (!wagerArena.dataset.listenersAdded) {
      // Listener para os botões de tier
      document.querySelectorAll('.wager-tier-button').forEach(button => {
        button.addEventListener('click', async () => {
          SoundManager.play(this, 'click');
          const tierId = button.dataset.tierId;

          messageEl.textContent = LanguageManager.get(this, 'wager_arena_checking');
          messageEl.style.color = '#ffff00'; // Amarelo para processamento

          try {
            // 1.1: Use the new centralized API client. No need to pass the token.
            const response = await api.enterWagerMatch(tierId);
            if (response.success) {
              this.showWagerConfirmation(response.tier);
            } else {
              messageEl.textContent = response.message || LanguageManager.get(this, 'wager_arena_fail');
              messageEl.style.color = '#ff0000'; // Vermelho para erro
            }
          } catch (error) {
            console.error('Erro ao verificar aposta:', error);
            messageEl.textContent = error.message || LanguageManager.get(this, 'wager_arena_error');
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

    messageEl.innerHTML = LanguageManager.get(this, 'wager_confirm_message', { bcoin: tier.bcoin_cost, xp: tier.xp_cost });
    confirmDialog.style.display = 'flex';

    const confirmButton = document.getElementById('wager-confirm-button');
    const cancelButton = document.getElementById('wager-cancel-button');

    // Usamos .cloneNode e .replaceWith para remover listeners antigos
    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    newConfirmButton.addEventListener('click', async () => {
        SoundManager.play(this, 'click');
        confirmDialog.style.display = 'none';
        wagerArenaMsg.textContent = LanguageManager.get(this, 'wager_wallet_prompt');
        wagerArenaMsg.style.color = '#ffff00'; // Amarelo

        try {
            // 1. Conectar à carteira e ao contrato
            if (typeof window.ethereum === 'undefined') {
                throw new Error(LanguageManager.get(this, 'metamask_not_installed'));
            }
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Usa as constantes definidas no topo do arquivo
            const wagerArenaContract = new ethers.Contract(WAGER_ARENA_ADDRESS, WAGER_ARENA_ABI, signer);

            // 2. Chamar a função do contrato
            wagerArenaMsg.textContent = LanguageManager.get(this, 'wager_tx_sending');
            const tx = await wagerArenaContract.enterWagerQueue(tier.id);

            wagerArenaMsg.textContent = LanguageManager.get(this, 'wager_tx_confirming');
            await tx.wait(); // Espera a transação ser minerada

            wagerArenaMsg.textContent = LanguageManager.get(this, 'wager_tx_success', { tierName: tier.name });
            wagerArenaMsg.style.color = '#00ff00'; // Verde

            // Aqui, o jogo entraria em um estado de "espera", escutando por um evento do backend/websocket
            // que informaria quando a partida foi encontrada.

        } catch (error) {
            console.error('Falha na transação da aposta:', error);
            wagerArenaMsg.textContent = LanguageManager.get(this, 'wager_tx_fail', { errorMessage: error.message.substring(0, 50) });
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
