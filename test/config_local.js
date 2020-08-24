const BigNumber = require('bignumber.js');

module.exports = {
    node: 'http://localhost:8545',
    pools: [''],
    periodBlockDelimiters: [0, 0],
    blocksPerSnapshot: 1,
    antPerPeriod: new BigNumber(12500), // ~50k per month
    whitelistTokens: [
        '', // WETH
        '', // ANT
    ],
    uncappedTokens: [
        '', // WETH
        '', // ANT
    ],
    blacklistAddresses: [
        '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1', // accounts[0]
    ],
};
