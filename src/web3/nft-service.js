import contracts from '../config/contracts.js';

let ethersState = null;

async function getEthersDependencies() {
    if (ethersState) {
        return ethersState;
    }

    const { ethers } = await import('ethers');

    if (!window.ethereum) {
        throw new Error("MetaMask is not installed.");
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();

        if (Number(network.chainId) !== contracts.BOMB_CRYPTO_CHAIN_ID) {
            throw new Error(`Incorrect network. Please connect to BSC Testnet (ID: ${contracts.BOMB_CRYPTO_CHAIN_ID}).`);
        }

        const contract = new ethers.Contract(contracts.mockHeroNFT.address, contracts.mockHeroNFT.abi, provider);
        ethersState = { ethers, provider, contract };
        return ethersState;
    } catch (error) {
        console.error("Failed to initialize NftService dependencies:", error);
        throw error; // Re-throw to be caught by the calling function
    }
}

/**
 * A service for interacting with the Bombcrypto NFT smart contract.
 */
class NftService {

  constructor() {
    // Initialization is handled on demand by getEthersDependencies
  }

  /**
   * Fetches all Bombcrypto hero NFTs owned by the connected user.
   * @returns {Promise<Array<object>>} A list of hero objects with their on-chain stats.
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
      } else if (error.message.includes("Incorrect network")) {
        userMessage = error.message;
      } else if (error.message.includes("MetaMask")) {
        userMessage = "Could not connect to the blockchain. Check your wallet and network.";
      }
      return { success: false, message: userMessage, heroes: [] };
    }
  }
}

const nftService = new NftService();
export default nftService;