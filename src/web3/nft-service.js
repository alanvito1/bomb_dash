import contracts from '../config/contracts.js';

let ethersState = null;

/**
 * Lazily initializes and returns Ethers.js dependencies for the NFT service.
 * @returns {Promise<{ethers: object, provider: object, contract: object}>} A promise that resolves with the ethers instances.
 * @throws {Error} Throws an error if MetaMask is not installed or if the network is incorrect.
 * @private
 */
async function getEthersDependencies() {
  if (ethersState) {
    return ethersState;
  }

  const { ethers } = await import('ethers');

  if (!window.ethereum) {
    throw new Error('MetaMask is not installed.');
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();

    if (Number(network.chainId) !== contracts.BOMB_CRYPTO_CHAIN_ID) {
      throw new Error(
        `Incorrect network. Please connect to BSC Testnet (ID: ${contracts.BOMB_CRYPTO_CHAIN_ID}).`
      );
    }

    const contract = new ethers.Contract(
      contracts.mockHeroNFT.address,
      contracts.mockHeroNFT.abi,
      provider
    );
    ethersState = { ethers, provider, contract };
    return ethersState;
  } catch (error) {
    console.error('Failed to initialize NftService dependencies:', error);
    throw error;
  }
}

/**
 * @class NftService
 * @description A service dedicated to interacting with the Hero NFT smart contract.
 * It provides methods for fetching NFT data owned by the current user.
 */
class NftService {
  /**
   * @constructor
   */
  constructor() {
    // Initialization is handled on-demand.
  }

  /**
   * Fetches all Hero NFTs owned by the connected user's wallet address.
   * @returns {Promise<{success: boolean, heroes: Array<object>, message?: string}>} An object containing a success flag,
   * an array of hero objects, and an optional error message.
   */
  async getOwnedNfts() {
    try {
      const { provider, contract } = await getEthersDependencies();
      const signer = await provider.getSigner();
      const ownerAddress = await signer.getAddress();

      const balance = await contract.balanceOf(ownerAddress);
      const balanceNum = Number(balance);

      if (balanceNum === 0) {
        return { success: true, heroes: [] };
      }

      const heroes = [];
      for (let i = 0; i < balanceNum; i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(ownerAddress, i);
        const stats = await contract.getHeroStats(tokenId);

        const heroData = {
          id: `nft-${tokenId.toString()}`,
          tokenId: tokenId.toString(),
          name: `Bomber #${tokenId.toString()}`,
          level: 1,
          xp: 0,
          stats: {
            damage: Number(stats.damage),
            health: Number(stats.health),
            speed: Number(stats.speed),
            stamina: Number(stats.stamina),
          },
          sprite_name: 'player',
          isNFT: true,
        };
        heroes.push(heroData);
      }

      return { success: true, heroes: heroes };
    } catch (error) {
      console.error('Error fetching owned NFTs:', error);
      let userMessage = 'An error occurred while fetching your NFTs.';
      if (error.code === 'CALL_EXCEPTION') {
        userMessage = 'Could not retrieve hero data.';
      } else if (error.message.includes('Incorrect network')) {
        userMessage = error.message;
      }
      return { success: false, message: userMessage, heroes: [] };
    }
  }
}

const nftService = new NftService();
export default nftService;
