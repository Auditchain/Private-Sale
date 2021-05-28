const DAI = artifacts.require('../DAI');
const TOKEN = artifacts.require('../AuditToken');
const ORACLE = artifacts.require('../UniswapPriceOracle');
const SALE = artifacts.require('../Crowdsale');
const WHITELIST = artifacts.require('../WhiteList');



module.exports = async function (deployer, network, accounts) { // eslint-disable-line..

    const owner = accounts[0];
    const holder1 = accounts[1];
    const platformAccount = accounts[2];
    let fundingAmount = "15000000000000000000000000";
    let daiFunds = "300000000000000000000000"




    await deployer.deploy(TOKEN, owner);
    let token = await TOKEN.deployed();

    await deployer.deploy(DAI, owner);
    let dai = await DAI.deployed();

    await deployer.deploy(ORACLE);
    let oracle = await ORACLE.deployed();

    await deployer.deploy(WHITELIST);
    let whiteList = await WHITELIST.deployed();

    await deployer.deploy(SALE, oracle.address, platformAccount, token.address, dai.address, whiteList.address, owner);
    let sale = await SALE.deployed();


    await token.approve(sale.address, fundingAmount, { from: owner })
    await sale.fundCrowdsale(fundingAmount, { from: owner });
    let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
    await whiteList.grantRole(CONTROLLER_ROLE, owner, { from: owner });
    await dai.transfer(holder1, daiFunds, { from: owner });

    await whiteList.addWhitelisted("0xd3956b952a78C7E6C700883924D52CC776F9E4F2", { from: owner });
    await dai.transfer("0xd3956b952a78C7E6C700883924D52CC776F9E4F2", daiFunds, { from: owner });



    console.log("\n\n" + '"AUDT_TOKEN_ADDRESS":"' + token.address + '",');
    console.log('"DAI_ADDRESS":"' + dai.address + '",');
    console.log('"ORACLE_ADDRESS":"' + oracle.address + '",');
    console.log('"WHITELIST_ADDRESS":"' + whiteList.address + '",');
    console.log('"SALE_ADDRESS":"' + sale.address + '"' + "\n\n");

}