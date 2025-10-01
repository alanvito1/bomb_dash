const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    // 1. Get Signers and provider
    const provider = ethers.provider;
    let deployer, oracle, teamWallet;

    if (hre.network.name === "bscTestnet") {
        if (!process.env.PRIVATE_KEY || !process.env.ORACLE_PRIVATE_KEY) {
            throw new Error("PRIVATE_KEY and ORACLE_PRIVATE_KEY must be set in .env for bscTestnet");
        }
        deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        oracle = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);
        // For testnet, we can generate a new wallet for the team or use a predefined one.
        // Here, we'll use the deployer's address as the team wallet for simplicity.
        teamWallet = deployer;
        console.log("Running on bscTestnet...");
    } else {
        // For local hardhat network
        [deployer, oracle, teamWallet] = await ethers.getSigners();
        console.log("Running on local network...");
    }

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Oracle address:", oracle.address);
    console.log("Team Wallet address:", teamWallet.address);
    console.log("Account balance:", (await provider.getBalance(deployer.address)).toString());

    // 2. Deploy MockBCOIN
    const MockBCOIN = await ethers.getContractFactory("MockBCOIN");
    const bcoin = await MockBCOIN.deploy();
    await bcoin.waitForDeployment();
    const bcoinAddress = await bcoin.getAddress();
    console.log("MockBCOIN deployed to:", bcoinAddress);

    // Mint initial supply to the deployer
    const initialMintAmount = ethers.parseUnits("1000000", 18); // 1,000,000 BCOIN
    await bcoin.mint(deployer.address, initialMintAmount);
    console.log(`Minted ${ethers.formatUnits(initialMintAmount, 18)} BCOIN to deployer`);

    // 3. Deploy TournamentController
    const TournamentController = await ethers.getContractFactory("TournamentController");
    const tournamentController = await TournamentController.deploy(
        bcoinAddress,
        teamWallet.address,
        oracle.address
    );
    await tournamentController.waitForDeployment();
    const tournamentControllerAddress = await tournamentController.getAddress();
    console.log("TournamentController deployed to:", tournamentControllerAddress);

    // 4. Deploy PerpetualRewardPool
    // Emission rate: 0.5% with 1,000,000 precision -> 5000
    const emissionRate = 5000;
    const PerpetualRewardPool = await ethers.getContractFactory("PerpetualRewardPool");
    const perpetualRewardPool = await PerpetualRewardPool.deploy(
        bcoinAddress,
        oracle.address,
        emissionRate
    );
    await perpetualRewardPool.waitForDeployment();
    const perpetualRewardPoolAddress = await perpetualRewardPool.getAddress();
    console.log("PerpetualRewardPool deployed to:", perpetualRewardPoolAddress);

    // 5. Configure Contracts
    console.log("\nConfiguring contract interactions...");
    // Set the solo reward pool address in the tournament controller
    const tx1 = await tournamentController.setSoloRewardPool(perpetualRewardPoolAddress);
    await tx1.wait();
    console.log(`- Set solo reward pool address in TournamentController.`);

    // 6. Fund the Reward Pool
    console.log("\nFunding the perpetual reward pool...");
    const initialPoolFunding = ethers.parseUnits("100000", 18); // 100,000 BCOIN
    const tx2 = await bcoin.transfer(perpetualRewardPoolAddress, initialPoolFunding);
    await tx2.wait();
    const poolBalance = await bcoin.balanceOf(perpetualRewardPoolAddress);
    console.log(`- Transferred ${ethers.formatUnits(initialPoolFunding, 18)} BCOIN to the reward pool.`);
    console.log(`- PerpetualRewardPool BCOIN balance: ${ethers.formatUnits(poolBalance, 18)}`);

    // 7. Save Artifacts for Backend
    console.log("\nSaving contract addresses and ABIs for the backend...");
    const backendDir = path.join(__dirname, '..', 'backend', 'contracts');
    if (!fs.existsSync(backendDir)) {
        fs.mkdirSync(backendDir, { recursive: true });
    }

    const addresses = {
        bcoinTokenAddress: bcoinAddress,
        tournamentControllerAddress: tournamentControllerAddress,
        perpetualRewardPoolAddress: perpetualRewardPoolAddress,
        oracleAddress: oracle.address,
        teamWalletAddress: teamWallet.address,
    };

    fs.writeFileSync(
        path.join(backendDir, 'contract-addresses.json'),
        JSON.stringify(addresses, null, 2)
    );
    console.log("- Wrote contract addresses to backend/contracts/contract-addresses.json");

    // Function to save ABI
    const saveAbi = (contractIdentifier) => {
        const artifact = artifacts.readArtifactSync(contractIdentifier);
        // If the identifier is fully qualified (e.g., "contracts/file.sol:Contract"),
        // extract just the contract name for the filename.
        const contractName = contractIdentifier.includes(':')
            ? contractIdentifier.split(':')[1]
            : contractIdentifier;

        fs.writeFileSync(
            path.join(backendDir, `${contractName}.json`),
            JSON.stringify(artifact.abi, null, 2)
        );
        console.log(`- Wrote ${contractName} ABI to backend/contracts/${contractName}.json`);
    };

    // Adjust contract names if they differ in your artifacts
    saveAbi("TournamentController");
    saveAbi("PerpetualRewardPool");
    // Use a fully qualified name to resolve the ambiguity for the IBEP20 interface
    saveAbi("contracts/PerpetualRewardPool.sol:IBEP20");

    console.log("\nDeployment and setup complete! 🎉");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });