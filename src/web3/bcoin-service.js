import contracts from '../config/contracts.js';
import GameEventEmitter from '../utils/GameEventEmitter.js';

let ethersInstance = null;

async function getEthers() {
    if (ethersInstance) {
        return ethersInstance;
    }

    const { ethers } = await import('ethers');

    if (!window.ethereum) {
        throw new Error('No wallet detected');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(contracts.bcoin.address, contracts.bcoin.abi, provider);
    ethersInstance = { ethers, provider, contract };
    return ethersInstance;
}

class BcoinService {
    constructor() {
        this.balance = '0.00';
        this.error = null;
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
        try {
            const { ethers, provider, contract } = await getEthers();
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const rawBalance = await contract.balanceOf(address);
            const decimals = await contract.decimals();
            this.balance = ethers.formatUnits(rawBalance, decimals);
            this.error = null;
        } catch (err) {
            console.error('[BcoinService] Error fetching balance:', err);
            this.error = (err.message === 'No wallet detected') ? 'No wallet connected' : 'RPC Error';
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