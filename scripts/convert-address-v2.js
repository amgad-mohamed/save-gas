const { TronWeb } = require('tronweb');
const tronWeb = new TronWeb({
    fullHost: 'https://nile.trongrid.io'
});

const mockUSDT_hex = "41adebb351862e434db88f5ced6977f1edf5c05c4f";
const saveGas_hex = "412d74ca55d64f8c67155ac0232e3e2f22c9256de0";

console.log("MockUSDT Base58:", tronWeb.address.fromHex(mockUSDT_hex));
console.log("SaveGas Base58:", tronWeb.address.fromHex(saveGas_hex));
