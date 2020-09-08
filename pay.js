const fs = require('fs');
const ethers = require('ethers');

const utils = require('./utils');

const config = utils.getConfig();

const provider = new ethers.providers.WebSocketProvider(config.node);

// MiniMe token
const { abi: tokenAbi } = require('@aragon/apps-shared-minime/abi/MiniMeToken');
// Monica.sol
const monicaAbi = require('./abi/Monica.json');

//const gasLimitOptions = { gasLimit: 10e6 };

const { PERIOD, OUTPUT_FOLDER } = utils.checkArgsAndGetPeriodParams();

const ROWS_PER_TRANSACTION = 60;

(async function () {
    let privateKey = process.env.PRIVATE_KEY | '0xabcd';
    const signer = new ethers.Wallet(privateKey);

    // approval
    console.log('\nApproval');
    const ant = new ethers.Contract(config.ANT_ADDRESS, tokenAbi, signer);
    const approvalTx1 = ant.interface.encodeFunctionData('approve', [
        config.MONICA_CONTRACT_ADDRESS,
        0,
    ]);
    console.log(approvalTx1);
    const approvalTx2 = ant.interface.encodeFunctionData('approve', [
        config.MONICA_CONTRACT_ADDRESS,
        ethers.utils.parseEther(config.antPerPeriod.toString()),
    ]);
    console.log(approvalTx2);
    /*
      await ant.approve(config.MONICA_CONTRACT_ADDRESS, 0, gasLimitOptions);
      await ant.approve(config.MONICA_CONTRACT_ADDRESS, config.antPerPeriod, gasLimitOptions);
    */

    console.log('\nPayments');
    const monica = new ethers.Contract(
        config.MONICA_CONTRACT_ADDRESS,
        monicaAbi,
        signer
    );
    try {
        const jsonString = fs.readFileSync(
            `./${OUTPUT_FOLDER}/${PERIOD}/_totals.json`
        );
        const report = JSON.parse(jsonString);
        //console.log(report)
        const rows = Object.keys(report);
        let nextRow = 0;
        while (nextRow < rows.length) {
            console.log(
                `\nRows ${nextRow} to ${nextRow + ROWS_PER_TRANSACTION}`
            );
            const batch = Object.keys(report).slice(
                nextRow,
                nextRow + ROWS_PER_TRANSACTION
            );
            const tos = [];
            const amounts = [];
            batch.forEach((user) => {
                tos.push(user);
                amounts.push(ethers.utils.parseEther(report[user]));
            });
            const paymentTx = monica.interface.encodeFunctionData('pay', [
                config.ANT_ADDRESS,
                0,
                tos,
                amounts,
            ]);
            console.log(paymentTx);

            //await monica.pay(config.ANT_ADDRESS, 0, tos, amounts, gasLimitOptions);

            nextRow += ROWS_PER_TRANSACTION;
        }
    } catch (e) {
        console.error('Error reading reports', e);
        process.exit(1);
    }

    process.exit(0);
})();
