import { ethers } from 'ethers';
import { BCOIN_TESTNET_ADDRESS, BCOIN_ABI } from '../config/contracts.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

class BcoinService {
    constructor() {
        this.provider = null;
        this.contract = null;
        this.balance = '0.00';
        this.error = null;

        if (window.ethereum) {
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.contract = new ethers.Contract(BCOIN_TESTNET_ADDRESS, BCOIN_ABI, this.provider);
        }

        // Listen for requests to update the balance
        GameEventEmitter.on('bcoin-balance-changed', this.updateBalance.bind(this));
    }

    async getBalance(forceUpdate = false) {
        if (!forceUpdate && this.balance !== '0.00') {
            return { balance: this.balance, error: this.error };
        }
        await this.updateBalance();
        return { balance: this.balance, error: this.error };
    }

    async updateBalance() {
        if (!this.provider || !this.contract) {
            this.error = 'No wallet connected';
            this.balance = '--.--';
            GameEventEmitter.emit('bcoin-balance-update', { balance: this.balance, error: this.error });
            return;
        }

        try {
            const signer = await this.provider.getSigner();
            const address = await signer.getAddress();
            const rawBalance = await this.contract.balanceOf(address);
            const decimals = await this.contract.decimals();

            this.balance = ethers.formatUnits(rawBalance, decimals);
            this.error = null;

        } catch (err) {
            console.error('[BcoinService] Error fetching balance:', err);
            this.error = 'RPC Error';
            this.balance = '--.--';
        }

        // Notify all listeners (like HUDScene) about the updated balance
        GameEventEmitter.emit('bcoin-balance-update', { balance: this.balance, error: this.error });
    }

    async approve(spender, amount) {
        if (!this.provider) {
            throw new Error('Wallet not connected');
        }
        try {
            const signer = await this.provider.getSigner();
            const contractWithSigner = this.contract.connect(signer);
            const decimals = await this.contract.decimals();
            const amountInWei = ethers.parseUnits(amount.toString(), decimals);

            const tx = await contractWithSigner.approve(spender, amountInWei);
            await tx.wait(); // Wait for the transaction to be mined
            return true;
        } catch (error) {
            console.error('[BcoinService] Approval failed:', error);
            throw new Error('Approval failed');
        }
    }
}

// Export a singleton instance
const bcoinService = new BcoinService();
export default bcoinService;