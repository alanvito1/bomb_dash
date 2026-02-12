const { expect } = require('chai');
const sinon = require('sinon');
const db = require('../database');
const {
  handleHeroDeposited,
  handleHeroWithdrawn,
} = require('../staking_listener');

// Since staking_listener.js is designed to be initialized, we need to manually
// call the internal handler function for unit testing. We are testing the handler's
// logic, not the listener's connection setup.

describe('Staking Listener', () => {
  let updateHeroStatusStub;

  // Before each test, create a stub for the database function
  beforeEach(() => {
    // We stub the `updateHeroStatus` method on the `db` object.
    updateHeroStatusStub = sinon.stub(db, 'updateHeroStatus');
  });

  // After each test, restore the original function to avoid side-effects
  afterEach(() => {
    sinon.restore();
  });

  it('should call db.updateHeroStatus with the correct tokenId and status when a HeroDeposited event is handled', async () => {
    // --- Arrange ---
    const owner = '0x1234567890123456789012345678901234567890';
    const nftContract = '0x0987654321098765432109876543210987654321';
    const tokenId = 123n; // Use a BigInt to simulate the event data from ethers.js

    // Configure the stub to resolve successfully
    updateHeroStatusStub.resolves({ success: true, changes: 1 });

    // --- Act ---
    // Manually call the event handler with mock data
    await handleHeroDeposited(owner, nftContract, tokenId);

    // --- Assert ---
    // 1. Verify that the stub was called at least once.
    expect(updateHeroStatusStub.calledOnce).to.be.true;

    // 2. Verify it was called with the correct arguments.
    // The BigInt `tokenId` should have been converted to a Number for the database.
    const expectedTokenId = Number(tokenId);
    const expectedStatus = 'staked';
    expect(updateHeroStatusStub.calledWith(expectedTokenId, expectedStatus)).to
      .be.true;
  });

  it('should handle cases where the hero is not found in the database gracefully', async () => {
    // --- Arrange ---
    const owner = '0x1234567890123456789012345678901234567890';
    const nftContract = '0x0987654321098765432109876543210987654321';
    const tokenId = 404n;

    // Configure the stub to simulate no rows being affected
    updateHeroStatusStub.resolves({ success: true, changes: 0 });

    // We also want to spy on console.warn to ensure it's called
    const consoleWarnSpy = sinon.spy(console, 'warn');

    // --- Act ---
    await handleHeroDeposited(owner, nftContract, tokenId);

    // --- Assert ---
    // It should still be called
    expect(updateHeroStatusStub.calledOnce).to.be.true;

    // A warning should be logged to the console
    expect(consoleWarnSpy.calledWith(sinon.match(/no matching hero was found/)))
      .to.be.true;

    // Cleanup the spy
    consoleWarnSpy.restore();
  });

  it('should handle database errors without crashing', async () => {
    // --- Arrange ---
    const owner = '0x1234567890123456789012345678901234567890';
    const nftContract = '0x0987654321098765432109876543210987654321';
    const tokenId = 500n;
    const dbError = new Error('Database connection failed');

    updateHeroStatusStub.rejects(dbError);
    const consoleErrorSpy = sinon.spy(console, 'error');

    // --- Act & Assert ---
    // The test will pass if the function call does not throw an unhandled rejection.
    try {
      await handleHeroDeposited(owner, nftContract, tokenId);
    } catch (e) {
      // If the function throws, it means our catch block inside the function failed.
      // We can fail the test explicitly here.
      expect.fail(
        `handleHeroDeposited should not have thrown an error, but it threw: ${e.message}`
      );
    }

    // Verify that the error was logged to the console
    expect(
      consoleErrorSpy.calledWith(
        sinon.match(/Error updating database/),
        dbError
      )
    ).to.be.true;

    // Cleanup
    consoleErrorSpy.restore();
  });

  context('when handling HeroWithdrawn event', () => {
    it('should call db.updateHeroStatus with status "in_wallet"', async () => {
      // --- Arrange ---
      const owner = '0x1234567890123456789012345678901234567890';
      const tokenId = 789n;
      const level = 10n;
      const xp = 1000n;

      updateHeroStatusStub.resolves({ success: true, changes: 1 });

      // --- Act ---
      await handleHeroWithdrawn(owner, tokenId, level, xp);

      // --- Assert ---
      expect(updateHeroStatusStub.calledOnce).to.be.true;
      const expectedTokenId = Number(tokenId);
      const expectedStatus = 'in_wallet';
      expect(updateHeroStatusStub.calledWith(expectedTokenId, expectedStatus))
        .to.be.true;
    });

    it('should log a warning if the withdrawn hero is not found', async () => {
      // --- Arrange ---
      const owner = '0x1234567890123456789012345678901234567890';
      const tokenId = 404n;
      const level = 1n;
      const xp = 0n;

      updateHeroStatusStub.resolves({ success: true, changes: 0 });
      const consoleWarnSpy = sinon.spy(console, 'warn');

      // --- Act ---
      await handleHeroWithdrawn(owner, tokenId, level, xp);

      // --- Assert ---
      expect(updateHeroStatusStub.calledOnce).to.be.true;
      expect(
        consoleWarnSpy.calledWith(
          sinon.match(/A withdrawal event was received for NFT ID 404/)
        )
      ).to.be.true;
      consoleWarnSpy.restore();
    });
  });
});
