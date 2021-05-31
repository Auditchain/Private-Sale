import {
    ensureException,
    duration
} from './helpers/utils.js';

const DAI = artifacts.require('../DAI');
const TOKEN = artifacts.require('../AuditToken');
const ORACLE = artifacts.require('../UniswapPriceOracle');
const SALE = artifacts.require('../Crowdsale');
const WHITELIST = artifacts.require('../WhiteList');

var BN = web3.utils.BN;


contract("Sale contract", (accounts) => {

    const owner = accounts[0];
    const holder1 = accounts[1];
    const platformAccount = accounts[6];
    const addressZero = "0x0000000000000000000000000000000000000000"


    let dai;
    let token;
    let sale;
    let oracle;
    let whiteList;
    let fundingAmount = "15000000000000000000000000";
    let rateAfterFunding = "100000000000000000";
    let daiFunds = "3000000000000000000000"

    // let cohortAddress;
    // let cohortContract;
    // let result;
    // let SETTER_ROLE = web3.utils.keccak256("SETTER_ROLE");

    beforeEach(async () => {

        token = await TOKEN.new(owner);
        dai = await DAI.new(owner);
        oracle = await ORACLE.new();
        whiteList = await WHITELIST.new();

        sale = await SALE.new(oracle.address, platformAccount, token.address, dai.address, whiteList.address, owner);
        await token.approve(sale.address, fundingAmount, { from: owner })
        await sale.fundCrowdsale(fundingAmount, { from: owner });
        let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await whiteList.grantRole(CONTROLLER_ROLE, owner, { from: owner });
        await dai.transfer(holder1, daiFunds, { from: owner });

    })


    describe("Deploy", async () => {

        it("Should succeed. sale deployed and tokens transferred", async () => {

            sale = await SALE.new(oracle.address, platformAccount, token.address, dai.address, whiteList.address, owner);
            await token.approve(sale.address, fundingAmount, { from: owner })
            await sale.fundCrowdsale(fundingAmount, { from: owner });

            let tokenInSale = await token.balanceOf(sale.address);
            assert.strictEqual(tokenInSale.toString(), fundingAmount);
            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), rateAfterFunding);
        })
    })

    describe("Whitelisting", async () => {

        it("Should succeed. Authorized controller ads new user to white list", async () => {

            await whiteList.addWhitelisted(holder1, { from: owner });
            let isWhiteListed = await whiteList.isWhitelisted(holder1);
            assert.strictEqual(isWhiteListed, true);
        })

        it("Should succeed. Authorized controller removes whitelisted user from the white list", async () => {

            await whiteList.addWhitelisted(holder1, { from: owner });
            await whiteList.removeWhitelisted(holder1, { from: owner });
            let isWhiteListed = await whiteList.isWhitelisted(holder1);
            assert.strictEqual(isWhiteListed, false);
        })


        it("Should fail. Authorized controller adds the same user twice to white list", async () => {

            await whiteList.addWhitelisted(holder1, { from: owner });
            try {
                await whiteList.addWhitelisted(holder1, { from: owner });
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. Authorized controller removes user who wasn't added before to the white list", async () => {
            try {
                await whiteList.removeWhitelisted(holder1, { from: owner });
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. Unauthorized controller ads new user to white list", async () => {
            try {
                await whiteList.addWhitelisted(holder1, { from: holder1 });
            }
            catch (error) {
                ensureException(error);
            }
        })

        it("Should fail. Unauthorized controller removes whitelisted user from the white list", async () => {

            await whiteList.addWhitelisted(holder1, { from: owner });
            try {
                await whiteList.removeWhitelisted(holder1, { from: holder1 });
            }
            catch (error) {
                ensureException(error);
            }
        })
    })

    describe("Buy tokens for Ether", async () => {

        it("Should succeed. User should receive tokens when sending ether to the contract. DAI price is 3000/ether, rate 0.1 DAI", async () => {
            console.log("     User should receive 30,000 AUDT tokens.");

            let walletBalanceBefore = new BN(await web3.eth.getBalance(platformAccount));
            let purchaseAmount = web3.utils.toWei('1', 'ether');

            await whiteList.addWhitelisted(holder1, { from: owner });
            await sale.buyTokens("0", { value: purchaseAmount, from: holder1 });

            let userTokens = await token.balanceOf(holder1);
            assert.strictEqual(userTokens.toString(), "30000000000000000000000");
            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "100000000000000000");

            let walletBalanceAfter = new BN(await web3.eth.getBalance(platformAccount));
            let difference = new BN(walletBalanceAfter).sub(walletBalanceBefore);
            assert.strictEqual(difference.toString(), purchaseAmount.toString());

        })

        it("Should succeed. User should receive tokens when sending ether to the contract. DAI price is 3000/ether, rate 0.125 DAI", async () => {
            console.log("     User should receive 24,000 AUDT tokens.");

            let walletBalanceBefore = new BN(await web3.eth.getBalance(platformAccount));

            sale = await SALE.new(oracle.address, platformAccount, token.address, dai.address, whiteList.address, owner);
            let fundingAmount = "9000000000000000000000000";  //second price level at 0.125 DAI
            let purchaseAmount = web3.utils.toWei('1', 'ether');

            await token.approve(sale.address, fundingAmount, { from: owner })
            await sale.fundCrowdsale(fundingAmount, { from: owner });
            await whiteList.addWhitelisted(holder1, { from: owner });
            await sale.buyTokens("0", { value: purchaseAmount, from: holder1 });

            let userTokens = await token.balanceOf(holder1);
            assert.strictEqual(userTokens.toString(), "24000000000000000000000");

            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "125000000000000000");
            let walletBalanceAfter = new BN(await web3.eth.getBalance(platformAccount));

            let difference = new BN(walletBalanceAfter).sub(walletBalanceBefore);
            assert.strictEqual(difference.toString(), purchaseAmount.toString());

        })

        it("Should succeed. User should receive tokens when sending ether to the contract. DAI price is 3000/ether, rate 0.15 DAI", async () => {
            console.log("     User should receive 20,000 AUDT tokens.");

            let walletBalanceBefore = new BN(await web3.eth.getBalance(platformAccount));
            sale = await SALE.new(oracle.address, platformAccount, token.address, dai.address, whiteList.address, owner);
            let fundingAmount = "4000000000000000000000000";  //second price level at 0.15 DAI
            let purchaseAmount = web3.utils.toWei('1', 'ether');

            await token.approve(sale.address, fundingAmount, { from: owner })
            await sale.fundCrowdsale(fundingAmount, { from: owner });
            await whiteList.addWhitelisted(holder1, { from: owner });
            await sale.buyTokens("0", { value: purchaseAmount, from: holder1 });

            let userTokens = await token.balanceOf(holder1);
            assert.strictEqual(userTokens.toString(), "20000000000000000000000");

            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "150000000000000000");
            let walletBalanceAfter = new BN(await web3.eth.getBalance(platformAccount));

            let difference = new BN(walletBalanceAfter).sub(walletBalanceBefore);
            assert.strictEqual(difference.toString(), purchaseAmount.toString());


        })

        it("Should fail. There are no tokens in the contract", async () => {

            sale = await SALE.new(oracle.address, platformAccount, token.address, dai.address, whiteList.address, owner);

            try {
                await whiteList.addWhitelisted(holder1, { from: owner });
                await sale.buyTokens("0", { value: web3.utils.toWei('1', 'ether'), from: holder1 });
            }
            catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. Uer is not whitelisted", async () => {

            try {
                // await whiteList.addWhitelisted(holder1, { from: owner });
                await sale.buyTokens("0", { value: web3.utils.toWei('1', 'ether'), from: holder1 });
            }
            catch (error) {
                ensureException(error);
            }

        })
    })

    describe("Buy tokens for DAI", async () => {

        it("Should succeed. User should receive tokens when sending 3000 DAI to the contract at the  rate 0.1/DAI", async () => {
            console.log("     User should receive 30,000 AUDT tokens.");


            await whiteList.addWhitelisted(holder1, { from: owner });
            await dai.increaseAllowance(sale.address, daiFunds, { from: holder1 });
            await sale.buyTokens(daiFunds, { from: holder1 });

            let userTokens = await token.balanceOf(holder1);
            assert.strictEqual(userTokens.toString(), "30000000000000000000000");
            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "100000000000000000");

            let walletDaiBalanceAfter = await dai.balanceOf(platformAccount);;
            assert.strictEqual(walletDaiBalanceAfter.toString(), daiFunds);

        })

        it("Should succeed. User should receive tokens when sending 3000 DAI to the contract at the rate 0.125/DAI", async () => {
            console.log("     User should receive 24,000 AUDT tokens.");

            sale = await SALE.new(oracle.address, platformAccount, token.address, dai.address, whiteList.address, owner);
            let fundingAmount = "9000000000000000000000000";  //second price level at 0.125 DAI
            await token.approve(sale.address, fundingAmount, { from: owner })
            await sale.fundCrowdsale(fundingAmount, { from: owner });

            await whiteList.addWhitelisted(holder1, { from: owner });
            await dai.increaseAllowance(sale.address, daiFunds, { from: holder1 });
            await sale.buyTokens(daiFunds, { from: holder1 });

            let userTokens = await token.balanceOf(holder1);
            assert.strictEqual(userTokens.toString(), "24000000000000000000000");
            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "125000000000000000");

            let walletDaiBalanceAfter = await dai.balanceOf(platformAccount);;
            assert.strictEqual((walletDaiBalanceAfter).toString(), daiFunds);
        })

        it("Should succeed. User should receive tokens when sending 3000 DAI to the contract at the rate 0.15/DAI", async () => {
            console.log("     User should receive 20,000 AUDT tokens.");

            sale = await SALE.new(oracle.address, platformAccount, token.address, dai.address, whiteList.address, owner);
            let fundingAmount = "4000000000000000000000000";  //second price level at 0.125 DAI
            await token.approve(sale.address, fundingAmount, { from: owner })
            await sale.fundCrowdsale(fundingAmount, { from: owner });

            await whiteList.addWhitelisted(holder1, { from: owner });
            await dai.increaseAllowance(sale.address, daiFunds, { from: holder1 });
            await sale.buyTokens(daiFunds, { from: holder1 });

            let userTokens = await token.balanceOf(holder1);
            assert.strictEqual(userTokens.toString(), "20000000000000000000000");
            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "150000000000000000");

            let walletDaiBalanceAfter = await dai.balanceOf(platformAccount);;
            assert.strictEqual((walletDaiBalanceAfter).toString(), daiFunds);
        })

        it("Should fail. There are no tokens in the contract", async () => {

            sale = await SALE.new(oracle.address, platformAccount, token.address, dai.address, whiteList.address, owner);

            try {
                await whiteList.addWhitelisted(holder1, { from: owner });
                await sale.buyTokens(daiFunds, {from: holder1 });
            }
            catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. Uer is not whitelisted", async () => {

            try {
                await sale.buyTokens(daiFunds, {  from: holder1 });
            }
            catch (error) {
                ensureException(error);
            }

        })
    })

    describe('Collect unsold tokens', async () => {
        it('Should succeed. Authorized user can claim unused tokens at any time', async () => {

            const tokensBeforeSale = token.balanceOf(sale.address);
            const tokensBeforeOperator = token.balanceOf(platformAccount);

            await sale.claimUnsoldTokens({ from: owner });

            const tokensAfterSale = token.balanceOf(sale.address);
            const tokensAfterOperator = token.balanceOf(platformAccount);

            assert.strictEqual(tokensBeforeSale.toString(), tokensAfterOperator.toString());
            assert.strictEqual(tokensBeforeOperator.toString(), tokensAfterSale.toString());


        })

        it('Should fail. Unauthorized user can not claim unused tokens at any time', async () => {

            try {
                await sale.claimUnsoldTokens({ from: holder1 });
            }
            catch (error) {
                ensureException(error);
            }


        })
    })

    describe('events', async () => {

        it('should log AdddWhitelisted after AdddWhitelisted()', async () => {

            let result = await whiteList.addWhitelisted(holder1, { from: owner });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'AdddWhitelisted');
            assert.equal(event.args.user, holder1);
        })

        it('should log RemovedWhitelisted after after removeWhitelisted()', async () => {

            await whiteList.addWhitelisted(holder1, { from: owner });

            let result = await whiteList.removeWhitelisted(holder1, { from: owner });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'RemovedWhitelisted');
            assert.equal(event.args.user, holder1);
        })

        it('should log TokensPurchased  sending funds to contract', async () => {



            let purchaseAmount = web3.utils.toWei('1', 'ether');

            await whiteList.addWhitelisted(holder1, { from: owner });
            let result = await sale.buyTokens("0", { value: purchaseAmount, from: holder1 });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'TokensPurchased');
            assert.equal(event.args.value, purchaseAmount);
        })

        it('should log TokensDeposited  after initial deposit of tokens', async () => {

            sale = await SALE.new(oracle.address, platformAccount, token.address, dai.address, whiteList.address, owner);
            await token.approve(sale.address, fundingAmount, { from: owner })
            let result = await sale.fundCrowdsale(fundingAmount, { from: owner });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'TokensDeposited');
            assert.equal(event.args.amount, fundingAmount);
        })

        it('should log TokensWithdrawn  after withdrawing outstanding tokens', async () => {

            
            let result = await sale.claimUnsoldTokens({ from: owner });
            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'TokensWithdrawn');
            assert.equal(event.args.amount, fundingAmount);
        })
    })



})