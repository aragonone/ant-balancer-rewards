const fs = require('fs');
const utils = require('./utils');
const BigNumber = require('bignumber.js');

const config = utils.getConfig();

BigNumber.config({
    EXPONENTIAL_AT: [-100, 100],
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
    DECIMAL_PLACES: 18,
});

const {
    PERIOD,
    START_BLOCK,
    END_BLOCK,
    OUTPUT_FOLDER,
} = utils.checkArgsAndGetPeriodParams();
const BLOCKS_PER_SNAPSHOT = config.blocksPerSnapshot;

(async function () {
    let userTotals = {};
    let sortedUserTotal = {};

    let antTotal = utils.bnum(0);

    try {
        // Get all files in report directory

        for (i = END_BLOCK; i > START_BLOCK; i -= BLOCKS_PER_SNAPSHOT) {
            const jsonString = fs.readFileSync(
                `./${OUTPUT_FOLDER}/${PERIOD}/${i}.json`
            );
            const report = JSON.parse(jsonString)[1];

            Object.keys(report).forEach((user) => {
                antTotal = antTotal.plus(utils.bnum(report[user]));
                if (userTotals[user]) {
                    userTotals[user] = utils
                        .bnum(userTotals[user])
                        .plus(utils.bnum(report[user]))
                        .toString();
                } else {
                    userTotals[user] = report[user];
                }
            });
        }

        const jsonRedirect = fs.readFileSync(`./redirect.json`);
        const redirects = JSON.parse(jsonRedirect);

        Object.keys(userTotals).forEach((user) => {
            if (userTotals[user] == 0) {
                delete userTotals[user];
            }

            if (redirects[user]) {
                let newAddress = redirects[user];
                if (userTotals[newAddress]) {
                    userTotals[newAddress] = utils
                        .bnum(userTotals[newAddress])
                        .plus(utils.bnum(userTotals[user]))
                        .toString();
                } else {
                    userTotals[newAddress] = userTotals[user];
                }
                delete userTotals[user];
            }
        });

        Object.entries(userTotals)
            .sort((a, b) => a[0] - b[0])
            .forEach(([key, val]) => {
                sortedUserTotal[key] = val;
            });
        console.log(`Total ANT distributed ${antTotal.toString()}`);
        utils.writeData(sortedUserTotal, `${OUTPUT_FOLDER}/${PERIOD}/_totals`);
    } catch (e) {
        console.error('Error reading reports', e);
        process.exit(1);
    }

    process.exit(0);
})();
