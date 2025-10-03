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

        // --- UI Elements ---
        this.add.text(centerX, 80, 'Altar of Global Buffs', {
            fontSize: '28px', fill: '#FFD700', fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.statusText = this.add.text(centerX, 140, 'Fetching status...', {
            fontSize: '16px', fill: '#cccccc', fontFamily: 'monospace', align: 'center', wordWrap: { width: 450 }
        }).setOrigin(0.5);

        // --- Donation Input ---
        this.add.text(centerX, centerY, 'Amount to Donate:', {
            fontSize: '18px', fill: '#ffffff', fontFamily: 'monospace'
        }).setOrigin(0.5, 1);

        this.donationInput = this.add.dom(centerX, centerY + 20).createFromHTML(`
            <input type="number" id="donation-amount" style="width: 200px; padding: 10px; font-size: 16px; text-align: center;" value="10">
        `).setOrigin(0.5);

        const donateButton = this.add.text(centerX, centerY + 80, 'Donate BCOIN', {
            fontSize: '20px', fill: '#000000', fontFamily: 'monospace', backgroundColor: '#FFD700', padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // --- Back Button ---
        const backButton = this.add.text(centerX, this.scale.height - 50, '< Back to Menu', {
            fontSize: '18px', fill: '#00ffff', fontFamily: 'monospace'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // --- Event Listeners ---
        donateButton.on('pointerdown', () => this.handleDonation());
        backButton.on('pointerdown', () => {
            SoundManager.play(this, 'click');
            this.scene.start('MenuScene');
        });

        this.fetchAltarStatus();
    }

    async fetchAltarStatus() {
        try {
            const response = await api.fetch('/altar/status', {}, false); // Public endpoint
            if (response.success) {
                this.updateStatusText(response.status);
            } else {
                this.statusText.setText('Error: Could not fetch altar status.');
            }
        } catch (error) {
            console.error('Failed to fetch altar status:', error);
            this.statusText.setText('Error: Connection failed.');
        }
    }

    updateStatusText(status) {
        const { current_donations, donation_goal, active_buff_type, buff_expires_at } = status;
        let text = `Community Goal: ${current_donations} / ${donation_goal} BCOIN\n\n`;

        if (active_buff_type) {
            const expires = new Date(buff_expires_at).toLocaleString();
            text += `Active Buff: ${active_buff_type}\nExpires: ${expires}`;
        } else {
            text += "No active global buff. Donate to activate one!";
        }
        this.statusText.setText(text);
    }

    async handleDonation() {
        const amountElement = document.getElementById('donation-amount');
        const amount = parseInt(amountElement.value, 10);

        if (isNaN(amount) || amount <= 0) {
            this.showToast("Please enter a valid amount.");
            return;
        }

        SoundManager.play(this, 'click');
        this.showToast(`Starting donation of ${amount} BCOIN...`);

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // 1. Approve the contract to spend BCOIN
            this.showToast('Step 1/3: Approving transaction...');
            const bcoinContract = new ethers.Contract(BCOIN_CONTRACT_ADDRESS, BCOIN_ABI, signer);
            const amountInWei = ethers.parseUnits(amount.toString(), 18);
            const approveTx = await bcoinContract.approve(SPENDER_ADDRESS, amountInWei);
            await approveTx.wait();

            // 2. Call the donation function on the smart contract
            this.showToast('Step 2/3: Sending donation...');
            const altarContract = new ethers.Contract(SPENDER_ADDRESS, ALTAR_ABI, signer);
            const donateTx = await altarContract.donateToAltar(amountInWei);
            const receipt = await donateTx.wait();

            // 3. Send the transaction hash to the backend for verification
            this.showToast('Step 3/3: Verifying with server...');
            const txHash = receipt.hash;
            const response = await api.fetch('/altar/donate', {
                method: 'POST',
                body: JSON.stringify({ amount, txHash })
            }, true); // Requires authentication

            if (response.success) {
                SoundManager.play(this, 'upgrade');
                this.showToast("Donation successful! Thank you!");
                this.updateStatusText(response.altarStatus);
            } else {
                throw new Error(response.message || "Server verification failed.");
            }

        } catch (error) {
            console.error("Donation failed:", error);
            SoundManager.play(this, 'error');
            this.showToast(`Error: ${error.message}`);
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