/**
 * @class TournamentService
 * @description A service for interacting with the TournamentController.
 * Mocked for Offline-Strict Mode.
 */
class TournamentService {
  constructor() {
    this.isMock = true;
  }

  async getContract() {
    return { address: '0xMockTournament' };
  }

  async _handleTransaction(promise, msg) {
    console.log('[MockTournament] Simulating transaction:', msg);
    return new Promise(resolve => setTimeout(resolve, 800));
  }

  async payUpgradeFee(cost) {
    console.log(`[MockTournament] Paying upgrade fee: ${cost} BCOIN`);
    // In offline mode, we assume the player has the balance check done in PlayerStateService
    // or we just return success here.
    return this._handleTransaction(null, 'Upgrade fee processed (Mock)');
  }
}

const tournamentService = new TournamentService();
export default tournamentService;
