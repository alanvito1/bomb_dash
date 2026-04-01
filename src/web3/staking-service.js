/**
 * @class StakingService
 * @description A service for managing all interactions with the HeroStaking.
 * Mocked for Offline-Strict Mode.
 */
class StakingService {
  constructor() {
    this.isMock = true;
  }

  async _handleTransaction(promise, msg) {
    console.log('[MockStaking] Simulating transaction:', msg);
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  async approve() {
    await this._handleTransaction(null, 'Approval successful (Mock)');
  }

  async depositHero(tokenId) {
    await this._handleTransaction(null, `Hero ${tokenId} staked successfully (Mock)`);
  }

  async withdrawHero(tokenId, level, xp, signature) {
    await this._handleTransaction(null, `Hero ${tokenId} withdrawn successfully (Mock)`);
  }

  async isApproved() {
    return true;
  }
}

const stakingService = new StakingService();
export default stakingService;
