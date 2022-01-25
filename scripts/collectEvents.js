const hre = require("hardhat");
const abi_crss = require("../_supporting/abi_crss.json");
var theOwner, Alice, Bob, Charlie;
var DECIMALS;
const INITIAL_SUPPLY = 1e15;
var CRSSToken;

const zero_address = "0x0000000000000000000000000000000000000000";

function weiToEthEn(wei) { return Number(ethers.utils.formatUnits(wei.toString(), DECIMALS)).toLocaleString('en') }
function weiToEth(wei) { return Number(ethers.utils.formatUnits(wei.toString(), DECIMALS)) }
function ethToWei(eth) { return ethers.utils.parseUnits(eth.toString(), DECIMALS); }
function uiAddr(address) { return "{0x" + address.substring(2, 6).concat('...') + "}" ; }
async function myExpectRevert(promise, revert_string) { 
	await promise.then(()=>expect(true).to.equal(false))
	.catch((err)=>{
		if( ! err.toString().includes(revert_string) )	{
			expect(true).to.equal(false);
		}
	})
};
function findEvent(receipt, eventName, args) {
	var event;
	for(let i = 0; i < receipt.events.length; i++) {
		if(receipt.events[i].event == eventName) {
			event = receipt.events[i];
			break;
		}
	}
	let matching;
	if(event != undefined) {
		matching = true;
		for(let i = 0; i < Object.keys(args).length; i++) {
			let arg = Object.keys(args)[i];
			if(event.args[arg] != undefined && parseInt(event.args[arg]) != parseInt(args[arg])) {
				matching = false;
				break;
			} else if( event.args[0][arg] != undefined && parseInt(event.args[0][arg]) != parseInt(args[arg]) ) {
				matching = false;
				break;
			}
		}
	} else {
		matching = false;
	}
	return matching;
}
function retrieveEvent(receipt, eventName) {
	var event;
	for(let i = 0; i < receipt.events.length; i++) {
		if(receipt.events[i].event == eventName) {
			event = receipt.events[i];
			break;
		}
	}
	var args;
	if(event != undefined) {
		if(Array.isArray(event.args)) {
			if(Array.isArray(event.args[0])) {
				args = event.args[0];
			} else {
				args = event.args;
			}
		} else {
			args = event.args;
		}
	}
	return args;
}

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

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
