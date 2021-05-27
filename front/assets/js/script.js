"use strict";





let buildDir, configDir, account, earningRatio, receipts, stakingTokenSymbol, stakingTokenName,
    stakedAmount, totalReward, userHoldingsAUDT, conversionStable_AUDT , userHoldingsGovToken,
    startBlock, endBlock, tokenAddress, stakingAddress, stakingReceipt, governanceToken, selectedCapsule = 1,
    govTokenRewardRatio, stakingStartTime, stakingEndTime, blockNumber, deploymentTime, deploymentStatus, chainId = "0x4";


const uniswapPriceCheckerAddress =   "0x010DfD042cCe198fDb38F1Fcaf6169594488C446";

// chainId = "0x539"

async function init() {

    await getAccount();

    
    try {
    let test = ethereum.isMetaMask;
    }catch (error) {
        showTimeNotification("top", "left", error);
    }
    // ethereum.autoRefreshOnNetworkChange = false;

    buildDir = "../../build/contracts/";
    configDir = "../../config/"
    selectedCapsule = 1;

    if (typeof window.web3 === 'undefined') {
        showTimeNotification("top", "left", "Please enable metamask.");
        $(".content").css("display", "none");
        return;
    }
    else if (ethereum.selectedAddress == undefined && ethereum.chainId != chainId) {
        showTimeNotification("top", "left", "You are connected to unsupported network.");
        $(".content").css("display", "none");
        return;
    } else if (ethereum.chainId != chainId) {
        showTimeNotification("top", "left", "You are connected to unsupported network.");
        $(".content").css("display", "none");
        return;
    } else if (ethereum.selectedAddress == undefined) {
        $(".enableEthereumButton").css("display", "block");
        $(".content").css("display", "none");
        return;
    }

    if (ethereum.selectedAddress != undefined) {
        console.log('MetaMask is installed!');

        getAccount(1);

        // var interval = setInterval(function () {
        //     loadPortfolio(selectedCapsule).then(function (res, err) {
        //         return displayProgress(selectedCapsule);
        //     }).catch(function (res) {

        //         console.log(res);
        //     })
        // }, 10000);
    } else {
        $(".enableEthereumButton").css("display", "block");
        $(".content").css("display", "none");
    }
}

function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // MetaMask is locked or the user has not connected any accounts
        console.log('Please connect to MetaMask.');
    } else if (accounts[0] !== account) {
        account = accounts[0];
    }
}

async function getAccount(capsuleNumber) {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    account = accounts[0];
    const showAccount = document.querySelector('.showAccount');
    $(".enableEthereumButton").css("display", "none");

    loadContract(1).then({
    }).then(function (res, err) {
        return loadPortfolio(selectedCapsule);
    }).then(function (res, err) {
        displayProgress(1);
    }).then(function () {
        $('#loading').hide();
    }).catch(function (res) {
        console.log(res);
    })
}


async function loadConfig(fileName) {

    return new Promise(function (resolve, reject) {

        let xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', configDir + fileName, true);
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
                //callback(xobj.responseText);
                resolve(xobj.responseText);
            }
        };
        xobj.send(null);
    })

}

async function loadContract(capsuleNumber) {


    let res = await loadConfig("capsule" + capsuleNumber + ".json");

    let actual_JSON = JSON.parse(res);
    const { AUDT_TOKEN_ADDRESS, STAKING_CONTRACT_ADDRESS, STAKING_RECEIPT, GOVERNANCE_TOKEN_ADDRESS, GOVERNANCE_TOKEN_REWARD_RATIO,
        STAKING_START_TIME, STAKING_END_TIME, DEPLOYMENT_TIME, DEPLOYMENT_STATUS } = actual_JSON;

    tokenAddress = AUDT_TOKEN_ADDRESS;
    stakingAddress = STAKING_CONTRACT_ADDRESS;
    stakingReceipt = STAKING_RECEIPT;
    governanceToken = GOVERNANCE_TOKEN_ADDRESS;
    stakingEndTime = STAKING_END_TIME;
    stakingStartTime = STAKING_START_TIME;
    deploymentTime = DEPLOYMENT_TIME;
    deploymentStatus = DEPLOYMENT_STATUS;
    let govTokenRewardRatioBig = GOVERNANCE_TOKEN_REWARD_RATIO;

    govTokenRewardRatio = new Decimal(Number(govTokenRewardRatioBig)).dividedBy(Math.pow(10,18));

}


async function populatePoolTable(capsuleNumber) {

    blockNumber = await promisify(cb => web3.eth.getBlockNumber(cb));

    // process price check contract
    let res = await loadJSON("UniswapPriceChecker.json");

    let actual_JSON = JSON.parse(res);
    let contract = web3.eth.contract(actual_JSON["abi"]);
    let priceCheckContractHandle = contract.at(uniswapPriceCheckerAddress);

    let stakingTokenValue = await promisify(cb => priceCheckContractHandle.getEstimatedTokenForDAI( Math.pow(10,18), capsuleNumber -1 ,cb));
    let governanceTokenValue = await promisify(cb => priceCheckContractHandle.getEstimatedTokenForDAI(Math.pow(10,18), 4 ,cb));
    let AUDTTokenValue  = await promisify(cb => priceCheckContractHandle.getEstimatedTokenForDAI(Math.pow(10,18), 5 ,cb));

    AUDTTokenValue = new Decimal(Number(AUDTTokenValue[0])).dividedBy(Math.pow(10,18)).toNumber();
    governanceTokenValue = new Decimal(Number(governanceTokenValue[0])).dividedBy(Math.pow(10,18)).toNumber();
    stakingTokenValue = new Decimal(Number(stakingTokenValue[0])).dividedBy(Math.pow(10,18)).toNumber();

    $("#tb-mission-reward").html((Number(totalReward)).formatMoney(2, ".", ","));
    $("#tb-mission-reward-usd").html((totalReward  * AUDTTokenValue).formatMoney(2, ".", ","));
    $("#tb-total-staked").html((Number(stakedAmount)).formatMoney(2, ".", ","));
    $("#tb-total-staked-usd").html((stakedAmount  * AUDTTokenValue).formatMoney(2, ".", ","));
    $("#tb-my-stake").html((Number(receipts)).formatMoney(2, ".", ","));
    $("#tb-my-stake-usd").html((receipts * AUDTTokenValue).formatMoney(2, ".", ","));

    $("#tb-current-reward").html((receipts *earningRatio).formatMoney(2, ".", ","));
    $("#tb-current-reward-usd").html((receipts * earningRatio * AUDTTokenValue  ).formatMoney(2, ".", ","));

    $("#tb-ratio").html((Number(earningRatio )).formatMoney(2, ".", ","));
    $("#tb-ratio-usd").html((earningRatio * AUDTTokenValue).formatMoney(2, ".", ","));
    $("#tb-governance-token").html((govTokenRewardRatio * receipts).formatMoney(2, ".", ",") + " DCAP");
    $("#tb-governance-token-usd").html((govTokenRewardRatio * receipts * governanceTokenValue).formatMoney(2, ".", ",") + " DAI");
    $("#tb-governance-token-issued").html("(Total DCAP Mined at Expiration&nbsp " + (govTokenRewardRatio * stakedAmount).formatMoney(2, ".", ",") + ")");

    $("#return-percentage").html(((Number(earningRatio)  - 1) * 100).formatMoney(2, ".", ",") + "%");
    $("#current-block").html("<b>Now Block:</b>" + blockNumber);
    $("#start-block").html("<b>Start Block:</b>" + startBlock);
    $("#end-block").html("<b>End Block:</b>" + endBlock);

    $("#dAudt-version").html("1 " + stakingTokenName +"=");
    $("#audt-dai").html(AUDTTokenValue.formatMoney(2, ".", ","));

}


async function loadPortfolio(selectedCapsule) {


    let progress = await updateCampaignProgress();

    // process staking contract
    let res = await loadJSON("Staking.json");

    let actual_JSON = JSON.parse(res);
    let contract = web3.eth.contract(actual_JSON["abi"]);
    let stakingContractHandle = contract.at(stakingAddress);

    let earningRatioBig = await promisify(cb => stakingContractHandle.returnEarningRatio(cb));

    earningRatio = new Decimal(Number(earningRatioBig)).dividedBy(Math.pow(10,18)); 

    // process staking token 
    res = await loadJSON("StakingToken.json");

    actual_JSON = JSON.parse(res);
    contract = web3.eth.contract(actual_JSON["abi"]);
    let stakingTokenContractHandle = contract.at(stakingReceipt);

    let receiptsBig = await promisify(cb => stakingTokenContractHandle.balanceOf(account, cb));
    stakingTokenSymbol = await promisify(cb => stakingTokenContractHandle.symbol(cb));
    stakingTokenName = await promisify(cb => stakingTokenContractHandle.name(cb));
    let earningsPerAmountBig = await promisify(cb => stakingContractHandle.returnEarningsPerAmount(receiptsBig, cb));
    let stakedAmountBig = await promisify(cb => stakingContractHandle.stakedAmount(cb));
    let totalRewardBig = await promisify(cb => stakingContractHandle.totalReward(cb));
    startBlock = await promisify(cb => stakingContractHandle.stakingDateStart(cb));
    endBlock = await promisify(cb => stakingContractHandle.stakingDateEnd(cb));

    totalReward = new Decimal(Number(totalRewardBig)).dividedBy(Math.pow(10,18)).toNumber(); 
    stakedAmount = new Decimal(Number(stakedAmountBig)).dividedBy(Math.pow(10,18)).toNumber(); 
    let earningsPerAmount = new Decimal(Number(earningsPerAmountBig)).dividedBy(Math.pow(10,18)).toNumber(); 

    // convert safely to decimal value
    receipts = new Decimal(Number(receiptsBig)).dividedBy(Math.pow(10,18)).toNumber(); 


    // process AUDT token

    res = await loadJSON("Token.json");
    actual_JSON = JSON.parse(res);
    contract = web3.eth.contract(actual_JSON["abi"]);
    let AUDTContractHandle = contract.at(tokenAddress);

    let userHoldingsAUDTBig = await promisify(cb => AUDTContractHandle.balanceOf(account, cb));

    userHoldingsAUDT = new Decimal(Number(userHoldingsAUDTBig)).dividedBy(Math.pow(10,18)); 


    // process Governance Token

    res = await loadJSON("GovernanceToken.json");
    actual_JSON = JSON.parse(res);
    contract = web3.eth.contract(actual_JSON["abi"]);
    let GovernanceContractHandle = contract.at(governanceToken);

    userHoldingsGovToken = await promisify(cb => GovernanceContractHandle.balanceOf(account, cb));

    $("#current-value").html(formatNumber(receipts) + " AUDT");
    $("#portfolio-value").html(formatNumber(earningsPerAmount) + " AUDT");
    $("#dcap-value").html((formatNumber(govTokenRewardRatio * receipts)) + " DCAP");
    $("#your-receipts").html(formatNumber(receipts) + " " + stakingTokenSymbol);
    // $("#taking-amount").attr("placeholder", "Enter amount of " + stakingTokenSymbol + " to redeem..");

    $("#stake-apr").html((Number(earningRatio)).formatMoney(2, ".", ","));
    $("#staking-amount").val("");
    $("#contribute").css("display", "none");
    $("#earned-amount").text("0.00 AUDT  ");

    $("#taking-amount").val("");
    $("#take").css("display", "none");
    $("#take-amount").text("0.00 AUDT  ");

    if (progress[0] <= 100) {
        $("#portfolio-value-to-take").html(formatNumber(receipts) + " AUDT");
        $("#dcap-to-take").html("0 DCAP");
        $("#take-apr").html("1.00");
        $("#staking-amount").attr("disabled", false);
    }
    else if (progress[1] <= 100) {

        $("#portfolio-value-to-take").html(formatNumber(receipts) + " AUDT");
        $("#dcap-to-take").html("0 DCAP");
        $("#take-apr").html("1.00");
        $("#staking-amount").attr("disabled", true);
    } else {
        $("#portfolio-value-to-take").html(formatNumber(earningsPerAmount) + " AUDT");      
        if (receipts > 0 )  {
            $("#dcap-to-take").html(formatNumber(govTokenRewardRatio * receipts) + " DCAP");
            $("#taking-amount").val(receipts);
            $("#take").css("display", "block");
        }else {
            $("#dcap-to-take").html("0 DCAP");
        }
        // $("#taking-amount").val(y.toString());
        $("#staking-amount").attr("disabled", true);

        $("#take-amount").html(formatNumber(earningsPerAmount) + " AUDT");
        $("#take-apr").html((Number(earningRatio)).formatMoney(2, ".", ","));
        // $("#take").css("display", "block");
    }

    $("#address").html(account.substring(1, 10) + "...");
    $("#holdings").html((Number(userHoldingsAUDT)).formatMoney(3, ".", ",") + " AUDT");
    $("#status").css("display", "block");
    $(".content").css("display", "block");

    populatePoolTable(selectedCapsule);
}


async function updateCampaignProgress() {

    let stakingPercentage;
    let blockNumber = await promisify(cb => web3.eth.getBlockNumber(cb));
    let depositPercentage = (blockNumber - deploymentTime) / (stakingStartTime - deploymentTime) * 100;

    if (depositPercentage >= 100) {
        stakingPercentage = (blockNumber - stakingStartTime) / (stakingEndTime - stakingStartTime) * 100;
        if (stakingPercentage <= 100) {
            $(".blink_me").css("display", "block");
            $(".blink_me").text("Staking in progress " + Math.round(stakingPercentage) + " %");
        }
        else {
            $(".blink_me").css("display", "block");
            $(".blink_me").text("Redeeming in progress ");
        }
    }
    else {

        $(".blink_me").css("display", "block");
        $(".blink_me").text("Deposits in progress " + Math.round(depositPercentage) + " %");
    }

    return [depositPercentage, stakingPercentage];
}

async function displayProgress(capsuleNumber) {

    let relativePercentageText;
    let relativeStakingPercentageText;
    let relativeRedeemPercentageText;
    let stakingPercentage = 0;
    let relativeStakingPercentage = 0;
    let relativeRedeemPercentage = 0;
    let redeemPercentage = 0;

    let blockNumber = await promisify(cb => web3.eth.getBlockNumber(cb));
    let depositPercentage = (blockNumber - deploymentTime) / (stakingStartTime - deploymentTime) * 100;
    let relativeDepositPercentage = Math.round(depositPercentage / 3);

    if (depositPercentage >= 100) {
        relativeDepositPercentage = 34;
        relativePercentageText = "100%";
        stakingPercentage = (blockNumber - stakingStartTime) / (stakingEndTime - stakingStartTime) * 100;
        relativeStakingPercentage = Math.round(stakingPercentage / 3) > 34 ? 34 : Math.round(stakingPercentage / 3);
        $("#contribute").attr("disabled", true);
        if (stakingPercentage >= 100) {
            relativeStakingPercentageText = "100%";
            relativeStakingPercentage = 33;
            redeemPercentage = (blockNumber + 1 - stakingEndTime) / (stakingEndTime + 10000 - stakingEndTime) * 100;
            relativeRedeemPercentage = Math.round(redeemPercentage / 3);
            relativeRedeemPercentageText = Math.round(redeemPercentage) + "%";
        } else {
            relativeStakingPercentageText = Math.round(stakingPercentage) + "%";
            relativeRedeemPercentageText = "";
        }
    } else {
        relativePercentageText = Math.round(depositPercentage) + "%";
        $("#contribute").attr("disabled", false);

    }

    $('#deposit-indicator ').css({ 'width': relativeDepositPercentage + "%" });
    $('#deposit-indicator ').text(relativePercentageText);
    $('#staking-indicator ').css({ 'width': relativeStakingPercentage + "%" });
    $('#staking-indicator ').text(relativeStakingPercentageText);

    $('#redeem-indicator ').css({ 'width': relativeRedeemPercentage + "%" });
    $('#redeem-indicator ').text(relativeRedeemPercentageText);
}

async function handleDeposit() {

    $("#message-status-body").html("");

    var sequence = Promise.resolve();

    sequence = sequence.then(function () {
    })
        .then(function (res) {
            return preauthorizeAUDT();
        }).then(function (res, err) {
            return depositAUDT();
        }).then(function (res, err) {
            return loadPortfolio(selectedCapsule);
        }).then(function (res, err) {
            return displayProgress(selectedCapsule);
        }).catch(function (res) {
            console.log(res);
            progressAction(res.message, 2, 2, true, true);
        })
}


function showTimeNotification(from, align, text) {

    let type = ['', 'info', 'success', 'warning', 'danger', 'rose', 'primary'];
    let color = Math.floor((Math.random() * 6) + 1);

    $.notify({
        icon: "notifications",
        message: text,
        allow_dismiss: true

    }, {
        type: type[color],
        timer: 1200,
        placement: {
            from: from,
            align: align
        }
    });
}


function preauthorizeAUDT(amount) {

    return new Promise(async function (resolve, reject) {
        let valueToStake, spendAddress, airdropAddress;
        let blockNum = await promisify(cb => web3.eth.getBlockNumber(cb));
        let res = await loadJSON("Token.json");
        let actual_JSON = JSON.parse(res);
        let contract = web3.eth.contract(actual_JSON["abi"]);
        let contractHandle = contract.at(tokenAddress);
        valueToStake = new Decimal(Number($("#staking-amount").val())).mul(Math.pow(10, 18));

        let id = progressAction("Pre authorizing AUDT tokens", 1, "", false, true);

        contractHandle.approve(stakingAddress, valueToStake, {
            from: account
        }, function (error, result) {
            if (!error) {
                console.log(result)

                let log = contractHandle.Approval({
                    owner: account,
                    spender: stakingAddress
                }, {
                    from: account,
                    fromBlock: blockNum,
                    toBlock: 'latest'
                });
                log.watch(async function (error, res) {

                    if (!error) {
                        progressAction("You have successfully authorized transfer of AUDT tokens", 2, id, false, false);
                        await promisify(cb => log.stopWatching(cb));
                    }
                    resolve(res);
                    log.stopWatching(function (error, res) { });
                });
            } else {
                console.error(error);
                reject(error);
            }
        });
    })
}

function depositAUDT() {

    return new Promise(async function (resolve, reject) {

        let blockNum = await promisify(cb => web3.eth.getBlockNumber(cb));
        let res = await loadJSON("Staking.json");
        let actual_JSON = JSON.parse(res);
        let contract = web3.eth.contract(actual_JSON["abi"]);
        let contractHandle = contract.at(stakingAddress);
        var valueToStake = new Decimal( $("#staking-amount").val()).mul( Math.pow(10, 18)).toNumber();
        var logValues;
        var id = progressAction("Staking AUDT", 1, "", false, false);

        contractHandle.stake(valueToStake, {
            from: account
        }, function (error, result) {
            if (!error) {
                console.log(result)
                var log = contractHandle.LogStakingTokensIssued({
                    to: account,
                    amount: valueToStake
                }, {
                    from: account,
                    fromBlock: blockNum,
                    toBlock: 'latest'
                });
                log.watch(function (error, res) {
                    if (!error) {
                        logValues = res;

                        log.stopWatching(function (error, res) {

                            if (res) {
                                progressAction("You have successfully deposited AUDT tokens and  have received " + ( Number(new Decimal(logValues.args.amount.toString()).dividedBy( Math.pow(10, 18)))).formatMoney(2, ".", ",") + " Staking Tokens.", 2, id, true);
                                resolve(res);
                                log.stopWatching(function (error, res) { });
                            }
                        });

                    } else {
                        console.error(error);
                        reject(error);
                    }
                });
            } else {
                console.error(error);
                reject(error);
            }
        });
    })
}


function redeem() {

    return new Promise(async function (resolve, reject) {


        let blockNum = await promisify(cb => web3.eth.getBlockNumber(cb));
        let res = await loadJSON("Staking.json");
        let actual_JSON = JSON.parse(res);
        let contract = web3.eth.contract(actual_JSON["abi"]);
        let contractHandle = contract.at(stakingAddress);
        let valueToRedeem = new Decimal($("#taking-amount").val()).mul( Math.pow(10, 18)).toNumber();
        let logValues;
        let id = progressAction("Redeeming " + $("#taking-amount").val() + " " + stakingTokenSymbol, 1, "", false, true);

        contractHandle.redeem(valueToRedeem, {
            from: account
        }, function (error, result) {
            if (!error) {
                console.log(result)
                var log = contractHandle.LogTokensRedeemed({
                    to: account,
                    amount: valueToRedeem
                }, {
                    from: account,
                    fromBlock: blockNum,
                    toBlock: 'latest'
                });
                log.watch(function (error, res) {
                    if (!error) {
                        logValues = res;

                        log.stopWatching(function (error, res) {

                            if (res) {
                                progressAction("You have successfully returned " + $("#taking-amount").val() + " " + stakingTokenSymbol + " and have received " + ( Number(new Decimal(logValues.args.amount.toString()).dividedBy( Math.pow(10, 18)))).formatMoney(2, ".", ",")  + " AUDT.", 2, id, true);
                                resolve(res);
                            }
                        });

                    } else {
                        console.error(error);
                        reject(error);
                    }
                });
            } else {
                console.error(error);
                reject(error);
            }
        });
    })
}



function loadJSON(fileName, callback) {

    return new Promise(function (resolve, reject) {

        let xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', buildDir + fileName, true);
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4 && xobj.status == "200") {
                // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
                //callback(xobj.responseText);
                resolve(xobj.responseText);
            }
        };
        xobj.send(null);
    })
}

function progressAction(msg, stage, id, last, first) {


    var spinner = ' <i class="fa fa-spinner fa-spin" style="font-size:28px;color:green"></i></br>';
    var check = ' <i class = "fa fa-check-circle-o" aria-hidden = "true" style="font-size:28px;color:green"> </i><br>';
    if (stage == 1) {
        var id = Math.floor((Math.random() * 1000) + 1);
        var message = msg + "<i id='" + id + "'>" + spinner + '</i>';
    } else if (stage == 2) {
        $('#' + id).html(check);
        message = msg + check
        if (last)
            message += 'Processing Done. ' + check;
    }
    if (first)
        $("#message-status-body").html("");
    $("#message-status-body").append(message);
    $("#progress").modal();
    return id;
}

const promisify = (inner) =>
    new Promise((resolve, reject) =>
        inner((err, res) => {
            if (err) {
                reject(err)
            }

            resolve(res);
        })
    );

Number.prototype.formatMoney = function (c, d, t) {
    var n = this,
        c = isNaN(c = Math.abs(c)) ? 2 : c,
        d = d == undefined ? "." : d,
        t = t == undefined ? "," : t,
        s = n < 0 ? "-" : "",
        i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
        j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};


function formatNumber(number) {
    number = number.toFixed(0) + '';
    var x = number.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}


// select clicked project
$(document).on("click", "#mission-table tr", async function (e) {

    console.log($(e.currentTarget).index());
    selectedCapsule = $(e.currentTarget).index();
    selectedCapsule++;
    let isDisabled = $('#m' + selectedCapsule).attr('disabled') ? true : false;

    if (!isDisabled) {

        $("#m" + selectedCapsule).prop("checked", true);
        $("#noticeModal").toggle();
        $("#noticeModal").modal('hide');

        $("#moonraker").html("MOONRAKER " + (selectedCapsule));
        loadContract(selectedCapsule).then({

        }).then(function (res, err) {
            return loadPortfolio(selectedCapsule);
        }).then(function (res, err) {
            return displayProgress(selectedCapsule);
        }).catch(function (res) {
            console.log(res);
        })
    }
})


ethereum.on('accountsChanged', function (accounts) {
    // Time to reload your interface with accounts[0]!
    $('#loading').show();
    console.log("accounts:" + accounts);
    if (accounts[0] == undefined) {
        console.log("disconnected no account");
        $("#status").css("display", "none");
        $(".enableEthereumButton").css("display", "block");
        $(".content").css("display", "none");
        $(".take").css("display", "none");
        $(".stake").css("display", "none");
    }
    else
        getAccount();
});

ethereum.on('chainChanged', function (chainIdCurrent) {
    // window.location.reload();
    $('#loading').show();
    if (chainIdCurrent != chainId) {
        showTimeNotification("top", "left", "You switched to unsupported network.");
        $(".enableEthereumButton").css("display", "none");
        $(".content").css("display", "none");


    } else if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
        getAccount(1);
    }
    console.log("chain id:" + chainId);
});


ethereum.on('disconnect', function (error) {

    console.log("Disconnected." + error);
})


$(document).ready(function () {


    $(".enableEthereumButton").click(function () {
        getAccount();
    })

    $("#staking-amount").keyup(function () {

        if (stakedAmount == undefined)
            stakedAmount = 1;

        let earningRatioTemp = 1 + (Number(totalReward) / (Number(stakedAmount) + (Number(this.value))));
        $('#stake-apr').text((earningRatioTemp).formatMoney(2, ".", ","));
        $('#earned-amount').text(((Number(this.value) * earningRatioTemp)).formatMoney(2, ".", ",") + " AUDT");

        if (Number(this.value) > userHoldingsAUDT ) {
            $("#msg-error-stake").css("background-color", "lightyellow");
            $("#msg-error-stake").html("Insufficient Balance.");
            $("#contribute").css("display", "none");
        }
        else {
            $("#msg-error-stake").css("background-color", "transparent");
            $("#msg-error-stake").html("");
            if (Number(this.value) > 0) {
                $("#contribute").css("display", "block");
            }
        }

    });

    $("#taking-amount").keyup(function () {

        if (Number(this.value) > receipts) {
            $("#msg-error-take").css("background-color", "lightyellow");
            $("#msg-error-take").html("Insufficient Balance.");
            $("#take").css("display", "none");
        }
        else {
            $("#msg-error-take").css("background-color", "transparent");
            $("#msg-error-take").html("");
            if (Number(this.value) > 0) {
                $("#take").css("display", "block");
                if (blockNumber - stakingEndTime >= 0)
                    $('#take-amount').text(((Number(this.value) * earningRatio)).formatMoney(2, ".", ",") + " AUDT");
                else
                    $('#take-amount').text((Number(this.value)).formatMoney(2, ".", ",") + " AUDT");
            }
            else 
            $("#take").css("display", "none");
        }
    });

    $("#contribute").click(function () {
        handleDeposit().then(function () {
        });
    });

    $("#take").click(function () {
        redeem().then(function () {
            return loadPortfolio(selectedCapsule);
        }).catch(function (res) {
            console.log(res);
            progressAction(res.message, 2, 2, true, true);
        });


    });

    $("#change-mission").click(async function () {
        let res = await loadConfig("deploymentStatus.json");
        let actual_JSON = JSON.parse(res);
        const { DEPLOYMENT_STATUS_1, DEPLOYMENT_STATUS_2, DEPLOYMENT_STATUS_3, DEPLOYMENT_STATUS_4, UNISWAP_PRICE_CHECKER } = actual_JSON;
        $("#capsule1-status").text(DEPLOYMENT_STATUS_1 ? "Deployed" : "Not Deployed");
        $("#capsule2-status").text(DEPLOYMENT_STATUS_2 ? "Deployed" : "Not Deployed");
        $("#capsule3-status").text(DEPLOYMENT_STATUS_3 ? "Deployed" : "Not Deployed");
        $("#capsule4-status").text(DEPLOYMENT_STATUS_4 ? "Deployed" : "Not Deployed");

        $("#m1").attr('disabled', DEPLOYMENT_STATUS_1 ? false : true);
        $("#m2").attr('disabled', DEPLOYMENT_STATUS_2 ? false : true);
        $("#m3").attr('disabled', DEPLOYMENT_STATUS_3 ? false : true);
        $("#m4").attr('disabled', DEPLOYMENT_STATUS_4 ? false : true);
        $("#noticeModal").modal();
    });


})


