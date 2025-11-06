const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

// Helper function to update the .env file
function updateEnvFile(updates) {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        console.warn(`[WARNING] .env file not found at ${envPath}. Creating a new one.`);
        // If you want to create it, you can use fs.writeFileSync, otherwise just return.
        // For this script, we'll assume it should exist and just warn.
        return;
    }

    let content = fs.readFileSync(envPath, 'utf8');

    for (const key in updates) {
        const value = updates[key];
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;

        if (content.match(regex)) {
            // Update existing key
            content = content.replace(regex, newLine);
        } else {
            // Append new key
            content += `\n${newLine}`;
        }
    }

    fs.writeFileSync(envPath, content);
    console.log('- Successfully updated the .env file with new contract addresses.');
}


async function main() {
    // 1. Get Signers and provider
    const provider = ethers.provider;
    let deployer, oracle, teamWallet;

    // For local hardhat network, we get the deployer from hardhat's signers,
    // but we instantiate the oracle and team wallets from private keys in the .env file
    // to ensure consistency with the backend.
    const signers = await ethers.getSigners();
    deployer = signers[0];

    if (!process.env.ORACLE_PRIVATE_KEY || !process.env.TEAM_WALLET_PRIVATE_KEY) {
        throw new Error("ORACLE_PRIVATE_KEY and TEAM_WALLET_PRIVATE_KEY must be set in .env");
    }

    oracle = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);
    teamWallet = new ethers.Wallet(process.env.TEAM_WALLET_PRIVATE_KEY, provider);
    console.log("Running on local network...");

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

    // 4.5. Deploy WagerArena
    const WagerArena = await ethers.getContractFactory("WagerArena");
    const wagerArena = await WagerArena.deploy(
        bcoinAddress,
        oracle.address
    );
    await wagerArena.waitForDeployment();
    const wagerArenaAddress = await wagerArena.getAddress();
    console.log("WagerArena deployed to:", wagerArenaAddress);

    // 4.6. Deploy MockHeroNFT (for testing staking)
    const MockHeroNFT = await ethers.getContractFactory("MockHeroNFT");
    const mockHeroNFT = await MockHeroNFT.deploy();
    await mockHeroNFT.waitForDeployment();
    const mockHeroNFTAddress = await mockHeroNFT.getAddress();
    console.log("MockHeroNFT deployed to:", mockHeroNFTAddress);

    // 4.7. Deploy HeroStaking
    const HeroStaking = await ethers.getContractFactory("HeroStaking");
    const heroStaking = await HeroStaking.deploy(mockHeroNFTAddress, oracle.address); // Pass NFT and Oracle addresses to constructor
    await heroStaking.waitForDeployment();
    const heroStakingAddress = await heroStaking.getAddress();
    console.log("HeroStaking deployed to:", heroStakingAddress);


    // 5. Configure Contracts
    console.log("\nConfiguring contract interactions...");
    // Set the solo reward pool address in the tournament controller
    const tx1 = await tournamentController.setSoloRewardPool(perpetualRewardPoolAddress);
    await tx1.wait();
    console.log(`- Set solo reward pool address in TournamentController.`);

    // Configure WagerArena
    const wagerTx1 = await wagerArena.setTeamWallet(teamWallet.address);
    await wagerTx1.wait();
    console.log(`- Set team wallet address in WagerArena.`);
    const wagerTx2 = await wagerArena.setSoloRewardPool(perpetualRewardPoolAddress);
    await wagerTx2.wait();
    console.log(`- Set solo reward pool address in WagerArena.`);

    // FURIA-FS-05: The oracle is set in the constructor for PerpetualRewardPool.
    // The explicit call to setOracle was incorrect as the function does not exist.
    // This line is intentionally removed.
    console.log(`- Oracle for PerpetualRewardPool was set in the constructor.`);

    // 6. Fund the Reward Pool
    console.log("\nFunding the perpetual reward pool...");
    const initialPoolFunding = ethers.parseUnits("100000", 18); // 100,000 BCOIN
    const tx2 = await bcoin.transfer(perpetualRewardPoolAddress, initialPoolFunding);
    await tx2.wait();
    const poolBalance = await bcoin.balanceOf(perpetualRewardPoolAddress);
    console.log(`- Transferred ${ethers.formatUnits(initialPoolFunding, 18)} BCOIN to the reward pool.`);
    console.log(`- PerpetualRewardPool BCOIN balance: ${ethers.formatUnits(poolBalance, 18)}`);

    // 6.5 Fund Test Wallet
    if (process.env.PRIVATE_KEY) {
        console.log("\nFunding the primary test wallet...");
        const testWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        const testWalletAddress = testWallet.address;
        const amountToTransfer = ethers.parseUnits("10000", 18); // 10,000 BCOIN

        const tx3 = await bcoin.transfer(testWalletAddress, amountToTransfer);
        await tx3.wait();
        const testWalletBalance = await bcoin.balanceOf(testWalletAddress);
        console.log(`- Transferred ${ethers.formatUnits(amountToTransfer, 18)} BCOIN to test wallet ${testWalletAddress}.`);
        console.log(`- Test wallet BCOIN balance: ${ethers.formatUnits(testWalletBalance, 18)}`);
    } else {
        console.log("\nSkipping test wallet funding: PRIVATE_KEY not found in .env file.");
    }

    // 6.6 Fund Oracle Wallet
    console.log("\nFunding the oracle wallet...");
    const oracleBcoinAmount = ethers.parseUnits("10000", 18); // 10,000 BCOIN
    const oracleEthAmount = ethers.parseEther("10.0"); // 10 ETH for gas

    // Transfer BCOIN to Oracle
    const bcoinTx = await bcoin.transfer(oracle.address, oracleBcoinAmount);
    await bcoinTx.wait();
    const oracleBcoinBalance = await bcoin.balanceOf(oracle.address);
    console.log(`- Transferred ${ethers.formatUnits(oracleBcoinAmount, 18)} BCOIN to oracle ${oracle.address}.`);
    console.log(`- Oracle BCOIN balance: ${ethers.formatUnits(oracleBcoinBalance, 18)}`);

    // Transfer ETH to Oracle
    const ethTx = await deployer.sendTransaction({
        to: oracle.address,
        value: oracleEthAmount
    });
    await ethTx.wait();
    const oracleEthBalance = await provider.getBalance(oracle.address);
    console.log(`- Transferred ${ethers.formatEther(oracleEthAmount)} ETH to oracle ${oracle.address}.`);
    console.log(`- Oracle ETH balance: ${ethers.formatEther(oracleEthBalance)}`);

    if (oracleEthBalance > 0 && oracleBcoinBalance > 0) {
        console.log('[SUCCESS] Oracle wallet funded successfully.');
    } else {
        console.log('[WARNING] Oracle wallet funding might have failed. Please check balances.');
    }

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
        wagerArenaAddress: wagerArenaAddress,
        heroStakingAddress: heroStakingAddress,
        mockHeroNFTAddress: mockHeroNFTAddress,
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
    saveAbi("WagerArena");
    saveAbi("HeroStaking");
    saveAbi("MockHeroNFT"); // Add mock hero ABI for frontend tests
    // Use a fully qualified name to resolve the ambiguity for the IBEP20 interface
    saveAbi("contracts/PerpetualRewardPool.sol:IBEP20");

    // 8. Update .env file
    console.log("\nUpdating .env file with contract addresses...");
    const envUpdates = {
        TOURNAMENT_CONTROLLER_ADDRESS: tournamentControllerAddress,
        PERPETUAL_REWARD_POOL_ADDRESS: perpetualRewardPoolAddress,
        WAGER_ARENA_ADDRESS: wagerArenaAddress,
        HERO_STAKING_ADDRESS: heroStakingAddress, // Add new staking address
        MOCK_HERO_NFT_ADDRESS: mockHeroNFTAddress, // Add mock NFT address
        BCOIN_TESTNET_ADDRESS: bcoinAddress,
        ORACLE_WALLET_ADDRESS: oracle.address,
    };
    updateEnvFile(envUpdates);


    console.log("\nDeployment and setup complete! 🎉");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });