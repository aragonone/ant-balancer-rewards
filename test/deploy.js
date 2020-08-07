const ethers = require('ethers');
const BigNumber = require('bignumber.js');

const utils = require('../utils');

const config = utils.getConfig();

const provider = new ethers.providers.WebSocketProvider(config.node);

// Balancer pool
const { bytecode: poolBytecode } = require('./BPool');
const poolAbi = require('../abi/BPool.json');

// MiniMe token
const {
    bytecode: tokenBytecode,
} = require('@aragon/apps-shared-minime/build/contracts/MiniMeToken');
const { abi: tokenAbi } = require('@aragon/apps-shared-minime/abi/MiniMeToken');

const ZERO_ADDRESS = '0x' + '0'.repeat(40);

const ANT_WEIGHT = utils.stringBnum('40');
const WETH_WEIGHT = utils.stringBnum('10');
const ANT_BALANCE = utils.stringBnum('1000');
const WETH_BALANCE = utils.stringBnum('100');

const gasLimitOptions = { gasLimit: 10e6 };

// Mnemonic:      myth like bonus scare over problem client lizard pioneer submit female collect
const privateKeys = [
    '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
    '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
    '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
    '0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913',
    '0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743',
    '0x395df67f0c2d2d9fe1ad08d1bc8b6627011959b79c53d7dd6a3536a33ab8a4fd',
    '0xe485d098507f54e7733a205420dfddbe58db035fa577fc294ebd14db90767a52',
    '0xa453611d9419d0e56f499079478fd72c37b251a94bfde4d19872c44cf65386e3',
    '0x829e924fdf021ba3dbbc4225edfece9aca04b929d6e75613329ca6f1d31c0bb4',
    '0xb0057716d5917badaf911b193b12b910811c1497b5bada8d7711f758981c3773',
];
const accounts = privateKeys.map((key) => new ethers.Wallet(key, provider));
const owner = accounts[0];

const checkTransaction = async (tx, name) => {
    const receipt = await provider.getTransactionReceipt(tx.hash);
    if (!receipt.status) {
        console.log('gas', receipt.gasUsed.toString());
        console.error(`Transaction for ${name} failed!`);
        process.exit(1);
    }
};

const logStats = async (poolContract) => {
    console.log('block', (await provider.getBlockNumber()).toString());
    console.log('total supply', (await poolContract.totalSupply()).toString());
};

const deployToken = async (name, decimals, symbol) => {
    let tokenFactory = new ethers.ContractFactory(
        tokenAbi,
        tokenBytecode,
        owner
    );
    let tokenContract = await tokenFactory.deploy(
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        0,
        name,
        decimals,
        symbol,
        true
    );

    console.log(`token ${symbol}`, tokenContract.address);
    //console.log('token tx', tokenContract.deployTransaction.hash);

    await tokenContract.deployed();

    return tokenContract;
};

const mintAndApproveTokens = async (token, pool) => {
    const TOKENS_MINTED = utils.stringBnum('1000000');
    for (let i = 0; i < accounts.length; i++) {
        await token.generateTokens(
            accounts[i].address,
            TOKENS_MINTED,
            gasLimitOptions
        );
        const tokenUser = token.connect(accounts[i]);
        await tokenUser.approve(pool.address, TOKENS_MINTED, gasLimitOptions);
    }
};

(async function () {
    // Balancer Pool
    let poolFactory = new ethers.ContractFactory(poolAbi, poolBytecode, owner);
    let poolContract = await poolFactory.deploy();

    console.log('pool', poolContract.address);
    //console.log('pool tx', poolContract.deployTransaction.hash);

    // The contract is NOT deployed yet; we must wait until it is mined
    await poolContract.deployed();

    logStats(poolContract);

    // ANT
    const ant = await deployToken('Aragon Network Token', 18, 'ANT');
    await mintAndApproveTokens(ant, poolContract);
    const antBindTx = await poolContract.bind(
        ant.address,
        ANT_BALANCE,
        ANT_WEIGHT,
        gasLimitOptions
    );
    await checkTransaction(antBindTx, 'ant binding');

    logStats(poolContract);

    // WETH
    const weth = await deployToken('Wrapped Ether', 18, 'WETH');
    await mintAndApproveTokens(weth, poolContract);
    const wethBindTx = await poolContract.bind(
        weth.address,
        WETH_BALANCE,
        WETH_WEIGHT,
        gasLimitOptions
    );
    await checkTransaction(wethBindTx, 'ant binding');

    logStats(poolContract);

    // finalize BPool
    await poolContract.finalize(gasLimitOptions);

    logStats(poolContract);

    const poolUser1 = await poolContract.connect(accounts[1]);
    const join1Tx = await poolUser1.joinPool(
        utils.stringBnum('100'),
        [utils.stringBnum('10'), utils.stringBnum('1')],
        gasLimitOptions
    );
    await checkTransaction(join1Tx, 'user 1 joining');

    logStats(poolContract);

    process.exit(0);
})();
