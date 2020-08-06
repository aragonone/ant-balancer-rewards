const ethers = require('ethers');
const BigNumber = require('bignumber.js');
const cliProgress = require('cli-progress');
const fs = require('fs');

const utils = require('./utils');
const poolAbi = require('./abi/BPool.json');
const tokenAbi = require('./abi/BToken.json');

const config = utils.getConfig();

const provider = new ethers.providers.WebSocketProvider(config.node);

BigNumber.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
    DECIMAL_PLACES: 18,
});

function bnum(val) {
    return new BigNumber(val.toString());
}

function getFeeFactor(feePercentage) {
    return Math.exp(-Math.pow(feePercentage * 0.25, 2));
}

function getRatioFactor(tokens, weights) {
    let ratioFactorSum = bnum(0);
    let pairWeightSum = bnum(0);
    let n = weights.length;
    for (j = 0; j < n; j++) {
        if (!weights[j].eq(bnum(0))) {
            for (k = j + 1; k < n; k++) {
                let pairWeight = weights[j].times(weights[k]);
                let normalizedWeight1 = weights[j].div(
                    weights[j].plus(weights[k])
                );
                let normalizedWeight2 = weights[k].div(
                    weights[j].plus(weights[k])
                );
                ratioFactorSum = ratioFactorSum.plus(
                    bnum(4)
                        .times(normalizedWeight1)
                        .times(normalizedWeight2)
                        .times(pairWeight)
                );

                pairWeightSum = pairWeightSum.plus(pairWeight);
            }
        }
    }

    const ratioFactor = ratioFactorSum.div(pairWeightSum);

    return ratioFactor;
}

const {
    PERIOD,
    START_BLOCK,
    END_BLOCK,
    SKIP_BLOCK,
} = utils.checkArgsAndGetPeriodParams();
const ANT_PER_PERIOD = config.antPerPeriod;
const BLOCKS_PER_SNAPSHOT = config.blocksPerSnapshot;

const ANT_PER_SNAPSHOT = ANT_PER_PERIOD.div(
    bnum(Math.ceil((END_BLOCK - START_BLOCK) / BLOCKS_PER_SNAPSHOT))
); // Ceiling because it includes end block

async function getRewardsAtBlock(i, pools, prices, poolProgress) {
    let totalBalancerLiquidity = bnum(0);

    let block = await provider.getBlock(i);

    let allPoolData = [];
    let userPools = {};
    let userLiquidity = {};
    let tokenTotalMarketCaps = {};

    poolProgress.update(0, { task: `Block ${i} Progress` });

    for (const pool of pools) {
        let poolData = {};
        poolData.poolAddress = pool.id;

        // Check if at least two tokens have a price
        let atLeastTwoTokensHavePrice = false;
        let nTokensHavePrice = 0;

        if (pool.createTime > block.timestamp || !pool.tokensList) {
            continue;
        }

        let bPool = new ethers.Contract(
            poolData.poolAddress,
            poolAbi,
            provider
        );

        let publicSwap = await bPool.isPublicSwap({ blockTag: i });
        if (!publicSwap) {
            continue;
        }

        let currentTokens = await bPool.getCurrentTokens({ blockTag: i });

        for (const t of currentTokens) {
            let token = ethers.utils.getAddress(t);
            if (prices[token] !== undefined && prices[token].length > 0) {
                nTokensHavePrice++;
                if (nTokensHavePrice > 1) {
                    atLeastTwoTokensHavePrice = true;
                    break;
                }
            }
        }

        if (!atLeastTwoTokensHavePrice) {
            continue;
        }

        let poolMarketCap = bnum(0);
        let originalPoolMarketCapFactor = bnum(0);
        let eligibleTotalWeight = bnum(0);
        let poolRatios = [];

        for (const t of currentTokens) {
            // Skip token if it doesn't have a price
            let token = ethers.utils.getAddress(t);
            if (prices[token] === undefined || prices[token].length === 0) {
                continue;
            }
            let bToken = new ethers.Contract(token, tokenAbi, provider);
            let tokenBalanceWei = await bPool.getBalance(token, {
                blockTag: i,
            });
            let tokenDecimals = await bToken.decimals();
            let normWeight = await bPool.getNormalizedWeight(token, {
                blockTag: i,
            });

            eligibleTotalWeight = eligibleTotalWeight.plus(
                utils.scale(normWeight, -18)
            );

            let closestPrice = prices[token].reduce((a, b) => {
                return Math.abs(b[0] - block.timestamp * 1000) <
                    Math.abs(a[0] - block.timestamp * 1000)
                    ? b
                    : a;
            })[1];

            let tokenBalance = utils.scale(tokenBalanceWei, -tokenDecimals);
            let tokenMarketCap = tokenBalance.times(bnum(closestPrice)).dp(18);

            if (poolData.tokens) {
                let obj = {
                    token: t,
                    origMarketCap: tokenMarketCap,
                    normWeight: utils.scale(normWeight, -18),
                };
                poolData.tokens.push(obj);
            } else {
                poolData.tokens = [
                    {
                        token: t,
                        origMarketCap: tokenMarketCap,
                        normWeight: utils.scale(normWeight, -18),
                    },
                ];
            }

            poolRatios.push(utils.scale(normWeight, -18));
            poolMarketCap = poolMarketCap.plus(tokenMarketCap);
        }

        poolData.marketCap = poolMarketCap;
        poolData.eligibleTotalWeight = eligibleTotalWeight;

        let ratioFactor = getRatioFactor(currentTokens, poolRatios);

        let poolFee = await bPool.getSwapFee({ blockTag: i });
        poolFee = utils.scale(poolFee, -16); // -16 = -18 * 100 since it's in percentage terms
        let feeFactor = bnum(getFeeFactor(poolFee));

        originalPoolMarketCapFactor = feeFactor
            .times(ratioFactor)
            .times(poolMarketCap)
            .dp(18);

        poolData.ratioFactor = ratioFactor;
        poolData.feeFactor = feeFactor;
        poolData.originalPoolMarketCapFactor = originalPoolMarketCapFactor;

        for (const t in poolData.tokens) {
            let r = poolData.tokens[t];
            let tokenMarketCapWithCap = r.normWeight
                .div(eligibleTotalWeight)
                .times(originalPoolMarketCapFactor);
            if (tokenTotalMarketCaps[r.token]) {
                tokenTotalMarketCaps[r.token] = bnum(
                    tokenTotalMarketCaps[r.token]
                ).plus(tokenMarketCapWithCap);
            } else {
                tokenTotalMarketCaps[r.token] = tokenMarketCapWithCap;
            }
        }

        poolData.shareHolders = pool.shareHolders;
        poolData.controller = pool.controller;
        allPoolData.push(poolData);
    }

    for (const pool of allPoolData) {
        let finalPoolMarketCap = bnum(0);
        let finalPoolMarketCapFactor = bnum(0);

        for (const t of pool.tokens) {
            let adjustedTokenMarketCap;
            if (
                !config.uncappedTokens.includes(t.token) &&
                bnum(tokenTotalMarketCaps[t.token]).isGreaterThan(
                    bnum(10000000)
                )
            ) {
                let tokenMarketCapFactor = bnum(10000000).div(
                    tokenTotalMarketCaps[t.token]
                );
                adjustedTokenMarketCap = t.origMarketCap
                    .times(tokenMarketCapFactor)
                    .dp(18);
            } else {
                adjustedTokenMarketCap = t.origMarketCap;
            }
            finalPoolMarketCap = finalPoolMarketCap.plus(
                adjustedTokenMarketCap
            );
        }

        finalPoolMarketCapFactor = pool.feeFactor
            .times(pool.ratioFactor)
            .times(finalPoolMarketCap)
            .dp(18);

        totalBalancerLiquidity = totalBalancerLiquidity.plus(
            finalPoolMarketCapFactor
        );

        let bPool = new ethers.Contract(pool.poolAddress, poolAbi, provider);

        let bptSupplyWei = await bPool.totalSupply({ blockTag: i });
        let bptSupply = utils.scale(bptSupplyWei, -18);

        if (bptSupply.eq(bnum(0))) {
            // Private pool
            if (userPools[pool.controller]) {
                userPools[pool.controller].push({
                    pool: pool.poolAddress,
                    feeFactor: pool.feeFactor.toString(),
                    ratioFactor: pool.ratioFactor.toString(),
                    valueUSD: finalPoolMarketCap.toString(),
                    factorUSD: finalPoolMarketCapFactor.toString(),
                });
            } else {
                userPools[pool.controller] = [
                    {
                        pool: pool.poolAddress,
                        feeFactor: pool.feeFactor.toString(),
                        ratioFactor: pool.ratioFactor.toString(),
                        valueUSD: finalPoolMarketCap.toString(),
                        factorUSD: finalPoolMarketCapFactor.toString(),
                    },
                ];
            }

            // Add this pool liquidity to total user liquidity
            if (userLiquidity[pool.controller]) {
                userLiquidity[pool.controller] = bnum(
                    userLiquidity[pool.controller]
                )
                    .plus(finalPoolMarketCapFactor)
                    .toString();
            } else {
                userLiquidity[
                    pool.controller
                ] = finalPoolMarketCapFactor.toString();
            }
        } else {
            // Shared pool

            for (const holder of pool.shareHolders) {
                let userBalanceWei = await bPool.balanceOf(holder, {
                    blockTag: i,
                });
                let userBalance = utils.scale(userBalanceWei, -18);
                let userPoolValue = userBalance
                    .div(bptSupply)
                    .times(finalPoolMarketCap)
                    .dp(18);

                let userPoolValueFactor = userBalance
                    .div(bptSupply)
                    .times(finalPoolMarketCapFactor)
                    .dp(18);

                if (userPools[holder]) {
                    userPools[holder].push({
                        pool: pool.poolAddress,
                        feeFactor: pool.feeFactor.toString(),
                        ratioFactor: pool.ratioFactor.toString(),
                        valueUSD: userPoolValue.toString(),
                        factorUSD: userPoolValueFactor.toString(),
                    });
                } else {
                    userPools[holder] = [
                        {
                            pool: pool.poolAddress,
                            feeFactor: pool.feeFactor.toString(),
                            ratioFactor: pool.ratioFactor.toString(),
                            valueUSD: userPoolValue.toString(),
                            factorUSD: userPoolValueFactor.toString(),
                        },
                    ];
                }

                // Add this pool liquidity to total user liquidity
                if (userLiquidity[holder]) {
                    userLiquidity[holder] = bnum(userLiquidity[holder])
                        .plus(userPoolValueFactor)
                        .toString();
                } else {
                    userLiquidity[holder] = userPoolValueFactor.toString();
                }
            }
        }

        poolProgress.increment(1);
    }

    // Final iteration across all users to calculate their ANT tokens for this block
    let userAntReceived = {};
    for (const user in userLiquidity) {
        userAntReceived[user] = bnum(userLiquidity[user])
            .times(ANT_PER_SNAPSHOT)
            .div(totalBalancerLiquidity);
    }

    return [userPools, userAntReceived, tokenTotalMarketCaps];
}

(async function () {
    const multibar = new cliProgress.MultiBar(
        {
            clearOnComplete: false,
            format:
                '[{bar}] {percentage}% | ETA: {eta}s | {value}/{total} | {task}',
        },
        cliProgress.Presets.shades_classic
    );

    !fs.existsSync(`./reports/${PERIOD}/`) &&
        fs.mkdirSync(`./reports/${PERIOD}/`);

    let startBlockTimestamp = (await provider.getBlock(START_BLOCK)).timestamp;
    let endBlockTimestamp = (await provider.getBlock(END_BLOCK)).timestamp;

    let pools = await utils.fetchAllPools(END_BLOCK);
    utils.writeData(pools, `/${PERIOD}/_pools`);

    let prices = {};

    if (fs.existsSync(`./reports/${PERIOD}/_prices.json`)) {
        const jsonString = fs.readFileSync(`./reports/${PERIOD}/_prices.json`);
        prices = JSON.parse(jsonString);
    } else {
        const whitelist = config.whitelistTokens;

        let priceProgress = multibar.create(whitelist.length, 0, {
            task: 'Fetching Prices',
        });

        prices = await utils.fetchTokenPrices(
            whitelist,
            startBlockTimestamp,
            endBlockTimestamp,
            priceProgress
        );

        let path = `/${PERIOD}/_prices`;
        utils.writeData(prices, path);
    }

    const poolProgress = multibar.create(pools.length, 0, {
        task: 'Block Progress',
    });
    const blockProgress = multibar.create(END_BLOCK - START_BLOCK, 0, {
        task: 'Overall Progress',
    });

    for (i = END_BLOCK; i > START_BLOCK; i -= BLOCKS_PER_SNAPSHOT) {
        if (SKIP_BLOCK && i >= SKIP_BLOCK) {
            blockProgress.increment(BLOCKS_PER_SNAPSHOT);
            continue;
        }

        let blockRewards = await getRewardsAtBlock(
            i,
            pools,
            prices,
            poolProgress
        );
        let path = `/${PERIOD}/${i}`;
        utils.writeData(blockRewards, path);
        blockProgress.increment(BLOCKS_PER_SNAPSHOT);
    }

    blockProgress.stop();

    process.exit(0);
})();
