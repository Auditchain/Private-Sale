# Auditchain Private Sale contracts

### Set up enviroment
Install following tooling: 
- Truffle: ```npm install -g truffle``` or ```yarn global add truffle```
- Ganache: ```npm install -g ganache-cli``` or ```yarn global add ganache-cli```

### Set up Ganache instances:

To set up an Ganache instance run in one terminal tab: ```ganache-cli --mnemonic "tilt divorce crane stereo unusual another core claw fury fury warm labor" --defaultBalanceEther 10000``` or ```yarn ganache``` or ```npm run ganache```

### Compiling contracts

Run ```truffle compile``` or ```yarn compile``` or ```npm run compile```

### Deploying contracts

Inside root folder(where truffle-config.js is) run ```truffle deploy --reset```

### Tests

Run all tests ```truffle test``` or ```yarn test``` ```npm run test```

Run one specific test such contract "sale" test ```truffle test ./test/sale.js```