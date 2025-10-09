import contracts from '../config/contracts.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

let ethersInstance = null;

async function getEthers() {
    if (ethersInstance) {
        return ethersInstance;
    }

    const { ethers } = await import('ethers');

    if (!window.ethereum) {
        // LP-01 / Final Verification Fix: Handle no wallet gracefully instead of throwing.
        console.warn('[BcoinService] No wallet (window.ethereum) detected. Cannot initialize ethers.');
        return null;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    // FURIA-FS-02: Access address and abi as properties. They are getters that return the values.
    const contract = new ethers.Contract(contracts.bcoin.address, contracts.bcoin.abi, provider);
    ethersInstance = { ethers, provider, contract };
    return ethersInstance;
}

class BcoinService {
    constructor() {
        this.balance = 0; // CQ-01: Use number type for balance
        this.nativeBalance = 0;
        this.error = null;
        GameEventEmitter.on('bcoin-balance-changed', this.updateBalance.bind(this));
    }

    async getBalance(forceUpdate = false) {
        if (!forceUpdate && this.balance > 0) {
            return { balance: this.balance, nativeBalance: this.nativeBalance, error: this.error };
        }
        await this.updateBalance();
        return { balance: this.balance, nativeBalance: this.nativeBalance, error: this.error };
    }

    async updateBalance() {
        try {
            const ethersInfo = await getEthers();
            // LP-01 / Final Verification Fix: If no wallet, ethersInfo will be null.
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
            // CQ-01: Parse the formatted string back into a number
            this.balance = parseFloat(ethers.formatUnits(rawBalance, decimals));

            const nativeBalanceWei = await provider.getBalance(address);
            this.nativeBalance = parseFloat(ethers.formatUnits(nativeBalanceWei, 18));

            this.error = null;
        } catch (err) {
            console.error('[BcoinService] Error fetching balance:', err);
            this.error = (err.message === 'No wallet detected') ? 'No wallet connected' : 'RPC Error';
            this.balance = 0; // Use 0 for error state
            this.nativeBalance = 0;
        }
        GameEventEmitter.emit('bcoin-balance-update', {
            balance: this.balance,
            nativeBalance: this.nativeBalance,
            error: this.error
        });
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
        const { ethers, provider, contract } = await getEthers();
        const signer = await provider.getSigner();
        const contractWithSigner = contract.connect(signer);
        const decimals = await contract.decimals();
        const amountInWei = ethers.parseUnits(amount.toString(), decimals);

        const txPromise = contractWithSigner.approve(spender, amountInWei);
        await this._handleTransaction(txPromise, `Successfully approved ${amount} BCOIN.`);
    }

    async getAllowance(owner, spender) {
        const { ethers, contract } = await getEthers();
        const allowanceInWei = await contract.allowance(owner, spender);
        const decimals = await contract.decimals();
        return parseFloat(ethers.formatUnits(allowanceInWei, decimals));
    }
}

const bcoinService = new BcoinService();
export default bcoinService;