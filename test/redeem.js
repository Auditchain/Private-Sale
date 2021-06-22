// import { platform } from 'ethers';
import {
    ensureException,
    duration
} from './helpers/utils.js';


import expectRevert from './helpers/expectRevert'

const TOKEN = artifacts.require('../AuditToken');
const REDEEM = artifacts.require('../DataSubClaim')


contract("Redeem contract", (accounts) => {

    const owner = accounts[0];
    const holder1 = accounts[1];
    const holder2 = accounts[2];
    const wallet = accounts[6];


    let token;
    let redeem;
    let sale;
    let fundingAmount = "15000000000000000000000000";
    let rateAfterFunding = "100000000000000000";
    let daiFunds = "3000000000000000000000";
    let stakingRatio = "10";
    let days366 = "31622400";   //366 days
    let cliff14 = "1209600";     //14 days
    let CONTROLLER_ROLE = web3.utils.keccak256("CONTROLLER_ROLE");


    beforeEach(async () => {

        token = await TOKEN.new(owner);
        redeem = await REDEEM.new(token.address);

        await token.grantRole(CONTROLLER_ROLE, redeem.address, { from: owner });

    })


    describe("Deploy", async () => {

        it("Should succeed. Redeem deployed and users initialized", async () => {

            redeem = await REDEEM.new(token.address);
            let firstUserAmount = await redeem.amounts(owner);
            assert.strictEqual(firstUserAmount.toString(), "2000000000000000000000");

        })
    })


    describe("Redeem", async () => {

        it("Should succeed. User should redeem their amount", async () => {


            let amountToRedeem = await redeem.amounts(holder1);
            let result = await redeem.redeem({ from: holder1 });

            assert.lengthOf(result.logs, 1);
            let event = result.logs[0];
            assert.equal(event.event, 'Redeemed');
            assert.equal(event.args.user, holder1);
            assert.equal(event.args.amount.toString(), "2000000000000000000000");

            let balance = await token.balanceOf(holder1);

            assert.equal(balance.toString(), amountToRedeem.toString());

        })

        it("Should fail. User shouldn't redeem because he/she is not registered", async () => {


            try {
                await redeem.redeem({ from: wallet });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })

        it("Should fail. User shouldn't redeem because he/she has already redeemed", async () => {

            await redeem.redeem({ from: holder1 });

            try {
                await redeem.redeem({ from: holder1 });
                expectRevert();
            } catch (error) {
                ensureException(error);
            }

        })

    })
})