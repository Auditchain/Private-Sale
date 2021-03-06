"use strict";


let buildDir, configDir, account, earningRatio, receipts, stakingTokenSymbol, stakingTokenName,

    tokenAddress,
    chainId = "0x539";
// chainId = "0x2a";


// chainId = "0x4";

let DAIAddress, oracleAddress, whitelistAddress, vestingAddress, saleAddress, tokenContract, DAIContract, oracleContract, saleContract, whitelistContract,
    vestingContract, daiRate, ethRate, tokensLeft, vestingContractChoice, fiftyPercentContractAddress, dataSubClaimContract;


// chainId = "0x539"

async function init() {

    // await getAccount();

    ethEnabled();
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    account = accounts[0];


    try {
        let test = ethereum.isMetaMask;
    } catch (error) {
        showTimeNotification("top", "left", error);
    }
    // ethereum.autoRefreshOnNetworkChange = false;

    buildDir = "../../build/contracts/";
    configDir = "../../config/"

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

        await getAccount(1);


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


async function renderPage() {
    if (window.location.href.indexOf("ClaimFiftyPercent") > 0)
        await displayFiftyPercent();

}

function claimVestedTokens() {

    return new Promise(async function (resolve, reject) {

        let id = progressAction("Claiming available vested tokens...", 1, "", false, true);

        vestingContractChoice.methods
            .release()
            .send({ from: account })
            .on("receipt", function (receipt) {
                const event = receipt.events.VestedPortionReleased.returnValues;
                const amountVested = event.amount;
                let event1;
                let amountStaked;

                if (receipt.events.StakingRewardsReleased != undefined) {
                    event1 = receipt.events.StakingRewardsReleased.returnValues;
                    amountStaked = event1.amount;
                }

                let msg = "You have successfully claimed: " + new Decimal(amountVested).dividedBy(Math.pow(10, 18)) + " AUDT tokens";
                if (receipt.events.StakingRewardsReleased != undefined)
                    msg = msg + "<BR>In addition you have received " + new Decimal(amountStaked).dividedBy(Math.pow(10, 18)) + "  staking reward AUDT tokens"

                progressAction(msg, 2, id, false, false);
                displayVestedData(vestingContractChoice);
                resolve(receipt);
            })
            .on("error", function (error) {
                progressAction(error.message, 2, id, false, false);
                reject(error);
            });
    });


}


function ClaimFiftyPercent() {

    return new Promise(async function (resolve, reject) {

        let id = progressAction("Claiming 50% of your early investor tokens...", 1, "", false, true);

        dataSubClaimContract.methods
            .redeem()
            .send({ from: account })
            .on("receipt", function (receipt) {
                const event = receipt.events.Redeemed.returnValues;
                const amountRedeemed = event.amount;

                let msg = "You have successfully claimed: " + new Decimal(amountRedeemed).dividedBy(Math.pow(10, 18)) + " AUDT tokens";

                progressAction(msg, 2, id, false, false);
                displayFiftyPercent();
                resolve(receipt);
            })
            .on("error", function (error) {
                progressAction(error.message, 2, id, false, false);
                reject(error);
            });
    });


}



async function displayFiftyPercent() {


    $("#contract-address").html(fiftyPercentContractAddress);


    // let blockBefore = await web3.eth.getBlock();
    // console.log("blockBefore:", blockBefore.timestamp);

    let tokensAvailable = (await dataSubClaimContract.methods.amounts(account).call({ from: account })) / Math.pow(10, 18);

    $("#all-tokens-purchased").html(tokensAvailable.toFixed(2));

    let claimed = await dataSubClaimContract.methods.redeemed(account).call({ from: account });

    if (!claimed && tokensAvailable) {
        $("#tokens-available").html(tokensAvailable.toFixed(2));
        $("#all-tokens-claimed").html("0.00");
        $('#claim-tokens-fifty-percent').prop('disabled', false);

    }
    else {
        $("#tokens-available").html("0.00");
        $("#all-tokens-claimed").html(tokensAvailable.toFixed(2));
        $('#claim-tokens-fifty-percent').prop('disabled', true);

    }

}

async function displayVestedData() {


    $("#contract-address").html(vestingContractChoice._address);


    // let blockBefore = await web3.eth.getBlock();
    // console.log("blockBefore:", blockBefore.timestamp);

    let tokensAvailable = (await vestingContractChoice.methods.vestedAmountAvailable().call({ from: account })) / Math.pow(10, 18);

    $("#vested-tokens-available").html(tokensAvailable.toFixed(2));





    let holderInfo = (await vestingContractChoice.methods.tokenHolders(account).call());

    var allTokensPurchased = holderInfo[0] / Math.pow(10, 18);
    var allTokensReleased = holderInfo[1] / Math.pow(10, 18);
    var allTokensLocked = allTokensPurchased - allTokensReleased;
    $("#all-tokens-purchased").html(allTokensPurchased.toFixed(2));
    $("#all-tokens-released").html(allTokensReleased.toFixed(2));
    $("#remaining-tokens").html(allTokensLocked.toFixed(2));

    let blockNumber = await web3.eth.getBlockNumber();
    let timeStamp = (await web3.eth.getBlock(blockNumber)).timestamp;



    let vestedAmountAvailable = await vestingContractChoice.methods.vestedAmount(holderInfo[0]).call();
    console.log(vestedAmountAvailable);
    // let blockBefore = await web3.eth.getBlock();
    // console.log("time stamp:", blockBefore.timestamp);


    let schedule = await vestingContractChoice.methods.returnVestingSchedule().call({ from: account });

    let stakingRewards = await vestingContractChoice.methods.calculateRewardsTotal(account).call();
    $("#staking-rewards").html((stakingRewards / Math.pow(10, 18)).toFixed(2));


    $("#vesting-schedule").html("<b>Vesting duration :</b>" + schedule[0] / 3600 + "(Hours) " + (schedule[0] / 86400).toFixed(2) + " days <br>");
    $("#vesting-schedule").append("<b>Vesting Cliff: </b>" + convertTimestamp(schedule[1]) + "<br>");
    $("#vesting-schedule").append("<b>Vesting begins </b>" + convertTimestamp(schedule[2]) + "<br>");
    $("#vesting-schedule").append("<b>Current Time </b>" + new Date() + "<br>");

    if (tokensAvailable == 0) {
        $('#claim-tokens').prop('disabled', true);
        $('#claim-stake').prop('disabled', true);
    } else {
        $('#claim-tokens').prop('disabled', false);

        if (Number(schedule[0]) + Number(schedule[2]) < Number(schedule[3]))
            $('#claim-stake').prop('disabled', false);
        else
            $('#claim-stake').prop('disabled', true);
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

const ethEnabled = async () => {
    if (window.ethereum) {
        window.web3 = new Web3(window.ethereum);
        window.ethereum.enable();

        return true;
    }
    return false;
};

async function getAccount() {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    account = accounts[0];
    const showAccount = document.querySelector('.showAccount');
    $(".enableEthereumButton").css("display", "none");

    loadContracts().then({
    }).then(function (res, err) {
        return loadInitialValues();
    }).then(function (res, err) {
        displayProgress();
    }).then(function (res, err) {


        var type = location.search.split('x=')[1];
        if (type == "s")
            vestingContractChoice = saleContract;
        else if (type = "e")
            vestingContractChoice = vestingContract;

        displayVestedData();
    }).then(function (res, err) {
        return checkWhitelisted();
    }).then(function (isWhitelisted) {
        if (isWhitelisted) {
            $('#loading').hide();
        }
        else
            $("#noticeModal").modal();
    }).then(function () {

        renderPage();

    }).catch(function (res) {
        console.log(res);
    })
}


async function loadInitialValues() {

    let exchangeRate = await oracleContract.methods.getEstimatedDAIForEth(web3.utils.toWei('1', 'ether')).call();
    let etherContributions = await saleContract.methods.weiRaised().call();
    let daiContributions = await saleContract.methods.DAIRaised().call();
    let rate = await saleContract.methods.rate().call();
    tokensLeft = await saleContract.methods.tokensLeft().call();


    tokensLeft = new Decimal(Number(tokensLeft.toString())).dividedBy(Math.pow(10, 18));
    exchangeRate = new Decimal(Number(exchangeRate[0].toString())).dividedBy(Math.pow(10, 18));
    etherContributions = new Decimal(Number(etherContributions.toString())).dividedBy(Math.pow(10, 18));
    daiContributions = new Decimal(Number(daiContributions.toString())).dividedBy(Math.pow(10, 18));
    rate = new Decimal(Number(rate.toString())).dividedBy(Math.pow(10, 18));
    daiRate = 1 / rate;

    ethRate = exchangeRate / rate;

    $("#exchange-rate-ether").html(Number(exchangeRate).formatMoney(4, ".", ","));
    $("#exchange-rate-dai").html(Number(exchangeRate).formatMoney(4, ".", ","));
    $("#ether-contributions-total").html(Number(etherContributions).formatMoney(4, ".", ",") + " ETH");
    $("#dai-contributions-total").html(Number(daiContributions).formatMoney(4, ".", ",") + " DAI");
    $("#rate-dai").html(Number(daiRate).formatMoney(2, ".", ",") + " AUDT/DAI");
    $("#rate-eth").html(Number(ethRate).formatMoney(2, ".", ",") + " AUDT/ETH   ");

    displayProgress();

}

async function checkWhitelisted() {

    let whitelisted = await whitelistContract.methods.isWhitelisted(account).call();
    return whitelisted;

}

function clearInputs() {

    $("#ether-contribution").val("");
    $("#dai-contribution").val("");

}


async function loadContracts() {

    let res = await loadConfig("contracts.json");

    let actual_JSON = JSON.parse(res);
    const { AUDT_TOKEN_ADDRESS, DAI_ADDRESS, ORACLE_ADDRESS, WHITELIST_ADDRESS, SALE_ADDRESS, VESTING_ADDRESS, REDEEM_ADDRESS } = actual_JSON;

    tokenAddress = AUDT_TOKEN_ADDRESS;
    DAIAddress = DAI_ADDRESS;
    oracleAddress = ORACLE_ADDRESS;
    whitelistAddress = WHITELIST_ADDRESS;
    saleAddress = SALE_ADDRESS;
    vestingAddress = VESTING_ADDRESS;
    fiftyPercentContractAddress = REDEEM_ADDRESS;


    res = await loadJSON("AuditToken.json");
    actual_JSON = JSON.parse(res);
    tokenContract = new web3.eth.Contract(actual_JSON["abi"], tokenAddress);

    res = await loadJSON("DAI.json");
    actual_JSON = JSON.parse(res);
    DAIContract = new web3.eth.Contract(actual_JSON["abi"], DAIAddress);

    res = await loadJSON("UniswapPriceOracle.json");
    actual_JSON = JSON.parse(res);
    oracleContract = new web3.eth.Contract(actual_JSON["abi"], oracleAddress);

    res = await loadJSON("WhiteList.json");
    actual_JSON = JSON.parse(res);
    whitelistContract = new web3.eth.Contract(actual_JSON["abi"], whitelistAddress);

    res = await loadJSON("Sale.json");
    actual_JSON = JSON.parse(res);
    saleContract = new web3.eth.Contract(actual_JSON["abi"], saleAddress);

    res = await loadJSON("Vesting.json");
    actual_JSON = JSON.parse(res);
    vestingContract = new web3.eth.Contract(actual_JSON["abi"], vestingAddress);

    res = await loadJSON("DataSubClaim.json");
    actual_JSON = JSON.parse(res);
    dataSubClaimContract = new web3.eth.Contract(actual_JSON["abi"], fiftyPercentContractAddress);

    // findCohorts();
}


async function claimStake() {

    return new Promise(async function (resolve, reject) {

        let id = progressAction("Claiming staked tokens...", 1, "", false, true);

        vestingContractChoice.methods
            .claimStake()
            .send({ from: account })
            .on("receipt", function (receipt) {
                const event = receipt.events.StakingRewardsReleased.returnValues;
                const amount = event.amount;

                progressAction(
                    "You have successfully claimed staking rewards: " + new Decimal(amount).dividedBy(Math.pow(10, 18)) + " AUDT tokens",
                    2,
                    id,
                    false,
                    false
                );
                displayVestedData(vestingContractChoice);
                resolve(receipt);
            })
            .on("error", function (error) {
                progressAction(error.message, 2, id, false, false);
                reject(error);
            });
    });



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

    let first, firstText, second, secondText, third, thirdText;

    if (tokensLeft <= 5000000) {
        first = 33;
        firstText = "100%";
        second = 33;
        secondText = "100%"
        third = (5000000 - tokensLeft) * 100 / 5000000 * 33 / 100;
        thirdText = (5000000 - tokensLeft) * 100 / 5000000;
    } else if (tokensLeft <= 10000000) {
        first = 33;
        firstText = "100%";
        second = (10000000 - tokensLeft) * 100 / 10000000 * 33 / 100;
        secondText = (10000000 - tokensLeft) * 100 / 10000000
        third = 0;
        thirdText = "0"
    } else {

        first = (15000000 - tokensLeft) * 100 / 15000000 * 33 / 100;
        firstText = (15000000 - tokensLeft) * 100 / 15000000;
        second = 0;
        secondText = "0"
        third = 0;
        thirdText = "0"
    }

    $('#deposit-indicator ').css({ 'width': first + "%" });
    $('#deposit-indicator ').text(firstText);
    $('#staking-indicator ').css({ 'width': second + "%" });
    $('#staking-indicator ').text(secondText);

    $('#redeem-indicator ').css({ 'width': third + "%" });
    $('#redeem-indicator ').text(thirdText);
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

function buyTokensForDai() {

    return new Promise(async function (resolve, reject) {
        let amountToSpend = new BigNumber($("#dai-contribution").val() * Math.pow(10, 18));
        let id = progressAction("Purchasing AUDT tokens...", 1, "", false, true);

        saleContract.methods
            .buyTokens(amountToSpend)
            .send({ from: account })
            .on("receipt", function (receipt) {
                const event = receipt.events.TokensPurchased.returnValues;
                const vestedAmount = new Decimal(event.vestedAmount).dividedBy(Math.pow(10, 18));
                const instantAmount = new Decimal(event.instantAmount).dividedBy(Math.pow(10, 18));

                let amountToShow = new Decimal(instantAmount).add(vestedAmount);


                progressAction(
                    "You have successfully purchased: " + formatNumber(amountToShow) + " AUDT tokens<br>" +
                    formatNumber(instantAmount) + " AUDT tokens have been delivered to your wallet (25%) and<br>" +
                    formatNumber(vestedAmount) + " AUDT tokens are vested (75%)",
                    2,
                    id,
                    false,
                    false
                );
                resolve(receipt);
            })
            .on("error", function (error) {
                progressAction(error.message, 2, id, false, false);
                reject(error);
            });
    });


}

function buyTokensForEth() {

    return new Promise(async function (resolve, reject) {
        let amountToSpend = $("#ether-contribution").val();
        amountToSpend = new Decimal(amountToSpend).mul(Math.pow(10, 18));

        amountToSpend = new BigNumber(amountToSpend);
        let id = progressAction("Purchasing AUDT tokens...", 1, "", false, true);

        saleContract.methods
            .buyTokens("0")
            .send({ value: amountToSpend, from: account })
            .on("receipt", function (receipt) {
                const event = receipt.events.TokensPurchased.returnValues;
                const vestedAmount = new Decimal(event.vestedAmount).dividedBy(Math.pow(10, 18));
                const instantAmount = new Decimal(event.instantAmount).dividedBy(Math.pow(10, 18));

                let amountToShow = new Decimal(instantAmount).add(vestedAmount);


                progressAction(
                    "You have successfully purchased: " + formatNumber(amountToShow) + " AUDT tokens<br>" +
                    formatNumber(instantAmount) + " AUDT tokens have been delivered to your wallet (25%) and<br>" +
                    formatNumber(vestedAmount) + " AUDT tokens are vested (75%)",
                    2,
                    id,
                    false,
                    false
                );
                resolve(receipt);
            })
            .on("error", function (error) {
                progressAction(error.message, 2, id, false, false);
                reject(error);
            });
    });


}

function preauthorizeDAI() {

    return new Promise(async function (resolve, reject) {
        let amountToSpend = new BigNumber($("#dai-contribution").val() * Math.pow(10, 18));

        let id = progressAction("Preauthorizing", 1, "", false, true);

        DAIContract.methods
            .approve(saleAddress, amountToSpend)
            .send({ from: account })
            .on("receipt", function (receipt) {
                progressAction("You have successfully authorized: " + Number(amountToSpend) / Math.pow(10, 18) + " DAI.", 2, id, false, false);
                resolve(receipt);
            })
            .on("error", function (error) {
                progressAction(error.message, 2, id, false, false);
                reject(error);
            });
    });
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


function enterFundingAmount() {


    return new Promise(async function (resolve, reject) {
        let beneficiary = $("#beneficiary").val();
        let amount = new BigNumber($("#amount").val() * Math.pow(10, 18));
        let staking;
        if ($('#no-stake').is(":checked"))
            staking = 1;
        else
            staking = 0

        let id = progressAction("Funding Member/Early Investor...", 1, "", false, true);

        vestingContractChoice.methods
            .allocateUserMultiple([beneficiary], [amount], [staking])
            .send({ from: account })
            .on("receipt", function (receipt) {
                const event = receipt.events.MemberFunded.returnValues;
                const amount = new Decimal(event.amount).dividedBy(Math.pow(10, 18));
                const beneficiary = event.beneficiary;



                progressAction(
                    "You have successfully funded: " + beneficiary + " with " + formatNumber(amount) + " AUDT tokens.",
                    2,
                    id,
                    false,
                    false
                );
                resolve(receipt);
            })
            .on("error", function (error) {
                progressAction(error.message, 2, id, false, false);
                reject(error);
            });
    });


}

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


function convertTimestamp(timestamp, onlyDate) {
    var d = new Date(timestamp * 1000), // Convert the passed timestamp to milliseconds
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2), // Months are zero based. Add leading 0.
        dd = ('0' + d.getDate()).slice(-2), // Add leading 0.
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2), // Add leading 0.
        sec = d.getSeconds(),
        ampm = 'AM',
        time;


    yyyy = ('' + yyyy).slice(-2);

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh == 0) {
        h = 12;
    }

    if (onlyDate) {
        time = mm + '/' + dd + '/' + yyyy;

    } else {
        // ie: 2013-02-18, 8:35 AM	
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;
        time = mm + '/' + dd + '/' + yyyy + '  ' + h + ':' + min + ':' + sec + ' ' + ampm;
    }

    return time;
}


$(document).ready(function () {


    $(".enableEthereumButton").click(function () {
        getAccount();
    })

    $("#dai-contribution").keyup(function () {

        $('#earned-amount').text(((Number(this.value) * daiRate)).formatMoney(2, ".", ",") + " AUDT");

        if ((Number(this.value) * daiRate) >= 1e6) {
            $("#msg-error-dai-contribution").css("background-color", "lightyellow");
            $("#msg-error-dai-contribution").html("You can purchase maximum 1 million AUDT tokens at a time");
            $("#contribute-dai").css("display", "none");
        }
        else if (Number(Number(this.value) * daiRate) > tokensLeft) {
            $("#msg-error-dai-contribution").css("background-color", "lightyellow");
            $("#msg-error-dai-contribution").html("Exceeded available supply. Maximum you can contribute is " + (tokensLeft / daiRate).formatMoney(2, ".", ",") + " DAI");
            $("#contribute-dai").css("display", "none");
        }
        else {
            $('#earned-amount').text(((Number(this.value) * daiRate)).formatMoney(2, ".", ",") + " AUDT");
            $("#msg-error-dai-contribution").css("background-color", "transparent");
            $("#msg-error-dai-contribution").html("");
            if (Number(this.value) > 0) {
                $("#contribute-dai").css("display", "block");
            }
        }

    });


    $("#ether-contribution").keyup(function () {

        $('#take-amount').text(((Number(this.value) * ethRate)).formatMoney(2, ".", ",") + " AUDT");

        if ((Number(this.value) * ethRate) >= 1e6) {
            $("#msg-error-eth-contribution").css("background-color", "lightyellow");
            $("#msg-error-eth-contribution").html("You can purchase maximum 1 million AUDT tokens at a time");
            $("#contribute-ether").css("display", "none");
        }

        else if ((Number(this.value) * ethRate) > tokensLeft) {
            $("#msg-error-eth-contribution").css("background-color", "lightyellow");
            $("#msg-error-eth-contribution").html("Exceeded available supply. Maximum you can contribute is " + (tokensLeft / ethRate).formatMoney(2, ".", ",") + " ETH");
            $("#contribute-ether").css("display", "none");
        }
        else {
            $('#take-amount').text(((Number(this.value) * ethRate)).formatMoney(2, ".", ",") + " AUDT");
            $("#msg-error-eth-contribution").css("background-color", "transparent");
            $("#msg-error-eth-contribution").html("");
            if (Number(this.value) > 0) {
                $("#contribute-ether").css("display", "block");
            }
        }

    });

    $("#contribute-dai").click(function () {
        preauthorizeDAI().then(function () {
            return buyTokensForDai();
        }).then(function (res, err) {
            loadInitialValues();
        }).then(function (res, err) {
            clearInputs();
        }).catch(function (res) {
            console.log(res);
            progressAction(res.message, 2, 2, true, true);
        });
    });


    $("#contribute-ether").click(function () {

        buyTokensForEth().then(function () {
        }).then(function (res, err) {
            loadInitialValues();
        }).then(function (res, err) {
            clearInputs();
        }).catch(function (res) {
            console.log(res);
            progressAction(res.message, 2, 2, true, true);
        });
    });


    $("#claim-tokens").click(function () {
        claimVestedTokens();
    });


    $("#fund").click(function () {
        enterFundingAmount();
    });


    $("#claim-stake").click(function () {
        claimStake();
    });


    $("#claim-tokens-fifty-percent").click(function () {
        ClaimFiftyPercent();
    });


})


