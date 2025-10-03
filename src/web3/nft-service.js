import { ethers } from 'ethers';
import { BOMB_CRYPTO_CHAIN_ID, BOMB_CRYPTO_NFT_ADDRESS, BOMB_CRYPTO_NFT_ABI } from '../config/contracts.js';

/**
 * A service for interacting with the Bombcrypto NFT smart contract.
 */
class NftService {

  constructor() {
    this.provider = null;
    this.contract = null;
  }

  /**
   * Initializes the provider and contract instance.
   * @returns {Promise<boolean>} True if initialization is successful, false otherwise.
   */
  async initialize() {
    if (!window.ethereum) {
      console.warn("MetaMask is not installed.");
      return false;
    }

    try {
      this.provider = new ethers.BrowserProvider(window.ethereum);

      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== BOMB_CRYPTO_CHAIN_ID) {
        console.warn(`Incorrect network. Please connect to BSC Testnet (ID: ${BOMB_CRYPTO_CHAIN_ID}).`);
        // Optionally, you could add a request to switch networks here.
        // await window.ethereum.request({
        //   method: 'wallet_switchEthereumChain',
        //   params: [{ chainId: ethers.utils.hexlify(BOMB_CRYPTO_CHAIN_ID) }],
        // });
        return false;
      }

      this.contract = new ethers.Contract(BOMB_CRYPTO_NFT_ADDRESS, BOMB_CRYPTO_NFT_ABI, this.provider);
      return true;
    } catch (error) {
      console.error("Failed to initialize NftService:", error);
      this.provider = null;
      this.contract = null;
      return false;
    }
  }

  /**
   * Fetches all Bombcrypto hero NFTs owned by the connected user.
   * @returns {Promise<Array<object>>} A list of hero objects with their on-chain stats.
   */
  async getOwnedNfts() {
    if (!this.provider || !this.contract) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, message: "Could not connect to the blockchain. Check your wallet and network.", heroes: [] };
      }
    }

    try {
      const signer = await this.provider.getSigner();
      const ownerAddress = await signer.getAddress();

      const balance = await this.contract.balanceOf(ownerAddress);
      const balanceNum = Number(balance);

      if (balanceNum === 0) {
        return { success: true, heroes: [] };
      }

      const heroes = [];
      for (let i = 0; i < balanceNum; i++) {
        const tokenId = await this.contract.tokenOfOwnerByIndex(ownerAddress, i);
        const stats = await this.contract.getHeroStats(tokenId);

        // Map on-chain stats to the game's hero data structure
        const heroData = {
          id: `nft-${tokenId.toString()}`,
          tokenId: tokenId.toString(),
          name: `Bomber #${tokenId.toString()}`, // Placeholder name
          level: 1, // Base level for new NFTs
          xp: 0,
          stats: {
            damage: Number(stats.damage),
            health: Number(stats.health),
            speed: Number(stats.speed),
            stamina: Number(stats.stamina),
          },
          sprite_name: 'player', // Default sprite, can be mapped from stats.bomb_skin later
          isNFT: true,
        };
        heroes.push(heroData);
      }

      return { success: true, heroes: heroes };

    } catch (error) {
      console.error("Error fetching owned NFTs:", error);
      let userMessage = "An error occurred while fetching your NFTs.";
      if (error.code === 'CALL_EXCEPTION') {
        userMessage = "Could not retrieve hero data. The contract might be unavailable or you are on the wrong network.";
      }
      return { success: false, message: userMessage, heroes: [] };
    }
  }
}

const nftService = new NftService();
export default nftService;