import { CST } from '../CST.js';
import contracts from '../config/contracts.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';

const PVP_ENTRY_FEE = 10; // 10 BCOIN, must match backend

export default class PvpScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENES.PVP });
    }

    init(data) {
        // Use optional chaining to prevent crash if data is null/undefined
        this.userData = data?.userData || this.registry.get('loggedInUser');
        this.web3 = data?.web3;
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        this.add.image(centerX, centerY, 'menu_bg_vertical').setOrigin(0.5).setDisplaySize(this.scale.width, this.scale.height);

        // --- Back Button ---
        const backButton = this.add.text(centerX, this.scale.height - 50, "Voltar", {
            fontFamily: '"Press Start 2P"', fontSize: '20px', fill: '#00ffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        backButton.on('pointerdown', () => this.scene.start(CST.SCENES.MENU, { userData: this.userData, web3: this.web3 }));
        backButton.on('pointerover', () => backButton.setStyle({ fill: '#ffffff' }));
        backButton.on('pointerout', () => backButton.setStyle({ fill: '#00ffff' }));

        // --- Guard Clause ---
        if (!this.userData || !this.userData.heroes) {
            this.add.text(centerX, centerY, 'Erro: Dados do jogador não encontrados.\nRetornando ao menu...', {
                fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#ff0000', align: 'center', wordWrap: { width: this.scale.width - 40 }
            }).setOrigin(0.5);
            this.time.delayedCall(3000, () => this.scene.start(CST.SCENES.MENU));
            return;
        }

        // --- Main Title ---
        this.titleText = this.add.text(centerX, 50, "PvP 1v1", {
            fontFamily: '"Press Start 2P"', fontSize: '36px', color: '#FFD700', align: 'center'
        }).setOrigin(0.5).setDepth(1);

        // --- Mode Selection ---
        this.mode = 'ranked';
        this.contentContainer = this.add.container(0, 0);

        const buttonY = 120;
        this.rankedButton = this.createModeButton(centerX - 150, buttonY, LanguageManager.get('pvp_ranked'), 'ranked');
        this.wagerButton = this.createModeButton(centerX, buttonY, LanguageManager.get('pvp_wager'), 'wager');
        this.botButton = this.createModeButton(centerX + 150, buttonY, LanguageManager.get('pvp_bot'), 'bot');

        this.updateModeUI();
    }

    createModeButton(x, y, text, mode) {
        const button = this.add.text(x, y, text, {
            fontFamily: '"Press Start 2P"', fontSize: '20px', fill: '#888888',
            backgroundColor: '#111111', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        button.on('pointerdown', () => {
            this.mode = mode;
            this.updateModeUI();
        });
        button.on('pointerover', () => button.alpha = 1);
        button.on('pointerout', () => button.alpha = 0.9);
        return button;
    }

    updateModeUI() {
        this.contentContainer.removeAll(true);
        this.selectedHero = null;
        this.selectedCard = null;
        this.selectedTier = null;
        this.selectedTierCard = null;
        this.selectedHeroCard = null;


        this.rankedButton.setStyle({ fill: '#888888' }).setAlpha(0.7);
        this.wagerButton.setStyle({ fill: '#888888' }).setAlpha(0.7);
        this.botButton.setStyle({ fill: '#888888' }).setAlpha(0.7);

        if (this.mode === 'ranked') {
            this.rankedButton.setStyle({ fill: '#FFD700' }).setAlpha(1);
            this.drawRankedUI();
        } else if (this.mode === 'wager') {
            this.wagerButton.setStyle({ fill: '#FFD700' }).setAlpha(1);
            this.drawWagerUI();
        } else { // bot mode
            this.botButton.setStyle({ fill: '#FFD700' }).setAlpha(1);
            this.drawBotUI();
        }
    }

    drawRankedUI() {
        this.titleText.setText("PvP 1v1 Ranqueado");
        this.displayHeroes();
    }

    drawBotUI() {
        this.titleText.setText("Treino Contra Bot");
        this.displayHeroes();
    }

    async drawWagerUI() {
        this.titleText.setText("Arena de Alto Risco");
        this.tierCards = [];

        const loadingText = this.add.text(this.game.config.width / 2, 300, "Carregando tiers...", {
            fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#FFFFFF'
        }).setOrigin(0.5);
        this.contentContainer.add(loadingText);

        try {
            const response = await window.api.get('/pvp/wager/tiers');
            loadingText.destroy();

            if (!response.success) throw new Error(response.message);

            this.tiersContainer = this.add.container(0, 180);
            this.contentContainer.add(this.tiersContainer);

            this.heroSelectionContainer = this.add.container(0, 180).setVisible(false);
            this.contentContainer.add(this.heroSelectionContainer);

            const promptText = this.add.text(this.game.config.width / 2, 0, "Selecione um Tier de Aposta", {
                fontFamily: '"Press Start 2P"', fontSize: '20px', color: '#FFFFFF'
            }).setOrigin(0.5);
            this.tiersContainer.add(promptText);

            response.tiers.forEach((tier, index) => {
                const card = this.createTierCard(this.game.config.width / 2, 70 + (index * 110), tier);
                this.tiersContainer.add(card);
                this.tierCards.push(card);
            });

        } catch (error) {
            loadingText.destroy();
            this.showPopup(`Erro ao carregar tiers: ${error.message}`);
        }
    }

    createTierCard(x, y, tier) {
        const card = this.add.container(x, y).setSize(650, 90);
        const bg = this.add.graphics({ fillStyle: { color: 0x1a1a1a, alpha: 0.8 } });
        bg.fillRect(-325, -45, 650, 90);
        card.add(bg);
        card.setData({ tier, bg });

        const tierName = this.add.text(-305, -30, tier.name, { fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#FFD700' });
        const bcoinCost = this.add.text(-305, 15, `Aposta: ${tier.bcoin_cost} BCOIN`, { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#00FFFF' });
        const xpCost = this.add.text(80, 15, `Risco: ${tier.xp_cost} Hero XP`, { fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#FF69B4' });
        card.add([tierName, bcoinCost, xpCost]);

        card.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.selectTier(card))
            .on('pointerover', () => bg.lineStyle(2, 0xFFD700).strokeRect(-325, -45, 650, 90))
            .on('pointerout', () => { if (this.selectedTierCard !== card) bg.clear().fillStyle(0x1a1a1a, 0.8).fillRect(-325, -45, 650, 90); });

        return card;
    }

    selectTier(card) {
        this.selectedTier = card.getData('tier');
        this.selectedTierCard = card;
        this.selectedHero = null;
        this.selectedHeroCard = null;

        this.tierCards.forEach(c => c.getData('bg').clear().fillStyle(0x1a1a1a, 0.8).fillRect(-325, -45, 650, 90));
        card.getData('bg').lineStyle(2, 0x00FFFF).strokeRect(-325, -45, 650, 90);

        this.tiersContainer.setVisible(false);
        this.displayHeroesForWager();
    }

    displayHeroesForWager() {
        this.heroSelectionContainer.removeAll(true).setVisible(true);
        this.heroCards = [];

        const promptText = this.add.text(this.game.config.width / 2, 0, `Selecione um Herói (Risco: ${this.selectedTier.xp_cost} XP)`, {
            fontFamily: '"Press Start 2P"', fontSize: '18px', color: '#FFFFFF', align: 'center'
        }).setOrigin(0.5);
        this.heroSelectionContainer.add(promptText);

        this.userData.heroes.forEach((hero, index) => {
            const canAfford = hero.xp >= this.selectedTier.xp_cost;
            const card = this.createHeroCard(this.game.config.width / 2, 70 + index * 100, hero, canAfford);
            this.heroSelectionContainer.add(card);
            this.heroCards.push(card);
        });

        const backToTiersButton = this.add.text(this.game.config.width / 2, this.game.config.height - 200, '<< Voltar para Tiers', {
            fontFamily: '"Press Start 2P"', fontSize: '16px', fill: '#00ffff'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        backToTiersButton.on('pointerdown', () => {
            this.heroSelectionContainer.setVisible(false);
            this.tiersContainer.setVisible(true);
            this.selectedTier = null;
            if (this.enterWagerButton) this.enterWagerButton.destroy();
        });
        this.heroSelectionContainer.add(backToTiersButton);
    }

    createHeroCard(x, y, hero, isSelectable) {
        const card = this.add.container(x, y).setSize(500, 80);
        const bgColor = isSelectable ? 0x1a1a1a : 0x330000;
        const textColor = isSelectable ? '#FFFFFF' : '#888888';

        const bg = this.add.graphics({ fillStyle: { color: bgColor, alpha: 0.8 } });
        bg.fillRect(-250, -40, 500, 80);
        card.add(bg);
        card.setData({ hero, bg, isSelectable });

        const heroName = this.add.text(-230, -25, `${hero.sprite_name} (Lvl: ${hero.level})`, { fontFamily: '"Press Start 2P"', fontSize: '20px', color: textColor });
        const heroXp = this.add.text(-230, 10, `XP Atual: ${hero.xp}`, { fontFamily: '"Press Start 2P"', fontSize: '14px', color: textColor });
        card.add([heroName, heroXp]);

        if (isSelectable) {
            card.setInteractive({ useHandCursor: true })
                .on('pointerdown', () => this.selectHeroForWager(card))
                .on('pointerover', () => bg.lineStyle(2, 0xFFD700).strokeRect(-250, -40, 500, 80))
                .on('pointerout', () => { if (this.selectedHeroCard !== card) bg.clear().fillStyle(bgColor, 0.8).fillRect(-250, -40, 500, 80); });
        }
        return card;
    }

    // HS1-05: This entire malformed, duplicated function block was causing the scene to crash.
    // It has been removed.

    selectHeroForWager(card) {
        if (this.selectedHeroCard) {
            const oldBg = this.selectedHeroCard.getData('bg');
            oldBg.clear().fillStyle(0x1a1a1a, 0.8).fillRect(-250, -40, 500, 80);
        }

        this.selectedHeroCard = card;
        this.selectedHero = card.getData('hero');

        card.getData('bg').lineStyle(2, 0x00FFFF).strokeRect(-250, -40, 500, 80);

        this.showEnterWagerButton();
    }

    showEnterWagerButton() {
        if (this.enterWagerButton) this.enterWagerButton.destroy();
        const centerX = this.cameras.main.centerX;
        const buttonY = this.scale.height - 100;

        const tier = this.selectedTier;
        const buttonText = `Entrar na Fila (${tier.bcoin_cost} BCOIN + ${tier.xp_cost} XP)`;

        this.enterWagerButton = this.add.text(centerX, buttonY, buttonText, {
            fontFamily: '"Press Start 2P"', fontSize: '18px', fill: '#00ff00', backgroundColor: '#000000cc', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.enterWagerButton.on('pointerdown', () => this.handleEnterWagerQueue());
    }

    async handleEnterWagerQueue() {
        if (!this.selectedHero || !this.selectedTier) {
            this.showPopup("Selecione um tier e um herói primeiro!");
            return;
        }

        this.enterWagerButton.disableInteractive().setStyle({ fill: '#888888' });
        this.showPopup("Processando... Por favor, aprove as transações na sua carteira.");

        try {
            // 1. Approve BCOIN transfer
            const bcoinContract = new this.web3.eth.Contract(contracts.bcoin.abi, contracts.bcoin.address);
            const wagerCost = this.web3.utils.toWei(this.selectedTier.bcoin_cost.toString(), 'ether');

            this.showPopup("Passo 1/2: Aprovando aposta em BCOIN...");
            await bcoinContract.methods.approve(contracts.wagerArena.address, wagerCost).send({ from: this.userData.address });

            // 2. Enter the Wager Queue on the smart contract
            this.showPopup("Passo 2/2: Entrando na fila da Arena...");
            const wagerContract = new this.web3.eth.Contract(contracts.wagerArena.abi, contracts.wagerArena.address);
            const receipt = await wagerContract.methods.enterWagerQueue(this.selectedTier.id).send({ from: this.userData.address });

            // 3. Notify our backend that the user has entered the queue with a specific hero
            await window.api.post('/pvp/wager/enter', {
                heroId: this.selectedHero.id,
                tierId: this.selectedTier.id
            });

            // 4. Check if a match was made instantly from the transaction events
            const matchEvent = receipt.events.WagerMatchCreated;
            if (matchEvent) {
                this.showPopup("Oponente encontrado instantaneamente! Começando...");
                this.goToGameScene(matchEvent.returnValues);
            } else {
                this.showPopup("Você está na fila. Aguardando oponente...");
                this.listenForWagerMatch();
            }

        } catch (error) {
            console.error("Erro ao entrar na fila de aposta:", error);
            this.showPopup(`Falha: ${error.message.substring(0, 60)}...`);
            this.enterWagerButton.setInteractive().setStyle({ fill: '#00ff00' });
        }
    }

    listenForWagerMatch() {
        const wagerContract = new this.web3.eth.Contract(contracts.wagerArena.abi, contracts.wagerArena.address);

        // Listen for the event related to the tier the player joined
        this.eventListener = wagerContract.events.WagerMatchCreated({ filter: { tierId: this.selectedTier.id }})
            .on('data', (event) => {
                const { player1, player2 } = event.returnValues;
                const myAddress = this.userData.address.toLowerCase();

                if (player1.toLowerCase() === myAddress || player2.toLowerCase() === myAddress) {
                    this.showPopup("Oponente encontrado! Começando partida...");
                    if (this.eventListener) this.eventListener.unsubscribe(); // Stop listening
                    this.goToGameScene(event.returnValues);
                }
            })
            .on('error', (error) => {
                console.error("Erro no listener de eventos:", error);
                this.showPopup("Erro de conexão na busca por oponente.");
            });
    }

    goToGameScene(matchData) {
        const opponentAddress = matchData.player1.toLowerCase() === this.userData.address.toLowerCase()
            ? matchData.player2
            : matchData.player1;

        // We need opponent's hero data, but the event doesn't provide it.
        // The game scene might need to be adapted to fetch this, or we can assume a placeholder.
        const opponent = { address: opponentAddress, hero: { sprite_name: 'Opponent' } };

        this.scene.start(CST.SCENES.GAME, {
            userData: this.userData,
            web3: this.web3,
            gameMode: 'wager',
            matchId: matchData.matchId,
            tierId: this.selectedTier.id,
            opponent: opponent
        });
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

        let buttonText;
        let buttonAction;

        if (this.mode === 'bot') {
            buttonText = 'Jogar!';
            buttonAction = () => this.handleStartBotMatch();
        } else { // 'ranked'
            buttonText = `Entrar na Fila (Taxa: ${PVP_ENTRY_FEE} BCOIN)`;
            buttonAction = () => this.handleEnterQueue();
        }

        this.enterQueueButton = this.add.text(this.game.config.width / 2, this.game.config.height - 100, buttonText, {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            fill: '#00ff00',
            backgroundColor: '#000000cc',
            padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.enterQueueButton.on('pointerdown', async () => {
            if (!this.selectedHero) {
                this.showPopup("Selecione um herói primeiro!");
                return;
            }
            await buttonAction();
        });

        this.enterQueueButton.on('pointerover', () => this.enterQueueButton.setStyle({ fill: '#ffffff' }));
        this.enterQueueButton.on('pointerout', () => this.enterQueueButton.setStyle({ fill: '#00ff00' }));
    }

    async handleEnterQueue() {
        this.showPopup("Processando taxa de entrada... Por favor, aprove a transação na sua carteira.");

        try {
            const bcoinContract = new this.web3.eth.Contract(contracts.bcoin.abi, contracts.bcoin.address);
            const feeInWei = this.web3.utils.toWei(PVP_ENTRY_FEE.toString(), 'ether');

            await bcoinContract.methods.approve(contracts.tournamentController.address, feeInWei)
                .send({ from: this.userData.address });

            this.showPopup("Aprovação bem-sucedida! Agora, confirme a transação para entrar na fila.");

            const tournamentContract = new this.web3.eth.Contract(contracts.tournamentController.abi, contracts.tournamentController.address);
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

    handleStartBotMatch() {
        if (!this.selectedHero) {
            this.showPopup("Selecione um herói para o treino!");
            return;
        }

        this.showPopup("Iniciando treino contra o bot...");

        const botOpponent = {
            address: '0x000000000000000000000000000000000000dEaD', // Dead address for bots
            hero: {
                // Mock stats for the bot's hero
                sprite_name: 'Bot',
                level: this.selectedHero.level, // Match player's level for fairness
                hp: 100,
                damage: 1,
                speed: 200
            }
        };

        this.scene.start(CST.SCENES.GAME, {
            userData: this.userData,
            web3: this.web3,
            gameMode: 'bot',
            opponent: botOpponent,
            matchId: `bot-match-${Date.now()}` // Unique ID for the bot match
        });
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