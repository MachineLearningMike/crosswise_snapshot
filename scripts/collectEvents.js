const hre = require("hardhat");
const fs = require("fs");
const abi_crss = require("../_supporting/abi_crss.json");
var theOwner, Alice, Bob, Charlie;
var DECIMALS;
const INITIAL_SUPPLY = 1e15;
var CRSSToken;

const zero_address = "0x0000000000000000000000000000000000000000";

function weiToEthEn(wei) { return Number(ethers.utils.formatUnits(wei.toString(), DECIMALS)).toLocaleString('en') }
function weiToEth(wei) { return Number(ethers.utils.formatUnits(wei.toString(), DECIMALS)) }
function ethToWei(eth) { return ethers.utils.parseUnits(eth.toString(), DECIMALS); }
function uiAddr(address) { return "{0x" + address.substring(2, 6).concat('...') + "}"; }
async function myExpectRevert(promise, revert_string) {
	await promise.then(() => expect(true).to.equal(false))
		.catch((err) => {
			if (!err.toString().includes(revert_string)) {
				expect(true).to.equal(false);
			}
		})
};
function findEvent(receipt, eventName, args) {
	var event;
	for (let i = 0; i < receipt.events.length; i++) {
		if (receipt.events[i].event == eventName) {
			event = receipt.events[i];
			break;
		}
	}
	let matching;
	if (event != undefined) {
		matching = true;
		for (let i = 0; i < Object.keys(args).length; i++) {
			let arg = Object.keys(args)[i];
			if (event.args[arg] != undefined && parseInt(event.args[arg]) != parseInt(args[arg])) {
				matching = false;
				break;
			} else if (event.args[0][arg] != undefined && parseInt(event.args[0][arg]) != parseInt(args[arg])) {
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
	for (let i = 0; i < receipt.events.length; i++) {
		if (receipt.events[i].event == eventName) {
			event = receipt.events[i];
			break;
		}
	}
	var args;
	if (event != undefined) {
		if (Array.isArray(event.args)) {
			if (Array.isArray(event.args[0])) {
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

async function getTransferHistory(tokenName, tokenAddress, abi, owner) {
	token = new ethers.Contract(tokenAddress, abi, owner);

	DECIMALS = await token.decimals();
	let total = await token.totalSupply();
	console.log("\tCRSS.decimals = %s, CRSS.totalSupply = %s wei".yellow, DECIMALS, total);

	let transferFilter = token.filters.Transfer(null, null);
	let transferEvents;

	let bn_prev = 14278000, delta = 1000;
	let total = 0;

	for (bn = 14278000 + delta - 1; bn <= 14674000; bn += delta) {
		transferEvents = await token.queryFilter(transferFilter, bn_prev, bn); // 13280670, 14671200
		console.log("\t------------------[%s, %s]: %s", bn_prev, bn, transferEvents.length);
		// bn -= delta
		bn_prev = bn + 1;
		if (transferEvents.length === 0) continue;
		total += transferEvents.length;

		const path = `./events/${tokenName}.txt`;
		const dataToSave = `\nFrom ${bn_prev} To ${bn}\n${JSON.stringify(transferEvents)}`
		if (fs.existsSync(path)) {
			const readData = fs.readFileSync(path, 'utf-8');

			// Check if data already saved has current trasfer events
			if (readData.indexOf(`From ${bn_prev} To ${bn}`) < 0) {
				fs.appendFileSync(path, dataToSave, 'utf-8');
			}
		} else {
			fs.writeFileSync(path, dataToSave, 'utf-8');
		}
	}

	fs.appendFileSync(path, `\nTotal Counts: ${total}`, 'utf-8');
}

async function main() {

	[theOwner, Alice, Bob, Charlie] = await ethers.getSigners();

	getTransferHistory("CRSS", process.env.CRSSV11, abi_crss, theOwner);

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

