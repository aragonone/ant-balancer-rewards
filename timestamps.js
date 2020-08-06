require('dotenv').config();
const ethers = require('ethers');

const utils = require('./utils');

const config = utils.getConfig();

const provider = new ethers.providers.WebSocketProvider(config.node);

const { START_BLOCK, END_BLOCK } = utils.checkArgsAndGetPeriodParams();

(async function () {
    for (let i = START_BLOCK; i <= END_BLOCK; i++) {
        let block = await provider.getBlock(i);
        console.log(
            `${i} - ${block.timestamp} - ${new Date(
                block.timestamp * 1000
            ).toUTCString()}`
        );
    }
})();
