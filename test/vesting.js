import { assert } from 'chai';
import {
    ensureException,
    duration
} from './helpers/utils.js';

const DAI = artifacts.require('../DAI');
const TOKEN = artifacts.require('../AuditToken');
const ORACLE = artifacts.require('../UniswapPriceOracle');
const SALE = artifacts.require('../Sale');
const WHITELIST = artifacts.require('../WhiteList');
const VESTING = artifacts.require('../Vesting');

var BN = web3.utils.BN;
const timeMachine = require('ganache-time-traveler');
import expectRevert from './helpers/expectRevert';


contract("Vesting contract", (accounts) => {

    const owner = accounts[0];
    const holder1 = accounts[1];
    const holder2 = accounts[2];
    const operator = accounts[6];

    let token;
    let vesting;
    let stakingRatio = "50";
    let days366 = "31622400";   //366 days
    let cliff14 = "1209600";     //14 days
    let fundAmount = "30000000000000000000000";
    let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");
    let ADMIN_ROLE = "0x00"



    beforeEach(async () => {

        token = await TOKEN.new(operator);
        vesting = await VESTING.new(operator, token.address, stakingRatio);



        // await token.transfer(operator, token.balanceOf(owner).toString(), { from: owner });
    })



    describe("Deploy", async () => {

        it("Should succeed. vesting deployed and initial values set.", async () => {

            // let gas = await token.mint.estimateGas(holder1, 100000, { from: accounts[0] });
            // console.log("gas", gas);

            let platformAccountInContract = await vesting.admin();
            let stakingRatioInContract = await vesting.stakingRatio();
            let vestingSchedule = await vesting.returnVestingSchedule();

            assert.strictEqual(operator, platformAccountInContract);                   // platform account
            assert.strictEqual(stakingRatio, stakingRatioInContract.toString());              // staking ratio
            assert.strictEqual(days366, vestingSchedule[0].toString());                       // duration 
            assert.strictEqual(vestingSchedule[2].toString(), vestingSchedule[3].toString()); // Start = blockNumber
            assert.strictEqual((Number(cliff14) + Number(vestingSchedule[2])).toString(), vestingSchedule[1].toString()); //cliff           
        })
    })

    describe("Fund Vesting", async () => {

        it("Should succeed. Operator has funded contract with appropriate amount.", async () => {


            // let gas = await vesting.fundUserMultiple.estimateGas([holder1, holder2, operator, holder1, holder2, operator, holder1, holder2, operator], [fundAmount, fundAmount, fundAmount, fundAmount, fundAmount, fundAmount, fundAmount, fundAmount, fundAmount], [1, 1, 1, 1, 1, 1, 1, 1, 1], { from: operator });
            // console.log("gas:", gas);

            await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });
            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });
            let result = await vesting.fundVesting(fundAmount, { from: operator });
            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.args.amount.toString(), fundAmount);
        })

        it("Should fail. Operator is not authorized.", async () => {

            await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });
            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });

            try {
                await vesting.fundVesting(fundAmount, { from: holder1 });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. Operator funded wrong amount.", async () => {

            await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });
            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });

            try {
                await vesting.fundVesting(1, { from: operator });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. Operator funded twice.", async () => {

            await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });
            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });

            await vesting.fundVesting(fundAmount, { from: operator });

            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });
            try {
                await vesting.fundVesting(fundAmount, { from: operator });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })
    })

    describe("Fund User", async () => {

        it("Should succeed. User has been allocated vesting tokens by authorized member.", async () => {

            let result = await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });
            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'MemberFunded');
            assert.equal(event.args.beneficiary, holder1);
            assert.equal(event.args.amount.toString(), fundAmount);
            assert.equal(event.args.notStaked, 0);

            let redeemable = await vesting.totalRedeemable();
            assert.equal(fundAmount, redeemable.toString());

        })

        it("Should fail. Unauthorized User attempted to allocated vesting tokens to another member.", async () => {

            try {
                await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: owner });
                expectRevert();
            } catch (error) {

                ensureException(error);
            }
        })

        it("Should fail. Attempt to allocate tokens to a user after contract has been funded. ", async () => {

            await vesting.fundUserMultiple([holder2], [fundAmount], [0], { from: operator });

            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });
            await vesting.fundVesting(fundAmount, { from: operator });

            try {
                await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: owner });
                expectRevert();
            } catch (error) {

                ensureException(error);
            }
        })
    })


    describe("Redeem Vested amount and vested rewards", async () => {

        let snapshotId;

        beforeEach(async () => {
            let snapshot = await timeMachine.takeSnapshot();
            snapshotId = snapshot['result'];
            await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });

            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });
            await vesting.fundVesting(fundAmount, { from: operator });
        });

        afterEach(async () => {
            await timeMachine.revertToSnapshot(snapshotId);
        });

        it("Should succeed. User received correct amount after 1 month of vesting period.", async () => {



            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 30.5);  // on average month

            let vestedAmountAvailable = await vesting.vestedAmountAvailable({ from: holder1 });

            let result = await vesting.release({ from: holder1 });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'VestedPortionReleased');
            assert.equal(event.args.user, holder1);
            assert.equal(event.args.amount.toString(), vestedAmountAvailable.toString());

        })


        it("Should fail. User should not receive any vesting tokens before vesting cliff is over.", async () => {

            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 10);

            try {
                await vesting.release({ from: holder1 });
                expectRevert();
            } catch (error) {
                ensureException(error);

            }
        })


        it("Should succeed. User receives full vesting amount and rewards after 1 year of vesting.", async () => {

            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 367);

            let vestedAmountAvailable = await vesting.vestedAmountAvailable({ from: holder1 });

            await token.grantRole(ADMIN_ROLE, owner, { from: operator });
            await token.grantRole(CONTROLLER_ROLE, vesting.address, { from: owner });

            let rewardsTotal = await vesting.calculateRewardsTotal(holder1);
            let result = await vesting.release({ from: holder1 });

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

            await token.grantRole(ADMIN_ROLE, owner, { from: operator });
            await token.grantRole(CONTROLLER_ROLE, vesting.address, { from: owner });

            let result = await vesting.release({ from: holder1 });

            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 307);

            let vestedAmountAvailable = await vesting.vestedAmountAvailable({ from: holder1 });

            let rewardsTotal = await vesting.calculateRewardsTotal(holder1);
            result = await vesting.release({ from: holder1 });

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

            await token.grantRole(ADMIN_ROLE, owner, { from: operator });
            await token.grantRole(CONTROLLER_ROLE, vesting.address, { from: owner });

            let result = await vesting.release({ from: holder1 });

            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 5);

            let vestedAmountAvailable = await vesting.vestedAmountAvailable({ from: holder1 });

            let rewardsTotal = await vesting.calculateRewardsTotal(holder1);
            result = await vesting.release({ from: holder1 });

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


    describe("Revoke Vesting", async () => {
        it("Should fail. User whose rights are revoked can't claim vesting amount", async () => {

            await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });

            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });
            await vesting.fundVesting(fundAmount, { from: operator });
            await vesting.revoke(holder1, { from: operator });
            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 366);

            try {
                await vesting.release({ from: holder1 });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. User without operator access attempts to revoke rights of other user.", async () => {

            await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });

            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });
            await vesting.fundVesting(fundAmount, { from: operator });


            try {

                await vesting.revoke(holder1, { from: holder2 });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })
    })


    describe("Reinstate Vesting", async () => {
        it("Should succeed. User whose rights are reinstated can claim vesting amount", async () => {

            await token.grantRole(CONTROLLER_ROLE, vesting.address, { from: operator });

            await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });

            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });
            await vesting.fundVesting(fundAmount, { from: operator });

            await vesting.revoke(holder1, { from: operator });
            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 367);
            await vesting.reinstate(holder1, { from: operator });
            let result = await vesting.release({ from: holder1 });

            assert.lengthOf(result.logs, 2);
            let event = result.logs[1];
            assert.equal(event.event, 'VestedPortionReleased');
            assert.equal(event.args.amount.toString(), fundAmount.toString());


        })


        it("Should fail. User without operator access attempts to reinstate rights to vest.", async () => {

            await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });

            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });
            await vesting.fundVesting(fundAmount, { from: operator });
            await vesting.revoke(holder1, { from: operator });


            try {
                await vesting.reinstate(holder1, { from: holder1 });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })


    })



    describe('events', async () => {

        it('should log Revoke after revoke', async () => {

            let result = await vesting.revoke(holder1, { from: operator });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'Revoke');
            assert.equal(event.args.user, holder1);
        })


        it('should log Reinstate after reinstate', async () => {

            let result = await vesting.reinstate(holder1, { from: operator });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'Reinstate');
            assert.equal(event.args.user, holder1);
        })

        it('should log VestingFunded after fundVesting', async () => {

            let result = await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'MemberFunded');
            assert.equal(event.args.amount.toString(), fundAmount);
        })

        it('should log MemberFunded after fundUser', async () => {

            let result = await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'MemberFunded');
            assert.equal(event.args.amount.toString(), fundAmount);
        })

        it('should log MemberFunded after fundUser', async () => {

            let result = await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'MemberFunded');
            assert.equal(event.args.amount.toString(), fundAmount);
        })

        it('should log StakingRewardsReleased after claimStake', async () => {


            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });
            await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });
            await vesting.fundVesting(fundAmount, { from: operator });
            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 367);

            let vestedAmountAvailable = await vesting.vestedAmountAvailable({ from: holder1 });

            await token.grantRole(CONTROLLER_ROLE, vesting.address, { from: operator });

            let rewardsTotal = await vesting.calculateRewardsTotal(holder1);
            let result = await vesting.release({ from: holder1 });

            assert.lengthOf(result.logs, 2);
            let event = result.logs[0];
            assert.equal(event.event, 'StakingRewardsReleased');
            assert.equal(event.args.amount.toString(), rewardsTotal.toString());

            event = result.logs[1];
            assert.equal(event.event, 'VestedPortionReleased');
            assert.equal(event.args.user, holder1);
            assert.equal(event.args.amount.toString(), vestedAmountAvailable.toString());
        })


        it('should log VestedPortionReleased after release', async () => {


            await token.increaseAllowance(vesting.address, fundAmount, { from: operator });
            await vesting.fundUserMultiple([holder1], [fundAmount], [0], { from: operator });
            await vesting.fundVesting(fundAmount, { from: operator });
            await timeMachine.advanceTimeAndBlock(60 * 60 * 24 * 60);
            await token.grantRole(CONTROLLER_ROLE, vesting.address, { from: operator });

            let vestedAmountAvailable = await vesting.vestedAmountAvailable({ from: holder1 });

            let result = await vesting.release({ from: holder1 });

            let event = result.logs[0];
            assert.equal(event.event, 'VestedPortionReleased');
            assert.equal(event.args.user, holder1);
            // assert.equal(event.args.amount.toString(), vestedAmountAvailable.toString());
        })


    })


})