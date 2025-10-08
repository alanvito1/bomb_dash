// src/web3/web3modal-client.js

import { createWeb3Modal, defaultConfig } from '@web3modal/ethers';

// 1. Get a project ID from https://cloud.walletconnect.com
// It's free and only takes a few seconds.
const projectId = 'e8f780f2f36a4c49944a390a18797f39'; // Using a public demo ID for this example

// 2. Set chains
const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com'
};

const bscTestnet = {
    chainId: 97,
    name: 'BNB Smart Chain Testnet',
    currency: 'tBNB',
    explorerUrl: 'https://testnet.bscscan.com',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/'
};

// 3. Create modal
const metadata = {
  name: 'Bomb Dash Web3',
  description: 'Bomb Dash - A Web3 retro shooter game.',
  url: 'http://localhost:5173', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

const ethersConfig = defaultConfig({
  /*Required*/
  metadata,

  /*Optional*/
  enableEIP6963: true, // true by default
  enableInjected: true, // true by default
  enableCoinbase: true, // true by default
  rpcUrl: 'https://cloudflare-eth.com', // used for Polygon Mumbai chain
  defaultChainId: 97, // Used for the Coinbase SDK
});

const web3Modal = createWeb3Modal({
  ethersConfig,
  chains: [bscTestnet, mainnet],
  projectId,
  enableAnalytics: false, // Optional - defaults to your Cloud configuration
  themeMode: 'dark',
  themeVariables: {
    '--w3m-font-family': '"Press Start 2P", monospace',
    '--w3m-accent': '#00ffff', // Cyan
    '--w3m-color-mix': '#000000',
    '--w3m-color-mix-strength': 40
  }
});

export default web3Modal;