<h1 align=center><code>ANT Liquidity Rewards (Balancer)</code></h1>

Set of scripts to calculate ANT liquidity rewards distributions. See [announcement blogpost](https://aragon.org/blog/ant-liquidity-rewards-now-on-balancer).

## Historical Runs

See results in [this repo](https://github.com/aragonone/ant-balancer-rewards-results).

| Period | Start Block | End Block |
| :----- | ----------: | --------: |
| Week 1 | 10730260    | 10775960  |
| Week 2 | 10775960    | 10821677  |
| Week 3 | 10821677    | 10867342  |
| Week 4 | 10867342    |           |


## Requirements

An archive node is needed to run the scripts because historical balance snapshots are needed. A "starting-point" archive node can also be used that will only archive at x block onwards. Note this still probably requires 750G+ of disk space.

## Usage

```
node index.js --period 1 [--config ./test/config_mainnet.js] [--output reports]
```

This will run run all historical calculations by block. Using an infura endpoint this may take upwards of TODO hours. For a local archive node, the sync time is roughly TODO minutes. Progress bars with estimates are shown during the sync. Reports will be saved in the folder for the given week specified

```
node sum.js --period 1 [--config ./test/config_mainnet.js] [--output reports]
```

After all reports are generated, `sum.js` will create a final tally of user address to ANT received. This is stored in the report week folder at `_totals.json`

## Distributions (TODO)

25,000 ANT will be distributed directly to addresses after the rewards program is over. Due to block gas limits, the tx's to batch transfer ANT will need to be split up across blocks. In order to prevent favoring certain accounts, the block hash of the `endBlock` will be the starting point and addresses will be ordered alphabetically for distributions.

## ANT Redirections (TODO)

In case smart contracts which cannot receive ANT tokens are specified, owners of those smart contracts can choose to redirect ANT tokens to a new address. In order to submit a redirection request, submit a pull request to update `redirect.json` using `"fromAddress" : "toAddress"` along with some sort of ownership proof. Please reach out to the Aragon team if you need assistance.

## Testing

### Locally

Spin up a ganache node with:

```
ganache-cli -h 0.0.0.0 -i 15 --gasLimit 10000000 --deterministic --mnemonic "myth like bonus scare over problem client lizard pioneer submit female collect" --db test/ganache
```

And then run the tests. For only one period you can do:

```
node index.js --period 1 --config ./test/config_local.js --output test/reports
node sum.js --period 1 --config ./test/config_local.js --output test/reports
```

Or if you want to run several periods you can do something like:

```
for i in `seq 1 5`; do echo $i; \
  node index.js --period $i --config ./test/config_local.js --output test/reports_local; \
  node sum.js --period $i --config ./test/config_local.js --output test/reports_local; \
done;
```

Then compare the values in `test/reports_local` folder with the values in the spreadsheet `test/local_results.ods`.

If you want to tweak the tests, change the values in `config_local.json` file. You’ll probably have to re-deploy the pool (see next section).

#### Deploying

All the data needed for the tests is contained in the ganache snapshot in `test/db`, but if you want to re-deploy, you can do it by resetting it with:

```
rm -Rf test/db;
ganache-cli -h 0.0.0.0 -i 15 --gasLimit 10000000 --deterministic --mnemonic "myth like bonus scare over problem client lizard pioneer submit female collect" --db test/ganache
node test/deploy.js --config ./test/config_local.js
```

### Mainnet

You can also run tests on mainnet without having to modify main config file nor results with:

```
node index.js --period 1 --config ./test/config_mainnet.js --output test/reports
node sum.js --period 1 --config ./test/config_mainnet.js --output test/reports
```

Tweak first you `test/config_mainnet.js` file and check the results in `test/reports` afterwards.
