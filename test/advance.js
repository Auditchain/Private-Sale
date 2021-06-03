const timeMachine = require('ganache-time-traveler');

const Web3 = require('web3');
web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));


const advanceBlockAtTime = (time) => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send(
            {
                jsonrpc: "2.0",
                method: "evm_increaseTime",
                params: [time],
                id: new Date().getTime(),
            },
            (err, _) => {
                if (err) {
                    return reject(err);
                }
                const newBlockHash = web3.eth.getBlock("latest").hash;

                return resolve(newBlockHash);
            },
        );
    });
};


async function test() {

    await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 340);
}

test();