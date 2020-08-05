require('dotenv').config();
const fs = require('fs');
const cliProgress = require('cli-progress');
const fetch = require('isomorphic-fetch');
const BigNumber = require('bignumber.js');
const ethers = require('ethers');

const config = require('./config');

const provider = new ethers.providers.WebSocketProvider(config.node);

const SUBGRAPH_URL =
    process.env.SUBGRAPH_URL ||
    'https://api.thegraph.com/subgraphs/name/balancer-labs/balancer';
const MARKET_API_URL =
    process.env.MARKET_API_URL || 'https://api.coingecko.com/api/v3';

const scale = (input, decimalPlaces) => {
    const scalePow = new BigNumber(decimalPlaces);
    const scaleMul = new BigNumber(10).pow(scalePow);
    return new BigNumber(input).times(scaleMul);
};

const writeData = (data, path) => {
    try {
        fs.writeFileSync(
            `./reports/${path}.json`,
            JSON.stringify(data, null, 4)
        );
    } catch (err) {
        console.error(err);
    }
};

async function fetchAllPools(block) {
    let poolResults = [];
    let skip = 0;
    let paginatePools = true;
    while (paginatePools) {
        const poolsParam = JSON.stringify(config.pools);
        let query = `
            {
                pools (first: 1000, skip: ${skip}, block: { number: ${block} }, where: { id_in: ${poolsParam}}) {
                    id
                    publicSwap
                    swapFee
                    controller
                    createTime
                    tokensList
                    totalShares
                    shares (first: 1000) {
                        userAddress {
                            id
                        }
                    }
                }
            }
        `;

        let response = await fetch(SUBGRAPH_URL, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
            }),
        });

        let { data } = await response.json();

        poolResults = poolResults.concat(data.pools);

        if (data.pools.length < 1000) {
            paginatePools = false;
        } else {
            skip += 1000;
            continue;
        }
    }

    let finalResults = [];

    for (i in poolResults) {
        let pool = poolResults[i];
        pool.shareHolders = pool.shares.map((a) => a.userAddress.id);
        if (pool.shareHolders.length == 1000) {
            let paginateShares = true;
            let shareSkip = 0;
            let shareResults = [];

            while (paginateShares) {
                let query = `
                    {
                        pools (where: { id: "${pool.id}"}, block: { number: ${block} }) {
                            shares (first: 1000, skip: ${shareSkip}) {
                                userAddress {
                                    id
                                }
                            }
                        }
                    }
                `;

                let response = await fetch(SUBGRAPH_URL, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        query,
                    }),
                });

                let { data } = await response.json();

                let newShareHolders = data.pools[0].shares.map(
                    (a) => a.userAddress.id
                );

                shareResults = shareResults.concat(newShareHolders);

                if (newShareHolders.length < 1000) {
                    paginateShares = false;
                } else {
                    shareSkip += 1000;
                    continue;
                }
            }

            pool.shareHolders = shareResults;
            delete pool.shares;

            finalResults.push(pool);
        } else {
            delete pool.shares;
            finalResults.push(pool);
        }
    }

    return finalResults;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWhitelist() {
    const response = await fetch(
        `https://raw.githubusercontent.com/balancer-labs/pool-management/master/src/deployed.json`,
        {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        }
    );

    let whitelistResponse = await response.json();
    const whitelist = whitelistResponse.mainnet.tokens
        .slice(1)
        .map((a) => a.address);

    return whitelist;
}

async function fetchTokenPrices(allTokens, startTime, endTime, priceProgress) {
    let prices = {};
    for (j in allTokens) {
        const address = allTokens[j]
            ? ethers.utils.getAddress(allTokens[j])
            : null;
        const query = `coins/ethereum/contract/${address}/market_chart/range?&vs_currency=usd&from=${startTime}&to=${endTime}`;

        const response = await fetch(`${MARKET_API_URL}/${query}`, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });

        let priceResponse = await response.json();
        prices[address] = priceResponse.prices;
        priceProgress.increment();
        // Sleep half a second between requests to prevent rate-limiting
        await sleep(1000);
    }
    priceProgress.stop();

    return prices;
}

function checkArgsAndGetPeriodParams(argv) {
    if (!argv.period) {
        console.error(`Usage: node ${argv['$0']} --period 1`);
        process.exit();
    }

    const PERIOD = argv.period;

    if (PERIOD >= config.periodBlockDelimiters) {
        console.error(
            'Period too big. Adjust config file to set block delimiters for the desired period'
        );
        process.exit();
    }

    if (PERIOD == 0) {
        console.error('Period can’t be zero');
        process.exit();
    }

    const START_BLOCK = config.periodBlockDelimiters[PERIOD - 1]; // Closest block to reference time at beginning of week
    const END_BLOCK = config.periodBlockDelimiters[PERIOD]; // Closest block to reference time at end of week

    return { PERIOD, START_BLOCK, END_BLOCK };
}

module.exports = {
    scale,
    writeData,
    fetchAllPools,
    fetchWhitelist,
    fetchTokenPrices,
    checkArgsAndGetPeriodParams,
};
