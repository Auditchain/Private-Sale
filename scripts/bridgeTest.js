"use strict";
let Web3 = require('web3');
let express = require('express');
let app = express();
let contract = require('truffle-contract');
let HDWalletProvider = require('@truffle/hdwallet-provider');
let BN = require("big-number");
// let nodemailer = require("nodemailer");

let dotenv = require('dotenv').config({ path: './.env' })


const main_infura_server = process.env.MAINNET_INFURA_SERVER;
const mumbai_infura_server = process.env.MUMBAI_INFURA_SERVER;
const private_key = process.env.PRIVATE_KEY;
const websocketProvider = process.env.WEBSOCKET_PROVIDER;

const provider = new Web3.providers.WebsocketProvider(process.env.WEBSOCKET_PROVIDER); // e.g. 'ws://localhost:8545'
const providerForUpdate = new HDWalletProvider(private_key, process.env.WEBSOCKET_PROVIDER); // change to main_infura_server or another testnet. 

const web3 = new Web3(provider);
const web3Update = new Web3(providerForUpdate);


const AUDITTOKEN = require('../build/contracts/AuditToken.json');
const auditTokenAddress = process.env.AUDT_TOKEN_ADDRESS;
const auditTokenAddressSecond = process.env.AUDIT_TOKEN_ADDRESS_SECOND;

// let token = new web3.eth.Contract(AUDITTOKEN["abi"], auditTokenAddress);
const addressZero = "0x0000000000000000000000000000000000000000";
let token;
let token2;
let nonce;
let owner;



async function mintTokensPolygon(receipient, amount) {

    const checkNonce = await web3.eth.getTransactionCount(owner);

    if (checkNonce > nonce)
        nonce = checkNonce;

    token2.methods
        .mint(receipient, amount)
        .send({ from: owner, gas: 800000, nonce: nonce })
        .on("receipt", async function (receipt) {
            const values = receipt.events.Transfer.returnValues;
            console.log('You have successfully migrated ', values.value + " AUDT to Polygon");

            nonce++;

            const balance = await token2.methods.balanceOf(owner).call();

            console.log('From token:' + balance);

        })
        .on("error", function (error) {
            console.log("An error occurred:", error)
        });

}

async function mintTokensEthereum(receipient, amount) {

    const checkNonce = await web3.eth.getTransactionCount(owner);

    if (checkNonce > nonce)
        nonce = checkNonce;

    token2.methods
        .mint(receipient, amount)
        .send({ from: owner, gas: 800000, nonce: nonce })
        .on("receipt", async function (receipt) {
            const values = receipt.events.Transfer.returnValues;
            console.log('You have successfully migrated ', values.value + " AUDT to Polygon");

            nonce++;

            const balance = await token2.methods.balanceOf(owner).call();

            console.log('From token:' + balance);

        })
        .on("error", function (error) {
            console.log("An error occurred:", error)
        });

}

async function startProcess() {


    owner = providerForUpdate.addresses[0];
    nonce = await web3.eth.getTransactionCount(owner);
    token = new web3.eth.Contract(AUDITTOKEN["abi"], auditTokenAddress);
    token2 = new web3Update.eth.Contract(AUDITTOKEN["abi"], auditTokenAddressSecond);

    // console.log(token2);

    console.log("Bridge Activeted....")
    console.log("token address:", token._address);
    // console.log(token.events);


    token.events.Transfer({ fromBlock: 'latest' })
        .on('data', async function (event) {

            const trxHash = event.transactionHash;
            const from = event.returnValues.from;
            const amount = event.returnValues.value;

            console.log("from:", event.returnValues.from);
            console.log("amount:", event.returnValues.value);


            await mintTokensPolygon(from, amount);

        })
        .on('error', async function (error, event) {

            console.error;

        })


        token2.events.Transfer({ fromBlock: 'latest' })
        .on('data', async function (event) {

            const trxHash = event.transactionHash;
            const from = event.returnValues.from;
            const amount = event.returnValues.value;

            console.log("from:", event.returnValues.from);
            console.log("amount:", event.returnValues.value);


            await mintTokensEthereum(from, amount);

        })
        .on('error', async function (error, event) {

            console.error;

        })
}

startProcess();