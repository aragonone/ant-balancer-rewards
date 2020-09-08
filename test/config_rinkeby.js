const BigNumber = require('bignumber.js');

const ANT_ADDRESS = '0x8cf8196c14A654dc8Aceb3cbb3dDdfd16C2b652D';
const MONICA_CONTRACT_ADDRESS = '0x231Af06319eBCdE40674c5Fb645b1538Ce5bA7eB';

module.exports = {
    node: 'https://rinkeby.eth.aragon.network/ws',
    pools: [''],
    periodBlockDelimiters: [10619540, 10619580],
    blocksPerSnapshot: 10,
    antPerPeriod: new BigNumber(6250), // ~50k per month
    whitelistTokens: [
        '', // WETH
        ANT_ADDRESS, // ANT
    ],
    uncappedTokens: [
        '', // WETH
        ANT_ADDRESS, // ANT
    ],
    blacklistAddresses: [
        '', // Aragon Association
        '', // AA Budget DAO Agent
    ],
    ANT_ADDRESS,
    MONICA_CONTRACT_ADDRESS,
};
