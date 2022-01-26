const hre = require("hardhat");
const abi_crss = require("../_supporting/abi_crss.json");
var theOwner, Alice, Bob, Charlie;
var DECIMALS;
const INITIAL_SUPPLY = 1e15;
var CRSSToken;

const zero_address = "0x0000000000000000000000000000000000000000";
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
}

require("./library.js");

async function main() {

    [theOwner, Alice, Bob, Charlie] = await ethers.getSigners();
    //console.log("\ttheOwner's address = %s, balance = %s FTM.", uiAddr(addr = await theOwner.getAddress()), weiToEthEn(await ethers.provider.getBalance(addr)) );
    //console.log("\tAlice's address = %s, balance = %s FTM.", uiAddr(addr = await Alice.getAddress()), weiToEthEn(await ethers.provider.getBalance(addr)) );
    //console.log("\tBob's address = %s, balance = %s FTM.", uiAddr(addr = await Bob.getAddress()), weiToEthEn(await ethers.provider.getBalance(addr)) );
    //console.log("\tCharlie's address = %s, balance = %s FTM.", uiAddr(addr = await Charlie.getAddress()), weiToEthEn(await ethers.provider.getBalance(addr)) );

    CRSSToken = new ethers.Contract(process.env.CRSSV11,  abi_crss, theOwner);

    DECIMALS = await CRSSToken.decimals();
    var total = await CRSSToken.totalSupply();
    console.log("\tCRSS.decimals = %s, CRSS.totalSupply = %s wei".yellow, DECIMALS, total);

    var transferFilter = CRSSToken.filters.Transfer(null, null);
    var events;

    var bn_prev = 13280000, delta = 1000;
    for(bn = 13280000 + delta-1; bn <= 14671200; bn += delta) {
        var transferEvents = await CRSSToken.queryFilter(transferFilter, bn_prev, bn); // 13280670, 14671200
        console.log("\t------------------[%s, %s]: %s", bn_prev, bn, transferEvents.length);
        bn_prev = bn + 1;

    }

}


var userAccounts;
async function replayEvents(events) {

    const TransferEmulator = await ethers.getContractFactory("TransferEmulator", theOwner);
    //hertzToken = await Hertz.deploy("Hertz substitute Token", "HTZ", 1e33, theOwner.address);
    transferEmulator = await TransferEmulator.deploy();
    await transferEmulator.deployed();
    var totalSupply = await transferEmulator.totalSupply();
    console.log("\ttransferEmulator was deployed with initial total supply: %s uints", weiToEthEn(totalSupply));
    console.log("\ttransferEmulator deployed at: %s", hertzToken.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

