"use strict";
let buildDir, configDir, account, gasPrice, gasAmount, secondsInBlock;
let tokenAddress = "0x186071bCF4A904c2D75023FC09cF6f79e52513A1";
let stakingAddress = "0x5C4C8383f7929eFDA09816E7113f235e507e1fA6";
let stakingReceipt = "0xB39B82DcE6225f4a4a7915dAAe285bE449DEf7D1";

function init() {

    // let provider = (window.web3 && window.web3.currentProvider);


    if (typeof window.web3 === 'undefined') {
        showTimeNotification("top", "right", "Please enable metamask.")
    }
    // else if (ethereum.selectedAddress == undefined) {
    //     showTimeNotification("top", "right", "Please unlock metamask.")
    // }

    let test = ethereum.isMetaMask;

    gasPrice = 20000000000;
    gasAmount = 4000000;
    secondsInBlock = 14.05;
    buildDir = "../../build/contracts/";
    configDir = "../../config/"

    const ethereumButton = document.querySelector('.enableEthereumButton');
    const showAccount = document.querySelector('.showAccount');

    ethereumButton.addEventListener('click', () => {
        getAccount();
    });

    async function getAccount() {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        account = accounts[0];
        showAccount.innerHTML = account;
        loadStats();

    }




    ethereum.on('accountsChanged', function (accounts) {
        // Time to reload your interface with accounts[0]!
        console.log("accounts:" + accounts);
    });

    if (typeof window.ethereum !== 'undefined') {
        console.log('MetaMask is installed!');
    }

    // loadStats();
    displayProgress();



    // whichNetwork();  
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

async function displayProgress() {

    let relativePercentageText ;
    let relativeStakingPercentageText;
    let relativeRedeemPercentageText;
    let stakingPercentage;
    let relativeStakingPercentage ;  
    let relativeRedeemPercentage ;
    let redeemPercentage ;
    

    let res = await loadConfig("airdrop1.json");
    let actual_JSON = JSON.parse(res);
    const { STAKING_START_TIME, STAKING_END_TIME, DEPLOYMENT_TIME } = actual_JSON;
    let blockNumber = await promisify(cb => web3.eth.getBlockNumber(cb));


    let depositPercentage = (blockNumber - DEPLOYMENT_TIME) / (STAKING_START_TIME - DEPLOYMENT_TIME) * 100;
    let relativeDepositPercentage = Math.round(depositPercentage / 3);
    
    if (depositPercentage >= 100) {
        relativeDepositPercentage = 34;
        relativePercentageText = "100%";
        stakingPercentage = (blockNumber - STAKING_START_TIME) / (STAKING_END_TIME - STAKING_START_TIME) * 100; 
        relativeStakingPercentage = Math.round(stakingPercentage / 3);
        $("#contribute").attr("disabled", true);
        if (stakingPercentage >= 100){
            relativeStakingPercentageText = "100%";
            relativeStakingPercentage = 33;
            redeemPercentage = (blockNumber + 1  - STAKING_END_TIME) / (STAKING_END_TIME + 10000 - STAKING_END_TIME ) * 100;
            relativeRedeemPercentage = Math.round(redeemPercentage / 3);
            relativeRedeemPercentageText = Math.round(redeemPercentage) + "%";
            

        }else{
            relativeStakingPercentageText = Math.round(stakingPercentage) + "%";
            relativeRedeemPercentageText = "";
        }
    } else{
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

async function loadStats() {


    displayProgress();
    let spinner = ' <i class="fa fa-spinner fa-spin" style="font-size:24px;color:green"></i></br>';

    $("#total-staked").html(spinner);

    

    let res = await loadJSON("Staking.json");

    let actual_JSON = JSON.parse(res);
    let contract = web3.eth.contract(actual_JSON["abi"]);
    let contractHandle = contract.at(stakingAddress);

    res = await loadJSON("Token.json");
    actual_JSON = JSON.parse(res);
    contract = web3.eth.contract(actual_JSON["abi"]);
    let tokenHandle = contract.at(tokenAddress);




    let stakedAmount = await promisify(cb => contractHandle.stakedAmount(cb));
    let deposits = await promisify(cb => contractHandle.deposits(account, cb));
    let released = await promisify(cb => contractHandle.released(account, cb));
    let stakingDateStart = await promisify(cb => contractHandle.stakingDateStart(cb));
    let stakingDateEnd = await promisify(cb => contractHandle.stakingDateEnd(cb));
    let blockNumber = await promisify(cb => web3.eth.getBlockNumber(cb));
    let rewards = await promisify(cb => contractHandle.totalReward(cb));
    let earningRatio = await promisify(cb => contractHandle.returnEarningRatio(cb));
    let earningsPerAmount = await promisify(cb => contractHandle.returnEarningsPerAmount(deposits, cb));
    let totalReleased = await promisify(cb => contractHandle.totalReleased(cb));
    let totalCancelled = await promisify(cb => contractHandle.totalCancelled(cb));
    let balanceOfStaking = await promisify(cb => tokenHandle.balanceOf(stakingAddress, cb));
    let balanceOfAUDT = await promisify(cb => tokenHandle.balanceOf(account, cb));



    // if (earningRatio > 10 * Math.pow(10,18))
    earningRatio = earningRatio / Math.pow(10, 18)

    let lengthOfEarningsRatio = earningRatio.toString().length;
    let toClaim = (Number(deposits) / Math.pow(10, 18) - (Number(released) / Number(earningRatio) / Math.pow(10, 18)));

    if (toClaim == 0)
        $("#redeem").attr("disabled", true);
    else
    $("#redeem").attr("disabled", false);




    $("#rewards").html(formatNumber(Number(rewards / Math.pow(10, 18))));
    $("#earning-ratio").html(Number(earningRatio));
    $("#to-claim").html(formatNumber(toClaim));
    $("#total-staked").html(formatNumber(Number(stakedAmount) / Math.pow(10, 18)));
    $("#your-contribution").html(formatNumber(Number(deposits) / Math.pow(10, 18)));
    $("#return").html(formatNumber(Number(earningsPerAmount) / Math.pow(10, 18)));
    $("#current-block").html(formatNumber(Number(blockNumber)));
    $("#start-block").html(formatNumber(Number(stakingDateStart)));
    $("#end-block").html(formatNumber(Number(stakingDateEnd)));
    $("#total-released").html(formatNumber(Number(totalReleased) / Math.pow(10, 18)));
    $("#total-cancelled").html(formatNumber(Number(totalCancelled) / Math.pow(10, 18)));
    $("#contract-balance").html(formatNumber(Number(balanceOfStaking) / Math.pow(10, 18)));

    $("#token-balance").html(formatNumber(Number(balanceOfAUDT) / Math.pow(10, 18)));

    $("#spinner").html("");

}

async function handleDeposit() {
    //  e.preventDefault();

    $("#message-status-body").html("");

    var sequence = Promise.resolve();

    sequence = sequence.then(function () {
        // return checkMetamaskStatus();

    })
        .then(function (res) {
            return preauthorizeAUDT();
        }).then(function (res, err) {
            return depositAUDT();
        }).then(function (res, err) {
            return loadStats();
        }).catch(function (res) {

            console.log(res);
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
        valueToStake = Number($("#amount-to-stake-redeem").val()) * Math.pow(10, 18);

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


        var valueToStake = $("#amount-to-stake-redeem").val() * Math.pow(10, 18);
        var logValues;
        var id = progressAction("Staking AUDT", 1, "", false, true);

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
                                progressAction("You have successfully deposited AUDT tokens and  have received " + (logValues.args.amount / Math.pow(10, 18)).formatMoney(2, ".", ",") + " Staking Tokens.", 2, id, true);
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


        var valueToRedeem = $("#amount-to-stake-redeem").val() * Math.pow(10, 18);
        var logValues;
        var id = progressAction("Redeeming AUDT", 1, "", false, true);

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
                                progressAction("You have successfully redeemed AUDT tokens and  have received " + (logValues.args.amount / Math.pow(10, 18)).formatMoney(2, ".", ",") + " AUDT Tokens.", 2, id, true);
                                loadStats();
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

// $(document).on('click', '#contribute', function (e) {
//     //prevent the form from doing a submit
//     // e.preventDefault();

//     handleAUDT();

// });



$(document).ready(function () {

    $("#contribute").click(function () {

        handleDeposit().then(function () {

        });
    });

    $("#redeem").click(function () {

        redeem().then(function () {

        });
    });

})


