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
        GameEventEmitter.emit('bcoin-balance-update', { balance: this.balance, error: this.error });
    }

    async _handleTransaction(transactionPromise, successMessage) {
        try {
            const tx = await transactionPromise;
            GameEventEmitter.emit('transaction:pending', tx.hash);
            await tx.wait();
            GameEventEmitter.emit('transaction:success', successMessage);
        } catch (error) {
            console.error("Transaction failed:", error);
            GameEventEmitter.emit('transaction:error', error);
            throw error;
        }
    }

    async approve(spender, amount) {
        if (!this.provider) throw new Error('Wallet not connected');
        const signer = await this.provider.getSigner();
        const contractWithSigner = this.contract.connect(signer);
        const decimals = await this.contract.decimals();
        const amountInWei = ethers.parseUnits(amount.toString(), decimals);

        const txPromise = contractWithSigner.approve(spender, amountInWei);
        await this._handleTransaction(txPromise, `Successfully approved ${amount} BCOIN.`);
    }

    async getAllowance(owner, spender) {
        if (!this.contract) throw new Error("BCOIN contract not initialized.");
        const allowanceInWei = await this.contract.allowance(owner, spender);
        const decimals = await this.contract.decimals();
        return parseFloat(ethers.formatUnits(allowanceInWei, decimals));
    }
}

const bcoinService = new BcoinService();
export default bcoinService;