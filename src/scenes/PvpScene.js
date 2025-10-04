import { CST } from '/src/CST.js';
import { TOURNAMENT_CONTROLLER_ADDRESS, TOURNAMENT_CONTROLLER_ABI, BCOIN_TESTNET_ADDRESS } from '/src/config/contracts.js';

// A simple ABI for BCOIN approve function
const BCOIN_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)"
];

const PVP_ENTRY_FEE = 10; // 10 BCOIN, must match backend

export default class PvpScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENES.PVP });
    }

    init(data) {
        this.userData = data.userData;
        this.web3 = data.web3;
    }

    create() {
        this.add.image(0, 0, 'black_bg').setOrigin(0, 0).setDepth(0);
        this.add.text(this.game.config.width / 2, 50, "PvP 1v1 Ranqueado", {
            fontFamily: '"Press Start 2P"',
            fontSize: '48px',
            color: '#FFD700',
            align: 'center'
        }).setOrigin(0.5).setDepth(1);

        // --- Back Button (Standard Phaser Text) ---
        const backButton = this.add.text(this.game.config.width - 100, 50, "Voltar", {
            fontFamily: '"Press Start 2P"', fontSize: '20px', fill: '#00ffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backButton.on('pointerdown', () => {
            this.scene.start(CST.SCENES.MENU, { userData: this.userData, web3: this.web3 });
        });
        backButton.on('pointerover', () => backButton.setStyle({ fill: '#ffffff' }));
        backButton.on('pointerout', () => backButton.setStyle({ fill: '#00ffff' }));

        this.selectedHero = null;
        this.displayHeroes();
    }

    displayHeroes() {
        const heroes = this.userData.heroes;
        let startY = 150;

        heroes.forEach((hero, index) => {
            const heroCard = this.add.container(this.game.config.width / 2, startY + (index * 120)).setSize(400, 100);
            const heroBg = this.add.graphics({ fillStyle: { color: 0x1a1a1a, alpha: 0.8 } });
            heroBg.fillRect(-200, -50, 400, 100);
            heroCard.add(heroBg);

            const heroName = this.add.text(-180, -30, `${hero.sprite_name} (Lvl: ${hero.level})`, {
                fontFamily: '"Press Start 2P"',
                fontSize: '24px',
                color: '#FFFFFF'
            });
            heroCard.add(heroName);

            heroCard.setInteractive({ useHandCursor: true });
            heroCard.on('pointerdown', () => {
                this.selectHero(hero, heroCard);
            });
            heroCard.on('pointerover', () => heroBg.lineStyle(2, 0xFFD700).strokeRect(-200, -50, 400, 100));
            heroCard.on('pointerout', () => heroBg.clear().fillStyle(0x1a1a1a, 0.8).fillRect(-200, -50, 400, 100));

            this.add.existing(heroCard);
        });
    }

    selectHero(hero, card) {
        if (this.selectedCard) {
            const oldBg = this.selectedCard.list[0];
            oldBg.clear().fillStyle(0x1a1a1a, 0.8).fillRect(-200, -50, 400, 100);
        }

        this.selectedHero = hero;
        this.selectedCard = card;
        this.registry.set('selectedHero', hero); // Store hero for GameScene

        const newBg = card.list[0];
        newBg.clear().fillStyle(0x3a3a3a, 0.9).fillRect(-200, -50, 400, 100);
        newBg.lineStyle(2, 0x00FFFF).strokeRect(-200, -50, 400, 100);

        this.showEnterQueueButton();
    }

    showEnterQueueButton() {
        if (this.enterQueueButton) {
            this.enterQueueButton.destroy();
        }

        this.enterQueueButton = this.add.text(this.game.config.width / 2, this.game.config.height - 100, `Entrar na Fila (Taxa: ${PVP_ENTRY_FEE} BCOIN)`, {
            fontFamily: '"Press Start 2P"', fontSize: '20px', fill: '#00ff00', backgroundColor: '#000000cc', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.enterQueueButton.on('pointerdown', async () => {
            if (!this.selectedHero) {
                this.showPopup("Selecione um herói primeiro!");
                return;
            }
            await this.handleEnterQueue();
        });
        this.enterQueueButton.on('pointerover', () => this.enterQueueButton.setStyle({ fill: '#ffffff' }));
        this.enterQueueButton.on('pointerout', () => this.enterQueueButton.setStyle({ fill: '#00ff00' }));
    }

    async handleEnterQueue() {
        this.showPopup("Processando taxa de entrada... Por favor, aprove a transação na sua carteira.");

        try {
            const bcoinContract = new this.web3.eth.Contract(BCOIN_ABI, BCOIN_TESTNET_ADDRESS);
            const feeInWei = this.web3.utils.toWei(PVP_ENTRY_FEE.toString(), 'ether');

            await bcoinContract.methods.approve(TOURNAMENT_CONTROLLER_ADDRESS, feeInWei)
                .send({ from: this.userData.address });

            this.showPopup("Aprovação bem-sucedida! Agora, confirme a transação para entrar na fila.");

            const tournamentContract = new this.web3.eth.Contract(TOURNAMENT_CONTROLLER_ABI, TOURNAMENT_CONTROLLER_ADDRESS);
            const tier = this.selectedHero.level;

            const receipt = await tournamentContract.methods.enterRankedMatch(tier, feeInWei)
                .send({ from: this.userData.address });

            this.showPopup("Transação confirmada! Verificando e entrando na fila...");
            const txHash = receipt.transactionHash;

            const response = await window.api.post('/pvp/ranked/enter', {
                heroId: this.selectedHero.id,
                txHash: txHash
            });

            if (response.success) {
                this.showPopup("Você está na fila! Procurando oponente...");
                this.startMatchmakingStatusCheck();
            } else {
                this.showPopup(`Erro: ${response.message}`);
            }

        } catch (error) {
            console.error("Erro ao entrar na fila de PvP:", error);
            this.showPopup(`Falha ao entrar na fila: ${error.message.substring(0, 50)}...`);
        }
    }

    startMatchmakingStatusCheck() {
        if (this.enterQueueButton) this.enterQueueButton.setInteractive(false).setStyle({ fill: '#888888' });

        this.time.addEvent({
            delay: 3000,
            callback: async () => {
                const status = await window.api.get('/matchmaking/status');
                if (status.success && status.status === 'found') {
                    this.scene.start(CST.SCENES.GAME, {
                        userData: this.userData,
                        web3: this.web3,
                        gameMode: 'ranked',
                        opponent: status.match.opponent,
                        matchId: status.match.matchId
                    });
                } else if (!status.success || status.status === 'not_in_queue') {
                    this.showPopup("Removido da fila ou erro de status.");
                    if(this.enterQueueButton) this.enterQueueButton.setInteractive(true).setStyle({ fill: '#00ff00' });
                }
            },
            loop: true
        });
    }

    showPopup(message) {
        const popup = this.add.container(this.game.config.width / 2, this.game.config.height / 2);
        const bg = this.add.graphics({ fillStyle: { color: 0x000000, alpha: 0.9 } });
        bg.fillRect(-250, -100, 500, 200);
        const text = this.add.text(0, 0, message, {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            color: '#FFFFFF',
            align: 'center',
            wordWrap: { width: 480 }
        }).setOrigin(0.5);

        popup.add([bg, text]);
        this.time.delayedCall(3500, () => popup.destroy());
    }
}