import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, Signer } from "ethers";

// Tipagem para os contratos
import { TournamentController } from "../typechain-types/contracts/TournamentController";
import { MockBCOIN } from "../typechain-types/contracts/mocks/MockBCOIN";

describe("TournamentController", function () {
    let TournamentController: any;
    let tournamentController: TournamentController;
    let MockBCOIN: any;
    let bcoin: MockBCOIN;
    let owner: Signer;
    let teamWallet: Signer;
    let oracle: Signer;
    let player1: Signer;
    let player2: Signer;
    let addrs: Signer[];

    const MINT_AMOUNT = ethers.utils.parseEther("10000"); // 10,000 BCOIN
    const ENTRY_FEE_1V1 = ethers.utils.parseEther("10"); // 10 BCOIN

    beforeEach(async function () {
        // Obter as contas de teste do Hardhat
        [owner, teamWallet, oracle, player1, player2, ...addrs] = await ethers.getSigners();

        // Deploy do MockBCOIN
        MockBCOIN = await ethers.getContractFactory("MockBCOIN");
        bcoin = await MockBCOIN.deploy();
        await bcoin.deployed();

        // Mint de tokens para os jogadores
        await bcoin.mint(await player1.getAddress(), MINT_AMOUNT);
        await bcoin.mint(await player2.getAddress(), MINT_AMOUNT);

        // Deploy do TournamentController
        TournamentController = await ethers.getContractFactory("TournamentController");
        tournamentController = await TournamentController.deploy(
            bcoin.address,
            await teamWallet.getAddress(),
            await oracle.getAddress() // Supondo que o endereço do Oracle é passado no construtor
        );
        await tournamentController.deployed();

        // Definir o endereço do PerpetualRewardPool (usaremos um endereço mock por enquanto)
        await tournamentController.setSoloRewardPool(addrs[0].getAddress()); // Usando uma conta de teste como pool
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await tournamentController.owner()).to.equal(await owner.getAddress());
        });

        it("Should set the correct BCOIN token address", async function () {
            expect(await tournamentController.bcoinTokenAddress()).to.equal(bcoin.address);
        });

        it("Should set the correct team wallet address", async function () {
            expect(await tournamentController.teamWallet()).to.equal(await teamWallet.getAddress());
        });

        it("Should set the correct oracle address", async function () {
            expect(await tournamentController.oracle()).to.equal(await oracle.getAddress());
        });
    });

    // Próximos testes:
    // - Testar a função enterMatch1v1
    // - Testar a função reportMatchResult
    // - Testar a distribuição de taxas e prêmios
});