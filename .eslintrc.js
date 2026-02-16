module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    mocha: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  plugins: ['prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  globals: {
    Phaser: 'readonly',
    WebFont: 'readonly',
    artifacts: 'readonly', // Fix for Hardhat scripts
    ethers: 'readonly', // Fix for Hardhat scripts
  },
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': [
      'warn',
      {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: false,
        varsIgnorePattern: '^_', // Ignore variables starting with _
        argsIgnorePattern: '^_', // Ignore arguments starting with _
      },
    ],
    'no-undef': 'error', // Ensure undefined variables are errors
  },
};
