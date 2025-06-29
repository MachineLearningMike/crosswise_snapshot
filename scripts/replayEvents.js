const hre = require("hardhat");
const { getHeapSnapshot } = require("v8");
const abi_crss = require("../_supporting/abi_crss.json");
var theOwner, Alice, Bob, Charlie;
const DECIMALS = 18;
const INITIAL_SUPPLY = 50000000 * 10 ** DECIMALS;
var CRSSToken;

const zero_address = "0x0000000000000000000000000000000000000000";
const attackTxHash = 0xd02e444d0ef7ff063e3c2cecceba67eae832acf3f9cf817733af9139145f479b;
const knownAccounts = {
    CRSS_BNB: 0xb5d85cA38a9CbE63156a02650884D92A6e736DDC,
    CRSS_BUSD: 0xB9B09264779733B8657b9B86970E3DB74561c237,
    BNB_BUSD: 0x290E1ad05b4D906B1E65B41e689FC842C9962825,
    USDT_BUSD: 0xef5be81A2B5441ff817Dc3C15FEF0950DD88b9bD,
    BNB_ETH: 0x8151D70B5806E3C957d9deB8bbB01352482a4741,
    BNB_BTCB: 0x9Ba0DcE71930E6593aB34A1EBc71C5CebEffDeAF,
    BNB_CAKE: 0x0458498C2cCbBe4731048751896A052e2a5CC041,
    BNB_ADA: 0xDE0356A496a8d492431b808c758ed5075Dd85040,
    BNB_DOT: 0xCB7Ad3af3aE8d6A04ac8ECA9a77a95B2a72B06DE,
    BNB_LINK: 0x278D7d1834E008864cfB247704cF34a171F39a2C,
    CRSS_BUSD: 0xB9B09264779733B8657b9B86970E3DB74561c237,
    BNB_BUSD: 0x290E1ad05b4D906B1E65B41e689FC842C9962825,
    USDT_BUSD: 0xef5be81A2B5441ff817Dc3C15FEF0950DD88b9bD,
    BNB_ETH: 0x8151D70B5806E3C957d9deB8bbB01352482a4741,
    BNB_BTCB: 0x9Ba0DcE71930E6593aB34A1EBc71C5CebEffDeAF,
    BNB_CAKE: 0x0458498C2cCbBe4731048751896A052e2a5CC041,
    BNB_ADA: 0xDE0356A496a8d492431b808c758ed5075Dd85040,
    BNB_DOT: 0xCB7Ad3af3aE8d6A04ac8ECA9a77a95B2a72B06DE,
    BNB_LINK: 0x278D7d1834E008864cfB247704cF34a171F39a2C,
    PRESALE: 0x0999ba9aEA33DcA5B615fFc9F8f88D260eAB74F1,
    CRSSV1: 0x55eCCd64324d35CB56F3d3e5b1544a9D18489f71,
    CRSSV11: 0x99FEFBC5cA74cc740395D65D384EDD52Cb3088Bb,
    ROUTER: 0x8B6e0Aa1E9363765Ea106fa42Fc665C691443b63,
    MASTER: 0x70873211CB64c1D4EC027Ea63A399A7d07c4085B,
    XCRSS: 0x27DF46ddd86D9b7afe3ED550941638172eB2e623
};


var userAccounts;

library = require("./library");

async function main() {
    [theOwner, Alice, Bob, Charlie] = await ethers.getSigners();

    filename = "./_snapshot/CRSSV11.txt";
    var transferEvents = getArrayOfArraysFromText(filename);
    console.log("length = %s".yellow, transferEvents.length);

    // var preAttackAccounts, attackAccounts, postAttackAccounts, attackTransfers;
    var { preAttackBalances, attackBalances, postAttackBalances, attackTransfers }
        = await replayTransferEvents(18, transferEvents, INITIAL_SUPPLY, theOwner);

    console.log("================== preAttackBalances %s, attackBalances %s, postAttackBlances %s attackTransfers %s".yellow,
        preAttackBalances.length, attackBalances.length, postAttackBalances.length, attackTransfers.length);

    writeTransfersToExcel(attackTransfers, "./_snapshot/CRSSV11_attack_transfers.csv");

    var attackChanges = findBalancesChange(preAttackBalances, attackBalances);
    writeBalancesToExcel(attackChanges, "./_snapshot/CRSSV11_attack_changes.csv");

    var union = unionBalances(preAttackBalances, attackBalances);
    var postAttackChanges = findBalancesChange(postAttackBalances, union);
    writeBalancesToExcel(postAttackChanges, "./_snapshot/CRSSV11_postAttack_changes.csv");

    console.log("================== Finished ===================".yellow,);
}

function getArrayOfArraysFromText(filename) {
    fs = require('fs');
    const data = fs.readFileSync(filename, 'utf8');
    console.log("Length = %s", data.split("blockNumber").length);
    var array = JSON.parse(data);
    return array;
}

async function replayTransferEvents(decimals, transferEvents, initialSupply, owner) {
    library.DECIMALS = decimals;

    console.log("\tDeploying transferEmulator...".yellow, theOwner);
    const TransferEmulator = await ethers.getContractFactory("TransferEmulator", theOwner);
    transferEmulator = await TransferEmulator.deploy("NoName", "NoSymbol", decimals, BigInt(initialSupply), owner.address);
    var _decimals = await transferEmulator.decimals();
    library.DECIMALS = _decimals;
    var totalSupply = await transferEmulator.totalSupply();
    console.log("\ttransferEmulator was deployed with initial total supply: %s ETH, decimals: %s".yellow, library.weiToEthEn(totalSupply), _decimals);
    console.log("\ttransferEmulator deployed at: %s".yellow, transferEmulator.address);

    var preAttackAccounts = [], attackAccounts = [], postAttackAccounts = [];
    var preAttackBalances = [], attackBalances = [], postAttackBalances = [];
    var attackTransfers = [];

    var state = 'preAttack';
    for (var n = 0; n < transferEvents.length; n++) {
        // for (var n = 0; n < 10; n++) {
        var sender = transferEvents[n].args[0];
        var recipient = transferEvents[n].args[1];
        var amount = transferEvents[n].args[2];
        var txhash = transferEvents[n].transactionHash;

        if (state == 'inAttack') {
            console.log("inAttack hash", transferEvents[n].transactionHash, n);
        }

        if (transferEvents[n].transactionHash == attackTxHash) {
            if (state != 'inAttack') { // preAttack finished.
                preAttackBalances = await takeSnapshot(preAttackAccounts, "./_snapshot/CRSSV11_ending_preAttack.csv");
            }
            state = 'inAttack';
            if (!attackAccounts.includes(sender)) {
                attackAccounts.push(sender);
                console.log("inAttack s", sender);
            }
            if (!attackAccounts.includes(recipient)) {
                attackAccounts.push(recipient);
                console.log("inAttack r", recipient);
            }
            attackTransfers.push([sender, recipient, amount]);

        } else if (state == 'inAttack') { // attack finished.
            attackBalances = await takeSnapshot(attackAccounts, "./_snapshot/CRSSV11_ending_attack.csv");
            state = 'postAttack';

        } else if (state == 'preAttack') { // preAttack
            if (!preAttackAccounts.includes(sender)) preAttackAccounts.push(sender);
            if (!preAttackAccounts.includes(recipient)) preAttackAccounts.push(recipient);

        } else if (state == 'postAttack') { // postAttack
            if (!postAttackAccounts.includes(sender)) postAttackAccounts.push(sender);
            if (!postAttackAccounts.includes(recipient)) postAttackAccounts.push(recipient);
        }

        console.log(sender, recipient, state, txhash, n);

        if (n < transferEvents.length - 1) { //------------------------------------------------------ i give up.
            // if (n < 100 - 1) { //------------------------------------------------------ i give up.
            try {
                var tx = await transferEmulator.transferPassive(sender, recipient, amount);
                await tx.wait();
            } catch (e) {
                console.log("\n\nError: ", e, sender, "\n", recipient, amount, "\n\n")
            }
        }
    }

    var tx = await transferEmulator.transferPassive(zero_address, zero_address, BigInt(0));
    await tx.wait();

    postAttackBalances = await takeSnapshot(postAttackAccounts, "./_snapshot/CRSSV11_ending_postAttack.csv");

    return { preAttackBalances, attackBalances, postAttackBalances, attackTransfers };
}

async function takeSnapshot(accounts, filename) {
    try {
        var balances = await readBalances(accounts);
        writeBalancesToExcel(balances, filename);
        console.log("takeSnapshot. balances %s, filename %s".yellow, balances.length, filename);
        return balances;
    } catch (err) {
        console.log("Snapshot Error".red, err)
    }
}

async function readBalances(userAccounts) {
    var balances = [];
    for (var n = 0; n < userAccounts.length; n++) {
        var account = userAccounts[n];
        try {
            var balance = await transferEmulator.balanceOf(account);
        } catch (err) {
            console.log("Read Balance Error".red, err)
        }
        balances.push([account, balance]);
    }
    return balances;
}

function findBalancesChange(balances0, balances1) {
    var changes = [];
    for (var n = 0; n < balances1.length; n++) {
        var balance = balances1[n];
        var account = balance[0];
        var amount1 = balance[1];
        var amount0 = 0;
        for (var k = 0; k < balances0.length; k++) {
            if (balances0[k][0] == account) {
                amount0 = balances0[k][1];
                break;
            }
        }
        changes.push([account, amount1.sub(amount0)]);
    }
    return changes;
}

function unionBalances(balances0, balances1) {
    for (var n = 0; n < balances1.length; n++) {
        var balance = balances1[n];
        var account = balance[0];
        var amount1 = balance[1];
        var found = false
        for (var k = 0; k < balances0.length; k++) {
            if (balances0[k][0] == account) {
                balances0[k][1] = balances0[k][1] + amount1;
                found = true;
                break;
            }
        }
        if (!found) {
            balances0.push([account, amount1]);
        }
    }
    return balances0;
}

function writeBalancesToExcel(balances, filename) {

    var csv = 'Account, Contract, Balance_wei, Balance_CRSS\n';
    balances.forEach(function (row) {
        console.log(row)
        if (true) {  //row[1] != 0 ) {
            csv += `${row[0]}, `;

            var contract = " ";
            for (i = 0; i < Object.values(knownAccounts).length; i++) {
                if (row[0] == Object.values(knownAccounts)[i]) {
                    contract = Object.keys(knownAccounts)[i];
                    break;
                }
            }
            csv += contract + ",";
            try {
                csv += ` ${row[1]},`;
                csv += ` ${library.weiToEth(row[1])},`;
                csv += "\n";
            } catch (err) {
                console.log("Wei To Eth Error".red, err, "\n", row)
            }
        }
    });

    fs.writeFileSync(filename, csv);
}


function writeTransfersToExcel(transfers, filename) {

    var csv = 'Sender, Contract, Recipient, Contract, Amount_wei, Amount_CRSS\n';
    transfers.forEach(function (row) {
        if (true) {  //row[1] != 0 ) {
            csv += `${row[0]}, `;
            var contract = " ";
            for (i = 0; i < Object.values(knownAccounts).length; i++) {
                if (row[0] == Object.values(knownAccounts)[i]) {
                    contract = Object.keys(knownAccounts)[i];
                    break;
                }
            }
            csv += contract + ",";

            csv += `${row[1]}, `;
            var contract = " ";
            for (i = 0; i < Object.values(knownAccounts).length; i++) {
                if (row[1] == Object.values(knownAccounts)[i]) {
                    contract = Object.keys(knownAccounts)[i];
                    break;
                }
            }
            csv += contract + ",";
            try {
                csv += ` ${Number(row[2].hex)},`;
                csv += ` ${library.weiToEth(row[2].hex)},`;
                csv += "\n";
            } catch (err) {
                console.log("Wei To Eth Error".red, err, "\n", row, row[2])

            }
        }
    });

    fs.writeFileSync(filename, csv);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
