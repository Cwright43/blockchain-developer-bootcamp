
async function main() {
	console.log('Preparing deployment...\n')

	// Step 1: Fetch Contract to Deploy
	const Token = await ethers.getContractFactory('Token')
	const Exchange = await ethers.getContractFactory('Exchange')


	// Fetch accounts
	const accounts =	await ethers.getSigners()

	console.log(`Accounts fetched:\n${accounts[0].address}\n${accounts[1].address}\n`)

	// Step 2: Deploy Contract
	const dapp = await Token.deploy('Dapp University', 'DAPP', '1000000')
	await dapp.deployed()
	console.log(`DAPP Deployed to: ${dapp.address}`) // Log token address to console for whenever we deploy it

	const mETH = await Token.deploy('mETH', 'mETH', '1000000')
	await mETH.deployed()
	console.log(`mETH Deployed to: ${mETH.address}`) // Log token address to console for whenever we deploy it

	const mDAI = await Token.deploy('mDAI', 'mDAI', '1000000')
	await mDAI.deployed()
	console.log(`mDAI Deployed to: ${mDAI.address}`) // Log token address to console for whenever we deploy it

	const exchange = await Exchange.deploy(accounts[1].address, 10)
	await exchange.deployed()
	console.log(`Exchange Deployed to: ${exchange.address}`)
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
