require('babel-register');
require('babel-polyfill');
var dotenv = require("dotenv");
dotenv.config();




// const HDWalletProvider = require("truffle-hdwallet-provider");
const HDWalletProvider = require("@truffle/hdwallet-provider");

const MNEMONIC = process.env.MNEMONIC
const INFURA_KEY = process.env.INFURA_KEY;
const maticmumbai_rpc_url = 'https://matic-mumbai.chainstacklabs.com'


console.log("Infura key:" + process.env.INFURA_KEY);

if (!MNEMONIC || !INFURA_KEY) {


  console.error("Please set a mnemonic and infura key...")
  return
}

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      gas: 6721975,
      gasPrice: 0x01,
      network_id: "*", // Match any network id
      accounts: 10,
      defaultEtherBalance: 1000,
      blockTime: 3
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://rinkeby.infura.io/v3/" + INFURA_KEY
        );
      },
      network_id: "*",
      gas: 0x989680
    },
    ropsten: {
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://ropsten.infura.io/v3/" + INFURA_KEY
        );
      },
      network_id: 3,
      gas: 4500000,
      gasPrice: 1000000000
    },
    rinkeby: {
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://rinkeby.infura.io/v3/" + INFURA_KEY
        );
      },
      network_id: "*",
      gas: 10000000


    },

    goerli: {
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://goerli.infura.io/v3/" + INFURA_KEY
        );
      },
      network_id: "5",
      gas: 10000000,
      skipDryRun: true,



    },
    maticmumbai: {
			provider: function() {
				return new HDWalletProvider(MNEMONIC, maticmumbai_rpc_url);
			  },
			  network_id: '80001',
      skipDryRun: true,
		} ,
    coverage: {
      host: 'localhost',
      network_id: '*',
      port: 8555,
      gas: 0xfffffffffff,
      gasPrice: 0x01,
    },
    live: {
      network_id: 1,
      provider: function () {
        return new HDWalletProvider(
          MNEMONIC,
          "https://mainnet.infura.io/v3/" + INFURA_KEY
        );
      },
      gas: 6721975,
      gasPrice: 32000000000
    },
    mocha: {
      reporter: 'eth-gas-reporter',
      reporterOptions: {
        currency: 'USD',
        gasPrice: 2
      }
    },
  },
  compilers: {
    solc: {
      version: '0.8.0',
    },
  },
  settings: {
    optimizer: {
      enabled: false,
      runs: 200
    },
 },

};

