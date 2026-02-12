const { expect } = require('chai');
const sinon = require('sinon');
const { ethers } = require('ethers');
const stakingService = require('../src/web3/staking-service.js');
const contractsConfig = require('../src/config/contracts.js');

describe.skip('StakingService', () => {
  let mockSigner;
  let mockStakingContract;
  let mockNftContract;
  let browserProviderStub;

  beforeEach(() => {
    // --- Mock the ethers.js functionality ---

    // 1. Mock the Signer
    mockSigner = {
      getAddress: sinon.stub().resolves('0xMockAddress'),
    };

    // 2. Mock the NFT Contract (for approvals)
    mockNftContract = {
      setApprovalForAll: sinon.stub().resolves({
        wait: sinon
          .stub()
          .resolves({ status: 1, transactionHash: '0xapprovalhash' }),
      }),
      isApprovedForAll: sinon.stub().resolves(false), // Default to not approved
    };

    // 3. Mock the Staking Contract
    mockStakingContract = {
      depositHero: sinon.stub().resolves({
        wait: sinon
          .stub()
          .resolves({ status: 1, transactionHash: '0xdeposithash' }),
      }),
    };

    // 4. Stub the ethers.Contract constructor to return our mocks
    const contractStub = sinon.stub(ethers, 'Contract');
    contractStub
      .withArgs(
        contractsConfig.heroStaking.address,
        sinon.match.any,
        mockSigner
      )
      .returns(mockStakingContract);
    contractStub
      .withArgs(
        contractsConfig.mockHeroNFT.address,
        sinon.match.any,
        mockSigner
      )
      .returns(mockNftContract);

    // 5. Stub the ethers.BrowserProvider to return a mock provider
    const mockProvider = {
      getSigner: sinon.stub().resolves(mockSigner),
    };
    browserProviderStub = sinon
      .stub(ethers, 'BrowserProvider')
      .returns(mockProvider);

    // 6. Mock the global window.ethereum object required by the service
    // This needs to be a valid EIP-1193 provider to be accepted by ethers.BrowserProvider
    global.window = {
      ethereum: {
        isMetaMask: true,
        request: sinon.stub().resolves(['0xMockAddress']), // Mock basic methods
        on: sinon.stub(),
        removeListener: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    // Restore all stubs
    sinon.restore();
    // Clean up the global mock
    delete global.window;
    // Reset the service's internal state for test isolation
    stakingService.provider = null;
    stakingService.signer = null;
    stakingService.stakingContract = null;
    stakingService.nftContract = null;
  });

  it('should correctly call setApprovalForAll on the NFT contract', async () => {
    // --- Act ---
    const txResponse = await stakingService.approve();

    // --- Assert ---
    // Ensure the contract method was called correctly
    expect(mockNftContract.setApprovalForAll.calledOnce).to.be.true;
    // Check arguments: (stakingContractAddress, isApproved)
    expect(
      mockNftContract.setApprovalForAll.calledWith(
        contractsConfig.heroStaking.address,
        true
      )
    ).to.be.true;
    // Check that the transaction's wait method was called
    expect(txResponse.wait.calledOnce).to.be.true;
  });

  it('should correctly call depositHero on the staking contract', async () => {
    // --- Arrange ---
    const tokenId = 123;

    // --- Act ---
    const txResponse = await stakingService.depositHero(tokenId);

    // --- Assert ---
    expect(mockStakingContract.depositHero.calledOnce).to.be.true;
    // Check arguments
    expect(mockStakingContract.depositHero.calledWith(tokenId)).to.be.true;
    // Check that the transaction's wait method was called
    expect(txResponse.wait.calledOnce).to.be.true;
  });

  it('should check for approval status correctly', async () => {
    // --- Arrange ---
    mockNftContract.isApprovedForAll.resolves(true); // Simulate it is already approved

    // --- Act ---
    const isApproved = await stakingService.isApproved();

    // --- Assert ---
    expect(isApproved).to.be.true;
    expect(mockNftContract.isApprovedForAll.calledOnce).to.be.true;
    // Check arguments: (ownerAddress, operatorAddress)
    expect(
      mockNftContract.isApprovedForAll.calledWith(
        '0xMockAddress',
        contractsConfig.heroStaking.address
      )
    ).to.be.true;
  });

  it('should initialize only once', async () => {
    // --- Act ---
    await stakingService.approve();
    await stakingService.depositHero(456);

    // --- Assert ---
    // BrowserProvider constructor should only be called once, proving initialization is cached.
    expect(browserProviderStub.callCount).to.equal(1);
  });
});
