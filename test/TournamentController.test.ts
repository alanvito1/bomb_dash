import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract, Signer } from 'ethers';

// Tipagem para os contratos
import { TournamentController } from '../typechain-types/contracts/TournamentController';
import { MockBCOIN } from '../typechain-types/contracts/mocks/MockBCOIN';

describe('TournamentController', function () {
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

  const MINT_AMOUNT = ethers.parseEther('10000'); // 10,000 BCOIN
  const ENTRY_FEE_1V1 = ethers.parseEther('10'); // 10 BCOIN

  beforeEach(async function () {
    // Obter as contas de teste do Hardhat
    [owner, teamWallet, oracle, player1, player2, ...addrs] =
      await ethers.getSigners();

    // Deploy do MockBCOIN
    MockBCOIN = await ethers.getContractFactory('MockBCOIN');
    bcoin = await MockBCOIN.deploy();
    await bcoin.waitForDeployment();

    // Mint de tokens para os jogadores
    await bcoin.mint(player1.address, MINT_AMOUNT);
    await bcoin.mint(player2.address, MINT_AMOUNT);

    // Deploy do TournamentController
    TournamentController = await ethers.getContractFactory(
      'TournamentController'
    );
    tournamentController = await TournamentController.deploy(
      await bcoin.getAddress(),
      teamWallet.address,
      oracle.address
    );
    await tournamentController.waitForDeployment();

    // Definir o endereço do PerpetualRewardPool (usaremos um endereço mock por enquanto)
    await tournamentController.setSoloRewardPool(addrs[0].address); // Usando uma conta de teste como pool
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await tournamentController.owner()).to.equal(owner.address);
    });

    it('Should set the correct BCOIN token address', async function () {
      expect(await tournamentController.bcoinTokenAddress()).to.equal(
        await bcoin.getAddress()
      );
    });

    it('Should set the correct team wallet address', async function () {
      expect(await tournamentController.teamWallet()).to.equal(
        teamWallet.address
      );
    });

    it('Should set the correct oracle address', async function () {
      expect(await tournamentController.oracle()).to.equal(oracle.address);
    });
  });

  // Próximos testes:
  // - Testar a função enterMatch1v1
  // - Testar a função reportMatchResult
  // - Testar a distribuição de taxas e prêmios

  describe('Multi-Player Tournaments', function () {
    const TOURNAMENT_ENTRY_FEE = ethers.parseEther('50');

    beforeEach(async function () {
      // Mint BCOIN for additional players
      for (let i = 0; i < 7; i++) {
        await bcoin.mint(addrs[i].address, MINT_AMOUNT);
        await bcoin
          .connect(addrs[i])
          .approve(
            await tournamentController.getAddress(),
            TOURNAMENT_ENTRY_FEE
          );
      }
      await bcoin
        .connect(player1)
        .approve(await tournamentController.getAddress(), TOURNAMENT_ENTRY_FEE);
      await bcoin
        .connect(player2)
        .approve(await tournamentController.getAddress(), TOURNAMENT_ENTRY_FEE);
    });

    it('Should allow a player to create a 4-player tournament', async function () {
      await expect(
        tournamentController
          .connect(player1)
          .createTournament(4, TOURNAMENT_ENTRY_FEE)
      )
        .to.emit(tournamentController, 'TournamentCreated')
        .withArgs(1, player1.address, 4, TOURNAMENT_ENTRY_FEE);

      const tournament = await tournamentController.tournaments(1);
      expect(tournament.id).to.equal(1);
      expect(tournament.creator).to.equal(player1.address);
      expect(tournament.capacity).to.equal(4);
      expect(tournament.entryFee).to.equal(TOURNAMENT_ENTRY_FEE);
      expect(tournament.isActive).to.be.true;
      expect(
        await bcoin.balanceOf(await tournamentController.getAddress())
      ).to.equal(TOURNAMENT_ENTRY_FEE);
    });

    it('Should allow players to join an existing tournament and start it when full', async function () {
      // Player 1 creates the tournament
      await tournamentController
        .connect(player1)
        .createTournament(4, TOURNAMENT_ENTRY_FEE);

      // Other players join
      await expect(tournamentController.connect(player2).joinTournament(1))
        .to.emit(tournamentController, 'PlayerJoinedTournament')
        .withArgs(1, player2.address);

      await expect(tournamentController.connect(addrs[0]).joinTournament(1))
        .to.emit(tournamentController, 'PlayerJoinedTournament')
        .withArgs(1, addrs[0].address);

      // The final player joins, and the tournament should start
      await expect(tournamentController.connect(addrs[1]).joinTournament(1))
        .to.emit(tournamentController, 'TournamentStarted')
        .withArgs(1);

      const participants = await tournamentController.getTournamentParticipants(
        1
      );
      expect(participants.length).to.equal(4);
      const totalPot = TOURNAMENT_ENTRY_FEE * BigInt(4);
      expect(
        await bcoin.balanceOf(await tournamentController.getAddress())
      ).to.equal(totalPot);
    });

    it('Should fail if a player tries to join a full tournament', async function () {
      await tournamentController
        .connect(player1)
        .createTournament(4, TOURNAMENT_ENTRY_FEE);
      await tournamentController.connect(player2).joinTournament(1);
      await tournamentController.connect(addrs[0]).joinTournament(1);
      await tournamentController.connect(addrs[1]).joinTournament(1); // Tournament is now full

      await expect(
        tournamentController.connect(addrs[2]).joinTournament(1)
      ).to.be.revertedWith('Tournament is already full');
    });
  });
});
