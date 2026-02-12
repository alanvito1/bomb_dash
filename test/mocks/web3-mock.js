// test/mocks/web3-mock.js
export class Web3Mock {
  static async setupPageMocks(page) {
    // Mock do window.ethereum
    await page.addInitScript(() => {
      window.ethereum = {
        isMetaMask: true,
        request: async (request) => {
          switch (request.method) {
            case 'eth_requestAccounts':
              return ['0xMockAddress123'];
            case 'eth_chainId':
              return '0x38'; // BSC Mainnet
            default:
              return null;
          }
        },
        on: () => {}, // Mock event listeners
        removeListener: () => {},
      };
    });
  }
}
