const DAI = artifacts.require('../DAI');
const TOKEN = artifacts.require('../AuditToken');
const ORACLE = artifacts.require('../UniswapPriceOracle');
const SALE = artifacts.require('../Sale');
const WHITELIST = artifacts.require('../WhiteList');
const VESTING = artifacts.require('../Vesting');
const REDEEM = artifacts.require('../DataSubClaim')


module.exports = async function (deployer, network, accounts) { // eslint-disable-line..

    const owner = accounts[0];
    const holder1 = accounts[1];
    const platformAccount = accounts[2];
    let fundingAmount = "15000000000000000000000000";
    let daiFunds = "300000000000000000000000"
    let stakingRatioSale = 10;
    let stakingRatioFund = 50;




    await deployer.deploy(TOKEN, owner);
    let token = await TOKEN.deployed();

    await deployer.deploy(DAI, owner);
    let dai = await DAI.deployed();

    await deployer.deploy(ORACLE);
    let oracle = await ORACLE.deployed();

    await deployer.deploy(WHITELIST);
    let whiteList = await WHITELIST.deployed();

    await deployer.deploy(SALE, oracle.address, platformAccount, token.address, dai.address, whiteList.address, owner, stakingRatioSale);
    let sale = await SALE.deployed();

    await deployer.deploy(VESTING, owner, token.address, stakingRatioFund);
    let vesting = await VESTING.deployed();

    await deployer.deploy(REDEEM, token.address);
    let redeem = await REDEEM.deployed();


    await token.approve(sale.address, fundingAmount, { from: owner })
    let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
    let MINTER_ROLE = web3.utils.keccak256("MINTER_ROLE");


    await whiteList.grantRole(CONTROLLER_ROLE, owner, { from: owner });
    await token.grantRole(MINTER_ROLE, sale.address, { from: owner });
    await token.grantRole(MINTER_ROLE, vesting.address, { from: owner });
    await dai.transfer(holder1, daiFunds, { from: owner });
    await dai.transfer(vesting.address, daiFunds, { from: owner });

    await whiteList.addWhitelisted("0xd3956b952a78C7E6C700883924D52CC776F9E4F2", { from: owner });
    await dai.transfer("0xd3956b952a78C7E6C700883924D52CC776F9E4F2", daiFunds, { from: owner });

    // const timeMachine = require('ganache-time-traveler');

    // await timeMachine.advanceTime(45000);
    // timeMachine.advanceTimeAndBlock(60 * 60 * 6);

    // advanceBlockAtTime(60 * 60 * 6);



    console.log("\n\n" + '"AUDT_TOKEN_ADDRESS":"' + token.address + '",');
    console.log('"DAI_ADDRESS":"' + dai.address + '",');
    console.log('"ORACLE_ADDRESS":"' + oracle.address + '",');
    console.log('"WHITELIST_ADDRESS":"' + whiteList.address + '",');
    console.log('"SALE_ADDRESS":"' + sale.address + '"' + ",");
    console.log('"VESTING_ADDRESS":"' + vesting.address + '"' + ",");
    console.log('"REDEEM_ADDRESS":"' + redeem.address + '"' + "\n\n");





}