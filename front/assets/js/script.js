"use strict";


let buildDir, configDir, account, earningRatio, receipts, stakingTokenSymbol, stakingTokenName,

    tokenAddress, chainId = "0x539";

// chainId = "0x4";

let DAIAddress, oracleAddress, whitelistAddress, saleAddress, tokenContract, DAIContract, oracleContract, saleContract, whitelistContract,
    daiRate, ethRate, tokensLeft;


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
        return checkWhitelisted();
    }).then(function (isWhitelisted) {
        if (isWhitelisted)
            $('#loading').hide();
        else
            $("#noticeModal").modal();
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
    const { AUDT_TOKEN_ADDRESS, DAI_ADDRESS, ORACLE_ADDRESS, WHITELIST_ADDRESS, SALE_ADDRESS } = actual_JSON;

    tokenAddress = AUDT_TOKEN_ADDRESS;
    DAIAddress = DAI_ADDRESS;
    oracleAddress = ORACLE_ADDRESS;
    whitelistAddress = WHITELIST_ADDRESS;
    saleAddress = SALE_ADDRESS;


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

    res = await loadJSON("Crowdsale.json");
    actual_JSON = JSON.parse(res);
    saleContract = new web3.eth.Contract(actual_JSON["abi"], saleAddress);



    // findCohorts();
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
                const amount = event.amount;

                // amountToShow = new Decimal(Number(amount.toString())).dividedBy(Math.pow(10, 18));
                let amountToShow = new Decimal(amount).dividedBy(Math.pow(10, 18))

                progressAction(
                    "You have successfully purchased: " + amountToShow + " AUDT tokens",
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
                const amount = event.amount;

                progressAction(
                    "You have successfully purchased: " + new Decimal(amount).dividedBy(Math.pow(10, 18)) + " AUDT tokens",
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


$(document).ready(function () {


    $(".enableEthereumButton").click(function () {
        getAccount();
    })

    $("#dai-contribution").keyup(function () {

        if (Number(Number(this.value) * daiRate) > tokensLeft) {
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

        if (Number(Number(this.value) * ethRate) > tokensLeft) {
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

})


