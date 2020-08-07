<h1 align=center><code>ANT Mining</code></h1>

Set of scripts to calculate ANT liquidity mining distributions

## Historical Runs

| Period | Start Block | End Block |
| :----- | ----------: | --------: |


## Requirements

An archive node is needed to run the scripts because historical balance snapshots are needed. A "starting-point" archive node can also be used that will only archive at x block onwards. Note this still probably requires 750G+ of disk space.

## Usage

```
node index.js --period 1 [--config ./test/config_mainnet.js]
```

This will run run all historical calculations by block. Using an infura endpoint this may take upwards of TODO hours. For a local archive node, the sync time is roughly TODO minutes. Progress bars with estimates are shown during the sync. Reports will be saved in the folder for the given week specified

```
node sum.js --period 1 [--config ./test/config_mainnet.js]
```

After all reports are generated, `sum.js` will create a final tally of user address to ANT received. This is stored in the report week folder at `_totals.json`

## Distributions (TODO)

50,000 ANT will be distributed directly to addresses after the rewards program is over. Due to block gas limits, the tx's to batch transfer ANT will need to be split up across blocks. In order to prevent favoring certain accounts, the block hash of the `endBlock` will be the starting point and addresses will be ordered alphabetically for distributions.

## ANT Redirections (TODO)

In case smart contracts which cannot receive ANT tokens are specified, owners of those smart contracts can choose to redirect ANT tokens to a new address. In order to submit a redirection request, submit a pull request to update `redirect.json` using `"fromAddress" : "toAddress"` along with some sort of ownership proof. Please reach out to the Aragon team if you need assistance.

## Testing

Spin up a ganache node with:

```
ganache-cli -h 0.0.0.0 -i 15 --gasLimit 10000000 --deterministic --mnemonic "myth like bonus scare over problem client lizard pioneer submit female collect" --db test/ganache
```

TODO

### Deploying

All the data needed for the tests is contained in the ganache snapshot in `test/db`, but if you want to re-deploy, you can do it by resetting it with:

```
rm -Rf test/db;
ganache-cli -h 0.0.0.0 -i 15 --gasLimit 10000000 --deterministic --mnemonic "myth like bonus scare over problem client lizard pioneer submit female collect" --db test/ganache
node test/deploy.js --config ./test/config_local.js
```
