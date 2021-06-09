
const Web3 = require('web3');
web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");

console.log(CONTROLLER_ROLE);