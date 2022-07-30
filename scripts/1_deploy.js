
async function main() {
	// Step 1: Fetch Contract to Deploy
	const Token = await ethers.getContractFactory("Token")


	// Step 2: Deploy Contract
	const token = await Token.deploy()
	await token.deployed()
	console.log(`Token Deployed to: ${token.address}`) // Log token address to console for whenever we deploy it
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
