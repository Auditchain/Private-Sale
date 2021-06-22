// import { platform } from 'ethers';
import {
    ensureException,
    duration
} from './helpers/utils.js';

const DAI = artifacts.require('../DAI');
const TOKEN = artifacts.require('../AuditToken');
const ORACLE = artifacts.require('../UniswapPriceOracle');
const SALE = artifacts.require('../Sale');
const WHITELIST = artifacts.require('../WhiteList');

var BN = web3.utils.BN;
const timeMachine = require('ganache-time-traveler');



contract("Sale contract", (accounts) => {

    const owner = accounts[0];
    const holder1 = accounts[1];
    const holder2 = accounts[2];
    const wallet = accounts[6];


    let dai;
    let token;
    let sale;
    let oracle;
    let whiteList;
    let fundingAmount = "15000000000000000000000000";
    let rateAfterFunding = "100000000000000000";
    let daiFunds = "3000000000000000000000";
    let stakingRatio = "10";
    let days366 = "31622400";   //366 days
    let cliff14 = "1209600";     //14 days
    let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");



    beforeEach(async () => {

        token = await TOKEN.new(owner);
        dai = await DAI.new(owner);
        oracle = await ORACLE.new();
        whiteList = await WHITELIST.new();

        sale = await SALE.new(oracle.address, wallet, token.address, dai.address, whiteList.address, owner, stakingRatio);
        await token.approve(sale.address, fundingAmount, { from: owner })
        await sale.fundSale(fundingAmount, { from: owner });
        let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
        await whiteList.grantRole(CONTROLLER_ROLE, owner, { from: owner });
        await dai.transfer(holder1, daiFunds, { from: owner });

    })

    describe("Deploy", async () => {

        it("Should succeed. sale deployed and tokens transferred", async () => {

            sale = await SALE.new(oracle.address, wallet, token.address, dai.address, whiteList.address, owner, stakingRatio);
            await token.approve(sale.address, fundingAmount, { from: owner })
            await sale.fundSale(fundingAmount, { from: owner });

            let tokenInSale = await token.balanceOf(sale.address);
            assert.strictEqual(tokenInSale.toString(), fundingAmount);
            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), rateAfterFunding);

            let platformAccountInContract = await sale.admin();
            let stakingRatioInContract = await sale.stakingRatio();
            let vestingSchedule = await sale.returnVestingSchedule();

            assert.strictEqual(owner, platformAccountInContract);                   // platform account
            assert.strictEqual(stakingRatio, stakingRatioInContract.toString());              // staking ratio
            assert.strictEqual(days366, vestingSchedule[0].toString());                       // duration
            // assert.strictEqual(vestingSchedule[2].toString(), vestingSchedule[3].toString()); // Start = blockNumber
            assert.strictEqual((Number(cliff14) + Number(vestingSchedule[2])).toString(), vestingSchedule[1].toString()); //cliff
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
            console.log("     User should receive 30,000 AUDT tokens. 25% right away and 75% in vesting");

            let walletBalanceBefore = new BN(await web3.eth.getBalance(wallet));
            let purchaseAmount = web3.utils.toWei('1', 'ether');

            await whiteList.addWhitelisted(holder1, { from: owner });
            await sale.buyTokens("0", { value: purchaseAmount, from: holder1 });

            let userTokens = await token.balanceOf(holder1);
            assert.strictEqual(userTokens.toString(), "7500000000000000000000");  // 25 % of 30,000
            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "100000000000000000");

            let walletBalanceAfter = new BN(await web3.eth.getBalance(wallet));
            let difference = new BN(walletBalanceAfter).sub(walletBalanceBefore);
            assert.strictEqual(difference.toString(), purchaseAmount.toString());

        })

        it("Should succeed. User should receive tokens when sending ether to the contract. DAI price is 3000/ether, rate 0.125 DAI", async () => {
            console.log("     User should receive 24,000 AUDT tokens. 25% right away and 75% in vesting");

            await whiteList.addWhitelisted(holder2, { from: owner });
            for (let i = 0; i < 10; i++) {

                let purchaseAmount = web3.utils.toWei('20', 'ether');
                await sale.buyTokens("0", { value: purchaseAmount, from: holder2 });

            }

            let purchaseAmount = web3.utils.toWei('1', 'ether');
            await sale.buyTokens("0", { value: purchaseAmount, from: holder2 });

            let walletBalanceBefore = new BN(await web3.eth.getBalance(wallet));
            await whiteList.addWhitelisted(holder1, { from: owner });
            await sale.buyTokens("0", { value: purchaseAmount, from: holder1 });

            let userTokens = await token.balanceOf(holder1);
            assert.strictEqual(userTokens.toString(), "6000000000000000000000"); // 25% of 24,000

            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "125000000000000000");
            let walletBalanceAfter = new BN(await web3.eth.getBalance(wallet));

            let difference = new BN(walletBalanceAfter).sub(walletBalanceBefore);
            assert.strictEqual(difference.toString(), purchaseAmount.toString());

        })

        it("Should succeed. User should receive tokens when sending ether to the contract. DAI price is 3000/ether, rate 0.15 DAI", async () => {
            console.log("     User should receive 20,000 AUDT tokens. 25% right away and 75% in vesting");

            await whiteList.addWhitelisted(holder2, { from: owner });
            for (let i = 0; i < 30; i++) {

                let purchaseAmount = web3.utils.toWei('20', 'ether');
                await sale.buyTokens("0", { value: purchaseAmount, from: holder2 });

            }

            let purchaseAmount = web3.utils.toWei('1', 'ether');
            await sale.buyTokens("0", { value: purchaseAmount, from: holder2 });

            let walletBalanceBefore = new BN(await web3.eth.getBalance(wallet));
            await whiteList.addWhitelisted(holder1, { from: owner });
            await sale.buyTokens("0", { value: purchaseAmount, from: holder1 });

            let userTokens = await token.balanceOf(holder1);
            assert.strictEqual(userTokens.toString(), "5000000000000000000000"); // 25% of 20,000

            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "150000000000000000");
            let walletBalanceAfter = new BN(await web3.eth.getBalance(wallet));

            let difference = new BN(walletBalanceAfter).sub(walletBalanceBefore);
            assert.strictEqual(difference.toString(), purchaseAmount.toString());


        })

        it("Should fail. There are no tokens in the contract", async () => {

            sale = await SALE.new(oracle.address, wallet, token.address, dai.address, whiteList.address, owner, stakingRatio);

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
            assert.strictEqual(userTokens.toString(), "7500000000000000000000");  // 25 % of 30,000
            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "100000000000000000");

            let walletDaiBalanceAfter = await dai.balanceOf(wallet);;
            assert.strictEqual(walletDaiBalanceAfter.toString(), daiFunds);
        })

        it("Should succeed. User should receive tokens when sending 3000 DAI to the contract at the rate 0.125/DAI", async () => {
            console.log("     User should receive 24,000 AUDT tokens.");


            await whiteList.addWhitelisted(holder2, { from: owner });

            //buy some tokens to move price range to 0.125
            for (let i = 0; i < 10; i++) {

                let purchaseAmount = web3.utils.toWei('20', 'ether');
                await sale.buyTokens("0", { value: purchaseAmount, from: holder2 });
            }


            let purchaseAmount = web3.utils.toWei('1', 'ether');
            await sale.buyTokens("0", { value: purchaseAmount, from: holder2 });

            await whiteList.addWhitelisted(holder1, { from: owner });
            await dai.increaseAllowance(sale.address, daiFunds, { from: holder1 });
            await sale.buyTokens(daiFunds, { from: holder1 });

            let userTokens = await token.balanceOf(holder1);
            assert.strictEqual(userTokens.toString(), "6000000000000000000000"); // 25% of 24,000
            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "125000000000000000");

            let walletDaiBalanceAfter = await dai.balanceOf(wallet);;
            assert.strictEqual((walletDaiBalanceAfter).toString(), daiFunds);
        })

        it("Should succeed. User should receive tokens when sending 3000 DAI to the contract at the rate 0.15/DAI", async () => {
            console.log("     User should receive 20,000 AUDT tokens.");

            await whiteList.addWhitelisted(holder2, { from: owner });
            for (let i = 0; i < 30; i++) {

                let purchaseAmount = web3.utils.toWei('20', 'ether');
                await sale.buyTokens("0", { value: purchaseAmount, from: holder2 });

            }

            let purchaseAmount = web3.utils.toWei('1', 'ether');
            await sale.buyTokens("0", { value: purchaseAmount, from: holder2 });


            await whiteList.addWhitelisted(holder1, { from: owner });
            await dai.increaseAllowance(sale.address, daiFunds, { from: holder1 });
            await sale.buyTokens(daiFunds, { from: holder1 });

            let userTokens = await token.balanceOf(holder1);
            assert.strictEqual(userTokens.toString(), "5000000000000000000000"); // 25% of 20,000
            let rate = await sale.rate();
            assert.strictEqual(rate.toString(), "150000000000000000");

            let walletDaiBalanceAfter = await dai.balanceOf(wallet);;
            assert.strictEqual((walletDaiBalanceAfter).toString(), daiFunds);
        })

        it("Should fail. There are no tokens in the contract", async () => {

            sale = await SALE.new(oracle.address, wallet, token.address, dai.address, whiteList.address, owner, stakingRatio);

            try {
                await whiteList.addWhitelisted(holder1, { from: owner });
                await sale.buyTokens(daiFunds, { from: holder1 });
            }
            catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. Uer is not whitelisted", async () => {

            try {
                await sale.buyTokens(daiFunds, { from: holder1 });
            }
            catch (error) {
                ensureException(error);
            }

        })
    })

    describe('Collect unsold tokens', async () => {
        it('Should succeed. Authorized user can claim unused tokens at any time', async () => {

            const tokensBeforeSale = token.balanceOf(sale.address);
            const tokensBeforeOperator = token.balanceOf(wallet);

            await sale.claimUnsoldTokens({ from: owner });

            const tokensAfterSale = token.balanceOf(sale.address);
            const tokensAfterOperator = token.balanceOf(wallet);

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

            assert.lengthOf(result.logs, 2);
            let event = result.logs[1];
            assert.equal(event.event, 'TokensPurchased');
            assert.equal(new BN(event.args.vestedAmount).add(event.args.instantAmount).toString(), "30000000000000000000000");
        })

        it('should log TokensDeposited  after initial deposit of tokens', async () => {

            sale = await SALE.new(oracle.address, wallet, token.address, dai.address, whiteList.address, owner, stakingRatio);
            await token.approve(sale.address, fundingAmount, { from: owner })
            let result = await sale.fundSale(fundingAmount, { from: owner });

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


        it('should log FundsForwarded after sending ether to contract', async () => {



            let purchaseAmount = web3.utils.toWei('1', 'ether');

            await whiteList.addWhitelisted(holder1, { from: owner });
            let result = await sale.buyTokens("0", { value: purchaseAmount, from: holder1 });

            assert.lengthOf(result.logs, 2);
            let event = result.logs[0];
            assert.equal(event.event, 'FundsForwarded');
            assert.equal(event.args.eth, web3.utils.toWei('1', 'ether'));
        })

        it('should log FundsForwarded after sending DAI to contract', async () => {

            await dai.increaseAllowance(sale.address, daiFunds, { from: holder1 });
            await whiteList.addWhitelisted(holder1, { from: owner });
            let result = await sale.buyTokens(daiFunds, { from: holder1 });

            assert.lengthOf(result.logs, 2);
            let event = result.logs[0];
            assert.equal(event.event, 'FundsForwarded');
            assert.equal(event.args.dai.toString(), daiFunds);
        })
    })


    describe("Redeem Vested amount and vested rewards", async () => {

        let snapshotId;

        beforeEach(async () => {
            let snapshot = await timeMachine.takeSnapshot();
            snapshotId = snapshot['result'];
            let purchaseAmount = web3.utils.toWei('1', 'ether');

            await whiteList.addWhitelisted(holder1, { from: owner });
            await sale.buyTokens("0", { value: purchaseAmount, from: holder1 });
            // await token.increaseAllowance(sale.address, fundAmount, { from: operator });

        });

        afterEach(async () => {
            await timeMachine.revertToSnapshot(snapshotId);
        });

        it("Should succeed. User received correct amount after 1 month of vesting period.", async () => {

            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 30.5);  // on average month
            let oneMonthVestedAvailable = "1875000000000000000000";  // 75% of 30,000 divided by 12 months. 

            let vestedAmountAvailable = await sale.vestedAmountAvailable({ from: holder1 });

            let result = await sale.release({ from: holder1 });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'VestedPortionReleased');
            assert.equal(event.args.user, holder1);
            assert.equal(event.args.amount.toString(), vestedAmountAvailable.toString());

        })


        it("Should fail. User should not receive any vesting tokens before vesting cliff is over.", async () => {

            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 10);

            try {

                let result = await sale.release({ from: holder1 });
            } catch (error) {
                ensureException(error);

            }
        })


        it("Should succeed. User receives full vesting amount and rewards after 1 year of vesting.", async () => {

            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 367);

            let vestedAmountAvailable = await sale.vestedAmountAvailable({ from: holder1 });

            await token.grantRole(CONTROLLER_ROLE, sale.address, { from: owner });

            let rewardsTotal = await sale.calculateRewardsTotal(holder1);
            let result = await sale.release({ from: holder1 });

            assert.lengthOf(result.logs, 2);
            let event = result.logs[0];
            assert.equal(event.event, 'StakingRewardsReleased');
            assert.equal(event.args.amount.toString(), rewardsTotal.toString());

            event = result.logs[1];
            assert.equal(event.event, 'VestedPortionReleased');
            assert.equal(event.args.user, holder1);
            assert.equal(event.args.amount.toString(), vestedAmountAvailable.toString());

        })


        it("Should succeed. User receives remainder vesting amount and decreased rewards after 1 year of vesting.", async () => {

            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 60);

            await token.grantRole(CONTROLLER_ROLE, sale.address, { from: owner });

            let result = await sale.release({ from: holder1 });

            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 307);

            let vestedAmountAvailable = await sale.vestedAmountAvailable({ from: holder1 });

            let rewardsTotal = await sale.calculateRewardsTotal(holder1);
            result = await sale.release({ from: holder1 });

            assert.lengthOf(result.logs, 2);
            let event = result.logs[0];
            assert.equal(event.event, 'StakingRewardsReleased');
            assert.equal(event.args.amount.toString(), rewardsTotal.toString());

            event = result.logs[1];
            assert.equal(event.event, 'VestedPortionReleased');
            assert.equal(event.args.user, holder1);
            assert.equal(event.args.amount.toString(), vestedAmountAvailable.toString());

        })


        it("Should succeed. User receives remainder vesting amount and 0 rewards after 1 year of vesting.", async () => {

            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 366);

            await token.grantRole(CONTROLLER_ROLE, sale.address, { from: owner });

            let result = await sale.release({ from: holder1 });

            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 5);

            let vestedAmountAvailable = await sale.vestedAmountAvailable({ from: holder1 });

            let rewardsTotal = await sale.calculateRewardsTotal(holder1);
            result = await sale.release({ from: holder1 });

            assert.lengthOf(result.logs, 2);
            let event = result.logs[0];
            assert.equal(event.event, 'StakingRewardsReleased');
            assert.equal(event.args.amount.toString(), rewardsTotal.toString());

            event = result.logs[1];
            assert.equal(event.event, 'VestedPortionReleased');
            assert.equal(event.args.user, holder1);
            assert.equal(event.args.amount.toString(), vestedAmountAvailable.toString());

        })
    })



})