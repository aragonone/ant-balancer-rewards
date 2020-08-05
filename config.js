const BigNumber = require('bignumber.js');

module.exports = {
    //node: "ws://localhost:8546",
    //node: "ws://localhost:8545",
    //node: "wss://mainnet.eth.aragon.network:8546",
    node: 'https://mainnet.eth.aragon.network/ws',
    pools: ['0x2cf9106faf2c5c8713035d40df655fb1b9b0f9b9'],
    periodBlockDelimiters: [10599000, 10599240, 10599480],
    blocksPerSnapshot: 256,
    antPerPeriod: new BigNumber(12500), // ~50k per month
};
