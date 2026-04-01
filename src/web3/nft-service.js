/**
 * @class NftService
 * @description A service dedicated to interacting with the Hero NFT smart contract.
 * Mocked for Offline-Strict Mode.
 */
class NftService {
  constructor() {
    this.isMock = true;
  }

  /**
   * Fetches all Hero NFTs owned by the user.
   * In Offline Mode, we return an empty array or locally stored NFTs if we implement a local mint.
   */
  async getOwnedNfts() {
    console.log('[MockNFT] Fetching owned NFTs (Offline Mode)');
    return { success: true, heroes: [] };
  }
}

const nftService = new NftService();
export default nftService;
