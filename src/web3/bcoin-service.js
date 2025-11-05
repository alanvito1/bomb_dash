import contracts from '../config/contracts.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

let ethersInstance = null;

/**
 * Lazily initializes and returns the Ethers.js instance and BCOIN contract.
 * @returns {Promise<{ethers: object, provider: object, contract: object} | null>} A promise that resolves with the ethers instances, or null if no wallet is found.
 * @private
 */
async function getEthers() {
    if (ethersInstance) {
        return ethersInstance;
    }

    const { ethers } = await import('ethers');

    if (!window.ethereum) {
        console.warn('[BcoinService] No wallet (window.ethereum) detected. Cannot initialize ethers.');
        return null;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(contracts.bcoin.address, contracts.bcoin.abi, provider);
    ethersInstance = { ethers, provider, contract };
    return ethersInstance;
}

/**
 * @class BcoinService
 * @description A service for managing interactions with the BCOIN (BEP-20) smart contract.
 * It handles fetching user balances, approving token spending, and checking allowances.
 */
class BcoinService {
    /**
     * @constructor
     */
    constructor() {
        /** @type {number} The user's BCOIN balance. */
        this.balance = 0;
        /** @type {number} The user's native currency (e.g., BNB) balance. */
        this.nativeBalance = 0;
        /** @type {string | null} Stores any error that occurred while fetching the balance. */
        this.error = null;
        GameEventEmitter.on('bcoin-balance-changed', this.updateBalance.bind(this));
    }

    /**
     * Gets the user's BCOIN and native currency balances.
     * @param {boolean} [forceUpdate=false] - If true, forces a refetch from the blockchain.
     * @returns {Promise<{balance: number, nativeBalance: number, error: string | null}>} An object with the balances and error state.
     */
    async getBalance(forceUpdate = false) {
        if (!forceUpdate && this.balance > 0) {
            return { balance: this.balance, nativeBalance: this.nativeBalance, error: this.error };
        }
        await this.updateBalance();
        return { balance: this.balance, nativeBalance: this.nativeBalance, error: this.error };
    }

    /**
     * Fetches the latest BCOIN and native balances from the blockchain and updates the service's state.
     * Emits a 'bcoin-balance-update' event with the new state.
     * @returns {Promise<void>}
     */
    async updateBalance() {
        try {
            const ethersInfo = await getEthers();
            if (!ethersInfo) {
                this.error = 'No wallet connected';
                this.balance = 0;
                this.nativeBalance = 0;
                GameEventEmitter.emit('bcoin-balance-update', { balance: this.balance, nativeBalance: this.nativeBalance, error: this.error });
                return;
            }
            const { ethers, provider, contract } = ethersInfo;
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const rawBalance = await contract.balanceOf(address);
            const decimals = await contract.decimals();
            this.balance = parseFloat(ethers.formatUnits(rawBalance, decimals));

            const nativeBalanceWei = await provider.getBalance(address);
            this.nativeBalance = parseFloat(ethers.formatUnits(nativeBalanceWei, 18));

            this.error = null;
        } catch (err) {
            console.error('[BcoinService] Error fetching balance:', err);
            this.error = 'RPC Error';
            this.balance = 0;
            this.nativeBalance = 0;
        }
        GameEventEmitter.emit('bcoin-balance-update', {
            balance: this.balance,
            nativeBalance: this.nativeBalance,
            error: this.error
        });
    }

    /**
     * A private helper to wrap a transaction promise, emitting standard events.
     * @param {Promise<object>} transactionPromise - The promise returned by the contract method call.
     * @param {string} successMessage - The message to emit on successful confirmation.
     * @returns {Promise<object>} A promise that resolves with the confirmed transaction receipt.
     * @private
     */
    async _handleTransaction(transactionPromise, successMessage) {
        try {
            const tx = await transactionPromise;
            GameEventEmitter.emit('transaction:pending', tx.hash);
            const receipt = await tx.wait();
            GameEventEmitter.emit('transaction:success', successMessage);
            return receipt;
        } catch (error) {
            console.error("Transaction failed:", error);
            GameEventEmitter.emit('transaction:error', error);
            throw error;
        }
    }

    /**
     * Approves a spender to withdraw a specified amount of BCOIN from the user's wallet.
     * @param {string} spender - The blockchain address of the contract or wallet to approve.
     * @param {number|string} amount - The amount of BCOIN to approve.
     * @returns {Promise<object>} A promise that resolves with the transaction receipt.
     */
    async approve(spender, amount) {
        const { ethers, provider, contract } = await getEthers();
        const signer = await provider.getSigner();
        const contractWithSigner = contract.connect(signer);
        const decimals = await contract.decimals();
        const amountInWei = ethers.parseUnits(amount.toString(), decimals);

        const txPromise = contractWithSigner.approve(spender, amountInWei);
        return this._handleTransaction(txPromise, `Successfully approved ${amount} BCOIN.`);
    }

    /**
     * Checks the allowance a spender has to withdraw from an owner's address.
     * @param {string} owner - The address of the token owner.
     * @param {string} spender - The address of the spender.
     * @returns {Promise<number>} A promise that resolves with the approved amount in BCOIN units.
     */
    async getAllowance(owner, spender) {
        const { ethers, contract } = await getEthers();
        const allowanceInWei = await contract.allowance(owner, spender);
        const decimals = await contract.decimals();
        return parseFloat(ethers.formatUnits(allowanceInWei, decimals));
    }
}

const bcoinService = new BcoinService();
export default bcoinService;