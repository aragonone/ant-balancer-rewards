const BigNumber = require('bignumber.js');

const ANT_ADDRESS = '0x5b1869D9A4C187F2EAa108f3062412ecf0526b24';

module.exports = {
    node: 'http://localhost:8545',
    pools: ['0xe78A0F7E598Cc8b0Bb87894B0F60dD2a88d6a8Ab'],
    periodBlockDelimiters: [
        45,
        145,
        245,
        345,
        445,
        545,
    ],
    blocksPerSnapshot: 4,
    antPerPeriod: new BigNumber(6250), // 25k total
    whitelistTokens: [
        '0x26b4AFb60d6C903165150C6F0AA14F8016bE4aec', // WETH
        ANT_ADDRESS,                                  // ANT
    ],
    uncappedTokens: [
        '0x26b4AFb60d6C903165150C6F0AA14F8016bE4aec', // WETH
        ANT_ADDRESS,                                  // ANT
    ],
    blacklistAddresses: [
        '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1', // accounts[0]
    ],
    ANT_ADDRESS,
};
