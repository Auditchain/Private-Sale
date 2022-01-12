"use strict";
// let contract = require('truffle-contract');
let Web3 = require('web3');
// let ethers = require('ethers');
// let axios = require("axios");
// let ipfsAPI = require("ipfs-api");
// const fs = require('fs');

let express = require('express');
// let bodyParser = require('body-parser');
let app = express();
let contract = require('truffle-contract');
// let Web3 = require('web3');
let HDWalletProvider = require('@truffle/hdwallet-provider');
let BN = require("big-number");
// let nodemailer = require("nodemailer");

let dotenv = require('dotenv').config({ path: './.env' })


const main_infura_server = process.env.MAINNET_INFURA_SERVER;
const mumbai_infura_server = process.env.MUMBAI_INFURA_SERVER;
const private_key = process.env.PRIVATE_KEY;

const websocketProvider = process.env.WEBSOCKET_PROVIDER;




const providerEth = new Web3.providers.WebsocketProvider(process.env.WEBSOCKET_PROVIDER_ETH); // e.g. 'ws://localhost:8545'
const providerPoly = new Web3.providers.WebsocketProvider(process.env.WEBSOCKET_PROVIDER_POLY); // e.g. 'ws://localhost:8545'

const providerForUpdatePoly = new HDWalletProvider(private_key, process.env.WEBSOCKET_PROVIDER_POLY); // change to main_infura_server or another testnet. 
const providerForUpdateEth = new HDWalletProvider(private_key, process.env.WEBSOCKET_PROVIDER_ETH); // change to main_infura_server or another testnet. 

const web3Eth = new Web3(providerEth);
const web3Poly = new Web3(providerPoly);


const web3UpdatePoly = new Web3(providerForUpdatePoly);
const web3UpdateEth = new Web3(providerForUpdateEth);


// const owner = provider.addresses[0];

const AUDITTOKEN = require('../build/contracts/AuditToken.json');
const BRIDGE = require('../build/contracts/Bridge.json');

const auditTokenAddressEth = process.env.AUDT_TOKEN_ADDRESS_ETH;
const auditTokenAddressPoly = process.env.AUDT_TOKEN_ADDRESS_POLY;
const BridgeAddressEth = process.env.BRIDGE_ADDRESS_ETH;
const BridgeAddressPoly = process.env.BRIDGE_ADDRESS_ETH;

const addressZero = "0x0000000000000000000000000000000000000000";
let tokenEth;
let tokenPoly;
let tokenPolyUpdate;
let tokenEthUpdate;
let nonceEth;
let noncePoly;
let owner;



async function mintTokensPoly(identifier) {

    noncePoly = await web3UpdatePoly.eth.getTransactionCount(owner);



    bridgePolyUpdate.methods
        .createNewTokens(identifier)
        .send({ from: owner, gas: 800000, nonce: noncePoly })
        .on("receipt", async function (receipt) {
            const values = receipt.events.Transfer.returnValues;
            console.log('You have successfully migrated ', values.value + " AUDT to Polygon");

            noncePoly++;

            const balance = await tokenPolyUpdate.methods.balanceOf(owner).call();

            console.log('From tokenEth:' + balance);

        })
        .on("error", function (error) {
            console.log("An error occurred:", error)
        });

}

async function mintTokensEthereum(recipient, amount) {

    nonceEth = await web3UpdateEth.eth.getTransactionCount(owner);


    tokenEthUpdate.methods
        .mint(recipient, amount)
        .send({ from: owner, gas: 800000, nonce: nonceEth })
        .on("receipt", async function (receipt) {
            const values = receipt.events.Transfer.returnValues;
            console.log('You have successfully migrated ', values.value + " AUDT to Ethereum");
            nonceEth++;

            const balance = await tokenEth.methods.balanceOf(owner).call();
            console.log('From tokenEth:' + balance);

        })
        .on("error", function (error) {
            console.log("An error occurred:", error)
        });

}

async function startProcess() {


    owner = providerForUpdatePoly.addresses[0];
    // nonceEth = await web3Eth.eth.getTransactionCount(owner);
    tokenEth = new web3Eth.eth.Contract(AUDITTOKEN["abi"], auditTokenAddressEth);
    tokenPoly = new web3Poly.eth.Contract(AUDITTOKEN["abi"], auditTokenAddressPoly);

    bridgeEth = new web3Eth.eth.Contract(["abi"], BridgeAddressEth);
    bridgePoly = new web3Eth.eth.Contract(BRIDGE["abi"], BridgeAddressPoly);


    tokenPolyUpdate = new web3UpdatePoly.eth.Contract(AUDITTOKEN["abi"], auditTokenAddressPoly);
    tokenEthUpdate = new web3UpdateEth.eth.Contract(AUDITTBRIDGEOKEN["abi"], auditTokenAddressEth);

    bridgePolyUpdate = new web3UpdatePoly.eth.Contract(BRIDGE["abi"], BridgeAddressEth);
    bridgeEthUpdate = new web3UpdateEth.eth.Contract(BRIDGE["abi"], BridgeAddressPoly);


    console.log("Bridge Activeted....")


    bridgeEth.events.AmountReceived({ fromBlock: 'latest' })
        .on('data', async function (event) {

            const trxHash = event.transactionHash;
            const from = event.returnValues.user;
            const amount = event.returnValues.amount;
            const identifier = event.returnValues.identifier;

            // console.log("from eth:", event.returnValues.from);
            // console.log("amount eth:", event.returnValues.value);


            await mintTokensPoly(identifier);

        })
        .on('error', async function (error, event) {

            console.error;

        })


    tokenPoly.events.Transfer({ fromBlock: 'latest' })
        .on('data', async function (event) {

            const trxHash = event.transactionHash;
            const from = event.returnValues.from;
            const amount = event.returnValues.value;

            // console.log("from Poly:", event.returnValues.from);
            // console.log("amount Poly:", event.returnValues.value);

            if (event.returnValues.from != addressZero)
                await mintTokensEthereum(from, amount);

        })
        .on('error', async function (error, event) {

            console.error;

        })
}

startProcess();