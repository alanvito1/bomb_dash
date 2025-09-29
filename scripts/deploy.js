const { ethers } = require("hardhat");

async function main() {
    // Hardhat nos dá 10 contas de teste. Vamos atribuir papéis a algumas delas.
    const [deployer, teamWallet, oracle, player1, player2] = await ethers.getSigners();

    console.log("--- Início do Deploy ---");
    console.log("Deployer:", deployer.address);
    console.log("Team Wallet:", teamWallet.address);
    console.log("Oracle:", oracle.address);
    console.log("Player 1:", player1.address);
    console.log("Player 2:", player2.address);
    console.log("---------------------------\n");

    // 1. Deploy do MockBCOIN
    console.log("Deploying MockBCOIN...");
    const MockBCOINFactory = await ethers.getContractFactory("MockBCOIN");
    const bcoin = await MockBCOINFactory.deploy();
    await bcoin.deployed();
    console.log("✅ MockBCOIN deployed to:", bcoin.address);

    // 2. Deploy do PerpetualRewardPool
    console.log("\nDeploying PerpetualRewardPool...");
    const PerpetualRewardPoolFactory = await ethers.getContractFactory("PerpetualRewardPool");
    const emissionRate = 5000; // 0.5% com 6 casas decimais de precisão
    const rewardPool = await PerpetualRewardPoolFactory.deploy(bcoin.address, oracle.address, emissionRate);
    await rewardPool.deployed();
    console.log("✅ PerpetualRewardPool deployed to:", rewardPool.address);

    // 3. Deploy do TournamentController
    console.log("\nDeploying TournamentController...");
    const TournamentControllerFactory = await ethers.getContractFactory("TournamentController");
    const tournamentController = await TournamentControllerFactory.deploy(bcoin.address, teamWallet.address, oracle.address);
    await tournamentController.deployed();
    console.log("✅ TournamentController deployed to:", tournamentController.address);

    // 4. Configurar o endereço da pool de recompensas no TournamentController
    console.log("\nConfiguring TournamentController...");
    const tx = await tournamentController.setSoloRewardPool(rewardPool.address);
    await tx.wait();
    console.log("✅ SoloRewardPool address set in TournamentController.");

    // 5. Distribuir BCOINs para os jogadores de teste
    console.log("\nDistributing test BCOINs...");
    const mintAmount = ethers.utils.parseEther("1000"); // 1000 BCOIN
    await bcoin.mint(player1.address, mintAmount);
    await bcoin.mint(player2.address, mintAmount);
    console.log(`✅ Minted ${ethers.utils.formatEther(mintAmount)} BCOIN to Player 1 and Player 2.`);

    console.log("\n\n--- 🚀 DEPLOYMENT COMPLETO 🚀 ---\n");
    console.log("Copie as seguintes variáveis para o seu arquivo .env no diretório /backend:\n");
    console.log(`TOURNAMENT_CONTROLLER_ADDRESS=${tournamentController.address}`);
    console.log(`PERPETUAL_REWARD_POOL_ADDRESS=${rewardPool.address}`);
    console.log("# Esta é a chave privada da conta do Oráculo. Use apenas para testes locais.");
    console.log(`ORACLE_PRIVATE_KEY=${oracle.privateKey}`);
    console.log("\n-------------------------------------\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });