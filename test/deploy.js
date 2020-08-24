const ethers = require('ethers');
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

const INIT_POOL_SUPPLY = utils.bnum(utils.stringBnum('100'));
const ANT_WEIGHT = utils.stringBnum('40');
const WETH_WEIGHT = utils.stringBnum('10');
const ANT_TO_WETH_FACTOR = 8;
const ANT_BALANCE = INIT_POOL_SUPPLY.times(
    utils.bnum(ANT_TO_WETH_FACTOR)
).toString();
const WETH_BALANCE = INIT_POOL_SUPPLY.toString();
const TOKENS_MINTED = utils.stringBnum('1000000'); // 1M

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

const userJoin = async (poolContract, user, amountOut) => {
    console.log(`user ${user.address} join`);
    const poolUser = await poolContract.connect(user);
    const join1Tx = await poolUser.joinPool(
        utils.stringBnum(amountOut),
        [
            utils.stringBnum(amountOut * 100),
            utils.stringBnum(amountOut * ANT_TO_WETH_FACTOR * 100),
        ],
        gasLimitOptions
    );
    await checkTransaction(join1Tx, 'user joining');

    await logStats(poolContract);
};

const forwardBlocks = async (token, n) => {
    for (let i = 0; i < n; i++) {
        // dummy tx to force new blocks
        await token.generateTokens(accounts[0].address, '1', gasLimitOptions);
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

    await logStats(poolContract);

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

    await logStats(poolContract);

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

    await logStats(poolContract);

    // finalize BPool
    console.log('finalize pool');
    await poolContract.finalize(gasLimitOptions);

    await logStats(poolContract);

    await userJoin(poolContract, accounts[1], 1);

    await forwardBlocks(ant, config.blocksPerSnapshot * 2);

    await userJoin(poolContract, accounts[2], 1);

    await forwardBlocks(ant, config.blocksPerSnapshot * 20);

    await userJoin(poolContract, accounts[3], 2);

    await forwardBlocks(ant, config.blocksPerSnapshot * 40);

    await userJoin(poolContract, accounts[4], 4);

    await forwardBlocks(ant, config.blocksPerSnapshot * 50);

    await userJoin(poolContract, accounts[5], 10);

    // make sure to finish last period
    await forwardBlocks(ant, 100);

    await logStats(poolContract);

    process.exit(0);
})();
