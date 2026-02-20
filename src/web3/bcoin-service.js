import GameEventEmitter from '../utils/GameEventEmitter.js';

// Static Mock Balance
const MOCK_BCOIN = 50000;
const MOCK_NATIVE = 1.5;

console.log('⚠️ OFFLINE MODE: BcoinService is running in full mock mode.');

class BcoinService {
  constructor() {
    this.balance = MOCK_BCOIN;
    this.nativeBalance = MOCK_NATIVE;
    this.error = null;

    // Auto-emit initial balance
    setTimeout(() => this.updateBalance(), 100);
  }

  async getBalance(forceUpdate = false) {
    return {
      balance: this.balance,
      nativeBalance: this.nativeBalance,
      error: null,
    };
  }

  async updateBalance() {
    console.log('[MockBcoin] Updating balance...');
    // Simulate async
    await new Promise((r) => setTimeout(r, 100));

    this.balance = MOCK_BCOIN;
    this.nativeBalance = MOCK_NATIVE;
    this.error = null;

    GameEventEmitter.emit('bcoin-balance-update', {
      balance: this.balance,
      nativeBalance: this.nativeBalance,
      error: this.error,
    });
  }

  async approve(spender, amount) {
    console.log(`[MockBcoin] Approved ${amount} for ${spender}`);
    GameEventEmitter.emit('transaction:pending', '0xMockHash');
    await new Promise((r) => setTimeout(r, 1000));
    GameEventEmitter.emit(
      'transaction:success',
      `Successfully approved ${amount} BCOIN.`
    );
    return { status: 1 };
  }

  async getAllowance(owner, spender) {
    return 999999; // Always allowed
  }
}

const bcoinService = new BcoinService();
export default bcoinService;
