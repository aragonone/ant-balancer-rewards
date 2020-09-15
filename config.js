const BigNumber = require('bignumber.js');

const ANT_ADDRESS = '0x960b236A07cf122663c4303350609A66A7B288C0';

module.exports = {
    node: 'https://mainnet.eth.aragon.network/ws',
    pools: ['0x2cf9106faf2c5c8713035d40df655fb1b9b0f9b9'],
    periodBlockDelimiters: [
        10730260,
        10775960,
        10821677,
        10867342,
    ],
    blocksPerSnapshot: 256,
    antPerPeriod: new BigNumber(6250), // ~50k per month
    whitelistTokens: [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
//        '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
        ANT_ADDRESS,                                  // ANT
    ],
    uncappedTokens: [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
        '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
        '0xba100000625a3754423978a60c9317c58a424e3D', // BAL
        ANT_ADDRESS,                                  // ANT
    ],
    blacklistAddresses: [
        '0xcafE1A77e84698c83CA8931F54A755176eF75f2C', // Aragon Association
        '0xfb633F47A84a1450EE0413f2C32dC1772CcAea3e', // AA Budget DAO Agent
    ],
    ANT_ADDRESS,
};
