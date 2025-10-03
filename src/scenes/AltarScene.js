import SoundManager from '../utils/sound.js';
import LanguageManager from '../utils/LanguageManager.js';
import api from '../api.js';
import { ethers } from 'ethers';

// Constants should be managed in a central config file
const BCOIN_CONTRACT_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const SPENDER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // The TournamentController contract

const BCOIN_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];
const ALTAR_ABI = [
    "function donateToAltar(uint256 amount) external"
];

export default class AltarScene extends Phaser.Scene {
    constructor() {
        super('AltarScene');
        this.statusText = null;
        this.donationInput = null;
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        // Background and Data Window
        this.add.image(centerX, centerY, 'menu_bg_vertical').setOrigin(0.5).setDisplaySize(this.scale.width, this.scale.height);
        this.add.graphics().fillStyle(0x000000, 0.7).fillRect(30, 30, this.scale.width - 60, this.scale.height - 60);

        // Standard Font Styles
        const titleStyle = { fontSize: '24px', fill: '#FFD700', fontFamily: '"Press Start 2P"', stroke: '#000', strokeThickness: 4 };
        const textStyle = { fontSize: '14px', fill: '#ffffff', fontFamily: '"Press Start 2P"', align: 'center', wordWrap: { width: this.scale.width - 100 } };
        const buttonStyle = { fontSize: '16px', fill: '#00ffff', fontFamily: '"Press Start 2P"', backgroundColor: '#00000099', padding: { x: 10, y: 5 } };

        // --- UI Elements ---
        this.add.text(centerX, 80, LanguageManager.get(this, 'altar_title'), titleStyle).setOrigin(0.5);

        this.statusText = this.add.text(centerX, 150, LanguageManager.get(this, 'altar_fetching_status'), textStyle).setOrigin(0.5);

        // --- Donation Input ---
        this.add.text(centerX, centerY - 20, LanguageManager.get(this, 'altar_donate_prompt'), textStyle).setOrigin(0.5);

        this.donationInput = this.add.dom(centerX, centerY + 20).createFromHTML(`
            <input type="number" id="donation-amount" style="width: 200px; padding: 10px; font-size: 16px; text-align: center; background-color: #1a1a1a; color: #00ffff; border: 2px solid #00ffff;" value="10">
        `).setOrigin(0.5);

        const donateButton = this.add.text(centerX, centerY + 80, LanguageManager.get(this, 'altar_donate_button'), { ...buttonStyle, fill: '#FFD700' }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // --- Back Button ---
        const backButton = this.add.text(centerX, this.scale.height - 80, LanguageManager.get(this, 'back_to_menu'), buttonStyle).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // --- Event Listeners ---
        donateButton.on('pointerdown', () => this.handleDonation());
        backButton.on('pointerdown', () => {
            SoundManager.play(this, 'click');
            this.scene.start('MenuScene');
        });

        // Hover Effects
        [donateButton, backButton].forEach(btn => {
            const originalColor = btn.style.color;
            btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
            btn.on('pointerout', () => btn.setStyle({ fill: originalColor }));
        });


        this.fetchAltarStatus();
    }

    async fetchAltarStatus() {
        try {
            const response = await api.fetch('/altar/status', {}, false); // Public endpoint
            if (response.success) {
                this.updateStatusText(response.status);
            } else {
                this.statusText.setText(LanguageManager.get(this, 'altar_error_fetch'));
            }
        } catch (error) {
            console.error('Failed to fetch altar status:', error);
            this.statusText.setText(LanguageManager.get(this, 'altar_error_connection'));
        }
    }

    updateStatusText(status) {
        const { current_donations, donation_goal, active_buff_type, buff_expires_at } = status;
        let text = LanguageManager.get(this, 'altar_status_goal', { donated: current_donations, goal: donation_goal });

        if (active_buff_type) {
            const expires = new Date(buff_expires_at).toLocaleString();
            text += LanguageManager.get(this, 'altar_status_buff', { buff: active_buff_type, expires: expires });
        } else {
            text += LanguageManager.get(this, 'altar_status_no_buff');
        }
        this.statusText.setText(text);
    }

    async handleDonation() {
        const amountElement = document.getElementById('donation-amount');
        const amount = parseInt(amountElement.value, 10);

        if (isNaN(amount) || amount <= 0) {
            this.showToast(LanguageManager.get(this, 'altar_error_invalid_amount'));
            return;
        }

        SoundManager.play(this, 'click');
        this.showToast(LanguageManager.get(this, 'altar_info_starting', { amount }));

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // 1. Approve the contract to spend BCOIN
            this.showToast(LanguageManager.get(this, 'altar_info_step1'));
            const bcoinContract = new ethers.Contract(BCOIN_CONTRACT_ADDRESS, BCOIN_ABI, signer);
            const amountInWei = ethers.parseUnits(amount.toString(), 18);
            const approveTx = await bcoinContract.approve(SPENDER_ADDRESS, amountInWei);
            await approveTx.wait();

            // 2. Call the donation function on the smart contract
            this.showToast(LanguageManager.get(this, 'altar_info_step2'));
            const altarContract = new ethers.Contract(SPENDER_ADDRESS, ALTAR_ABI, signer);
            const donateTx = await altarContract.donateToAltar(amountInWei);
            const receipt = await donateTx.wait();

            // 3. Send the transaction hash to the backend for verification
            this.showToast(LanguageManager.get(this, 'altar_info_step3'));
            const txHash = receipt.hash;
            const response = await api.fetch('/altar/donate', {
                method: 'POST',
                body: JSON.stringify({ amount, txHash })
            }, true); // Requires authentication

            if (response.success) {
                SoundManager.play(this, 'upgrade');
                this.showToast(LanguageManager.get(this, 'altar_success_donation'));
                this.updateStatusText(response.altarStatus);
            } else {
                throw new Error(response.message || "Server verification failed.");
            }

        } catch (error) {
            console.error("Donation failed:", error);
            SoundManager.play(this, 'error');
            this.showToast(LanguageManager.get(this, 'altar_error_connection') + `: ${error.message}`);
        }
    }

    showToast(message) {
        // A simple feedback mechanism for the user
        const toast = this.add.text(this.cameras.main.centerX, this.cameras.main.height - 100, message, {
            fontSize: '16px', fill: '#ffffff', backgroundColor: '#000000a0', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: toast,
            alpha: 0,
            y: toast.y - 50,
            duration: 4000,
            ease: 'Power2',
            onComplete: () => toast.destroy()
        });
    }
}