import UIModal from './UIModal.js';
import playerStateService from '../services/PlayerStateService.js';
import SoundManager from '../utils/sound.js';
import { createRetroButton } from '../utils/ui.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

export default class ProfileModal extends UIModal {
    constructor(scene) {
        super(scene, 400, 550, 'SUMMONER PROFILE');
        this.contentContainer = null;
    }

    open() {
        super.open();
        this.renderContent();
    }

    renderContent() {
        // Clear previous content
        if (this.contentContainer) {
            this.contentContainer.destroy();
        }
        this.contentContainer = this.scene.add.container(0, 0);
        this.windowContainer.add(this.contentContainer);

        const user = playerStateService.getUser();
        const level = user.accountLevel || 1;
        const xp = user.accountXp || 0;
        const nextXp = playerStateService.getNextLevelXp();

        let y = -this.modalHeight / 2 + 100;

        // --- LEVEL HEADER ---
        const lvlText = this.scene.add.text(0, y, `LEVEL ${level}`, {
             fontFamily: '"Press Start 2P"', fontSize: '24px', color: '#ffd700'
        }).setOrigin(0.5);
        this.contentContainer.add(lvlText);

        y += 40;

        // XP Bar
        const barW = 280;
        const barH = 24;
        const progress = nextXp > 0 ? Math.min(xp / nextXp, 1) : 0;

        const bgBar = this.scene.add.rectangle(0, y, barW, barH, 0x222222).setOrigin(0.5);
        const fillBar = this.scene.add.rectangle(-barW/2, y, barW * progress, barH, 0x00ff00).setOrigin(0, 0.5);

        const xpText = this.scene.add.text(0, y, `${xp} / ${nextXp} XP`, {
            fontFamily: '"Press Start 2P"', fontSize: '10px', color: '#000000'
        }).setOrigin(0.5);

        this.contentContainer.add([bgBar, fillBar, xpText]);

        y += 60;

        // --- MATCH HISTORY ---
        const histTitle = this.scene.add.text(0, y, 'RECENT BATTLES', {
             fontFamily: '"Press Start 2P"', fontSize: '14px', color: '#00ffff'
        }).setOrigin(0.5);

        // Underline
        const line = this.scene.add.line(0, y + 15, -70, 0, 70, 0, 0x00ffff).setOrigin(0);
        this.contentContainer.add([histTitle, line]);

        y += 40;

        const history = playerStateService.getMatchHistory();
        if (history.length === 0) {
            const noData = this.scene.add.text(0, y, 'No battles recorded yet.', {
                fontFamily: '"Roboto"', fontSize: '14px', color: '#888888'
            }).setOrigin(0.5);
            this.contentContainer.add(noData);
            y += 40;
        } else {
            history.forEach((match, index) => {
                const rowY = y + (index * 30);
                const waveTxt = `Wave ${match.wave}`;
                const coinTxt = `+${match.bcoin} BCOIN`;

                const rText = this.scene.add.text(-120, rowY, waveTxt, {
                    fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffffff'
                }).setOrigin(0, 0.5);

                const cText = this.scene.add.text(120, rowY, coinTxt, {
                    fontFamily: '"Press Start 2P"', fontSize: '12px', color: '#ffd700'
                }).setOrigin(1, 0.5);

                this.contentContainer.add([rText, cText]);
            });
            y += (Math.max(history.length, 1) * 30) + 20;
        }

        // --- ACTIONS ---
        y = Math.max(y, 100); // Ensure minimum Y position for buttons

        // Daily Faucet
        this.createFaucetButton(y);

        y += 60;

        // Settings Link
        const settingsBtn = createRetroButton(this.scene, 0, y, 200, 40, 'SETTINGS', 'neutral', () => {
             this.close();
             if (this.scene.settingsModal) this.scene.settingsModal.open();
        });
        this.contentContainer.add(settingsBtn);
    }

    createFaucetButton(y) {
        const user = playerStateService.getUser();
        const lastClaim = user.lastFaucetClaim || 0;
        const now = Date.now();
        const cooldown = 24 * 60 * 60 * 1000;
        const canClaim = (now - lastClaim) >= cooldown;

        let label = "DAILY SUPPLY (+5)";
        let style = "success"; // Green

        if (!canClaim) {
             const remaining = Math.ceil((cooldown - (now - lastClaim)) / (60 * 60 * 1000));
             label = `WAIT ${remaining}H`;
             style = "disabled"; // Grey, usually handled by createRetroButton logic or custom tint
        }

        const btn = createRetroButton(this.scene, 0, y, 240, 50, label, style, async () => {
            if (!canClaim) {
                SoundManager.play(this.scene, 'error');
                return;
            }

            const res = await playerStateService.claimDailyFaucet();
            if (res.success) {
                SoundManager.play(this.scene, 'coin_collect');

                // Show floating text
                const floatText = this.scene.add.text(0, y - 40, '+5 BCOIN', {
                    fontFamily: '"Press Start 2P"', fontSize: '16px', color: '#ffd700', stroke: '#000', strokeThickness: 4
                }).setOrigin(0.5);
                this.contentContainer.add(floatText);

                this.scene.tweens.add({
                    targets: floatText,
                    y: y - 80,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => floatText.destroy()
                });

                // Emit update
                GameEventEmitter.emit('bcoin-balance-update', { balance: res.newBalance });

                // Refresh Modal after delay
                this.scene.time.delayedCall(1000, () => {
                    this.renderContent();
                });
            } else {
                SoundManager.play(this.scene, 'error');
            }
        });

        this.contentContainer.add(btn);
    }
}
