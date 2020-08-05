require('dotenv').config();
const ethers = require('ethers');
const { argv } = require('yargs');

const config = require('./config');

const provider = new ethers.providers.WebSocketProvider(config.node);

(async function () {
    for (let i = argv.startBlock; i <= argv.endBlock; i++) {
        let block = await provider.getBlock(i);
        console.log(
            `${i} - ${block.timestamp} - ${new Date(
                block.timestamp * 1000
            ).toUTCString()}`
        );
    }
})();
