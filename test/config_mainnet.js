const BigNumber = require('bignumber.js');

const ANT_ADDRESS = '0x960b236A07cf122663c4303350609A66A7B288C0';
const MONICA_CONTRACT_ADDRESS = '0xef44540fDaD5545Cd81FB2E2E55E7cf8175DBDf8';

module.exports = {
    node: 'https://mainnet.eth.aragon.network/ws',
    pools: ['0x2cf9106faf2c5c8713035d40df655fb1b9b0f9b9'],
    periodBlockDelimiters: [
        10619540,
        10619580
    ],
    blocksPerSnapshot: 10,
    antPerPeriod: new BigNumber(6250), // ~50k per month
    whitelistTokens: [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        ANT_ADDRESS,                                  // ANT
    ],
    uncappedTokens: [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        ANT_ADDRESS,                                  // ANT
    ],
    blacklistAddresses: [
        '0xcafE1A77e84698c83CA8931F54A755176eF75f2C', // Aragon Association
        '0xfb633F47A84a1450EE0413f2C32dC1772CcAea3e', // AA Budget DAO Agent
    ],
    ANT_ADDRESS,
    MONICA_CONTRACT_ADDRESS,
};
