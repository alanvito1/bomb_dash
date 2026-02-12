const { task } = require('hardhat/config');
const fs = require('fs');
const path = require('path');

task('fund', 'Funds an account with MockBCOIN')
  .addParam('account', 'The account address to fund')
  .addParam('amount', 'The amount of BCOIN to send (e.g., 100)')
  .setAction(async (taskArgs, { ethers }) => {
    const backendDir = path.join(__dirname, '..', 'backend', 'contracts');
    const addressesPath = path.join(backendDir, 'contract-addresses.json');

    if (!fs.existsSync(addressesPath)) {
      console.error(
        'Could not find contract-addresses.json. Make sure contracts are deployed.'
      );
      return;
    }

    const addresses = JSON.parse(fs.readFileSync(addressesPath));
    const bcoinAddress = addresses.bcoinTokenAddress;

    const MockBCOIN = await ethers.getContractFactory('MockBCOIN');
    const bcoin = MockBCOIN.attach(bcoinAddress);

    const amount = ethers.parseUnits(taskArgs.amount, 18);

    console.log(`Funding ${taskArgs.account} with ${taskArgs.amount} BCOIN...`);
    const tx = await bcoin.mint(taskArgs.account, amount);
    await tx.wait();

    const balance = await bcoin.balanceOf(taskArgs.account);
    console.log(
      `Success! New balance: ${ethers.formatUnits(balance, 18)} BCOIN`
    );
  });

module.exports = {};
