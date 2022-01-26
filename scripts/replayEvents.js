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
    CRSS_BUSD:0xB9B09264779733B8657b9B86970E3DB74561c237,
    BNB_BUSD : 0x290E1ad05b4D906B1E65B41e689FC842C9962825,
    USDT_BUSD : 0xef5be81A2B5441ff817Dc3C15FEF0950DD88b9bD,
    BNB_ETH : 0x8151D70B5806E3C957d9deB8bbB01352482a4741,
    BNB_BTCB : 0x9Ba0DcE71930E6593aB34A1EBc71C5CebEffDeAF,
    BNB_CAKE : 0x0458498C2cCbBe4731048751896A052e2a5CC041,
    BNB_ADA : 0xDE0356A496a8d492431b808c758ed5075Dd85040,
    BNB_DOT : 0xCB7Ad3af3aE8d6A04ac8ECA9a77a95B2a72B06DE,
    BNB_LINK : 0x278D7d1834E008864cfB247704cF34a171F39a2C,
    CRSS_BUSD : 0xB9B09264779733B8657b9B86970E3DB74561c237,
    BNB_BUSD : 0x290E1ad05b4D906B1E65B41e689FC842C9962825,
    USDT_BUSD : 0xef5be81A2B5441ff817Dc3C15FEF0950DD88b9bD,
    BNB_ETH : 0x8151D70B5806E3C957d9deB8bbB01352482a4741,
    BNB_BTCB : 0x9Ba0DcE71930E6593aB34A1EBc71C5CebEffDeAF,
    BNB_CAKE : 0x0458498C2cCbBe4731048751896A052e2a5CC041,
    BNB_ADA : 0xDE0356A496a8d492431b808c758ed5075Dd85040,
    BNB_DOT : 0xCB7Ad3af3aE8d6A04ac8ECA9a77a95B2a72B06DE,
    BNB_LINK : 0x278D7d1834E008864cfB247704cF34a171F39a2C,
    PRESALE : 0x0999ba9aEA33DcA5B615fFc9F8f88D260eAB74F1,
    CRSSV1 : 0x55eCCd64324d35CB56F3d3e5b1544a9D18489f71,
    CRSSV11 : 0x99FEFBC5cA74cc740395D65D384EDD52Cb3088Bb,
    ROUTER : 0x8B6e0Aa1E9363765Ea106fa42Fc665C691443b63,
    MASTER : 0x70873211CB64c1D4EC027Ea63A399A7d07c4085B,
    XCRSS : 0x27DF46ddd86D9b7afe3ED550941638172eB2e623
};


var userAccounts;

library = require("./library");

async function main() {

    [theOwner, Alice, Bob, Charlie] = await ethers.getSigners();

    filename = "./_snapshot/CRSSV11.txt";
    var transferEvents = getArrayOfArraysFromText(filename);
    console.log("length = %s".yellow, transferEvents.length, transferEvents[2]);

    var preAttackAccounts, attackAccounts, postAttackAccounts, attackTransfers;
    var preAttackBalances, attackBalances, postAttackBalances, attackTransfers
    [preAttackBalances, attackBalances, postAttackBalances, attackTransfers] 
    = await replayTransferEvents(18, transferEvents, INITIAL_SUPPLY, theOwner);

    writeTransfersToExcel(attackTransfers, "./_snapshot/CRSSV11_attack_transfers.csv");
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

    console.log("\tDeploying transferEmulator...".yellow);
    const TransferEmulator = await ethers.getContractFactory("TransferEmulator", theOwner);
    transferEmulator = await TransferEmulator.deploy("NoName", "NoSymbol", decimals, BigInt(initialSupply), owner.address);
    var _decimals = await transferEmulator.decimals();
    var totalSupply = await transferEmulator.totalSupply();
    console.log("\ttransferEmulator was deployed with initial total supply: %s ETH, decimals: %s".yellow, library.weiToEthEn(totalSupply), _decimals);
    console.log("\ttransferEmulator deployed at: %s".yellow, transferEmulator.address);

    var preAttackAccounts = [], attackAccounts = [], postAttackAccounts = [];
    var preAttackBalances, attackBalances, postAttackBalances;
    var attackTransfers = [];

    var state = 'preAttack';
    for(index = 0; index < transferEvents.length; index ++) {
    //for(index = 0; index < 100; index ++) {
        var sender = transferEvents[index].args[0];
        var recipient = transferEvents[index].args[1];
        var amount = transferEvents[index].args[2];

        if(transferEvents[index].transactionHash == attackTxHash ) {
            if (state != 'inAttack') { // pre-attack finished.
                preAttackBalances = takeSnapshot(preAttackAccounts, "./_snapshot/CRSSV11_ending_preAttack.csv");
            }
            state = 'inAttack';
            if( ! attackAccounts.includes(sender) ) attackAccounts.push(sender);
            if( ! attackAccounts.includes(recipient) ) attackAccounts.push(recipient);
            attackTransfers.push([sender, recipient, amount]);

        } else if (state == 'inAttack') { // attack finished.
            attackBalances = takeSnapshot(attackAccounts, "./_snapshot/CRSSV11_ending_attack.csv");
            state = 'postAttack';

        } else if (state == 'preAttack') { // preAttack
            if( ! preAttackAccounts.includes(sender) ) preAttackAccounts.push(sender);
            if( ! preAttackAccounts.includes(recipient) ) preAttackAccounts.push(recipient);

        } else if (state == 'postAttack') { // postAttack
            if( ! postAttackAccounts.includes(sender) ) postAttackAccounts.push(sender);
            if( ! postAttackAccounts.includes(recipient) ) postAttackAccounts.push(recipient);
        }

        console.log(sender, recipient, state);

        var tx = await transferEmulator.transferPassive(sender, recipient, amount);
        await tx.wait();
    }

    postAttackBalances = takeSnapshot(postAttackAccounts, "./_snapshot/CRSSV11_ending_postAttack.csv");



    return [preAttackBalances, attackBalances, postAttackBalances, attackTransfers];
}

async function takeSnapshot(accounts, filename) {
    var balances = await readBalances(accounts);
    writeBalancesToExcel(balances, filename);
    return balances;
}

async function readBalances(userAccounts) {
    var balances = [];
    for(index = 0; index < userAccounts.length; index ++ ) {
        var account = userAccounts[index];
        var balance = await transferEmulator.balanceOf(account);
        balances.push( [account, balance] );
    }
    return balances;
}

function writeBalancesToExcel(balances, filename) {
    
    var csv = 'Account, Contract, Balance_wei, Balance_CRSS\n';
    balances.forEach(function(row) {
        if( true ) {  //row[1] != 0 ) {
            csv += `${row[0]}, `;

            var contract = " ";
            for(i = 0; i < Object.values(knownAccounts).length; i++) {
                if(row[0] == Object.values(knownAccounts)[i]) {
                    contract = Object.keys(knownAccounts)[i];
                    break;
                }
            }
            csv += contract + ",";

            csv += ` ${row[1]},`;
            csv += ` ${library.weiToEth(row[1])},`;
            csv += "\n";
        }
    });
    
    fs.writeFileSync(filename, csv);
}


function writeTransfersToExcel(transfers, filename) {
    
    var csv = 'Sender, Contract, Recipient, Contract, Amount_wei, Amount_CRSS\n';
    transfers.forEach(function(row) {
        if( true ) {  //row[1] != 0 ) {
            csv += `${row[0]}, `;
            var contract = " ";
            for(i = 0; i < Object.values(knownAccounts).length; i++) {
                if(row[0] == Object.values(knownAccounts)[i]) {
                    contract = Object.keys(knownAccounts)[i];
                    break;
                }
            }
            csv += contract + ",";

            csv += `${row[1]}, `;
            var contract = " ";
            for(i = 0; i < Object.values(knownAccounts).length; i++) {
                if(row[1] == Object.values(knownAccounts)[i]) {
                    contract = Object.keys(knownAccounts)[i];
                    break;
                }
            }
            csv += contract + ",";

            csv += ` ${row[2]},`;
            csv += ` ${library.weiToEth(row[2])},`;
            csv += "\n";
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
