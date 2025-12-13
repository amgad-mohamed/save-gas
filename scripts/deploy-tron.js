import("dotenv").then(dotenv => dotenv.config());
import { TronWeb } from "tronweb";
import fs from "fs";
import path from "path";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error("PRIVATE_KEY is missing in .env");
  process.exit(1);
}

// Tron Nile Testnet
const fullNode = "https://nile.trongrid.io";
const solidityNode = "https://nile.trongrid.io";
const eventServer = "https://nile.trongrid.io";

const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);

async function deploy() {
  console.log("Deploying to Tron Nile...");
  console.log("Deployer address:", tronWeb.defaultAddress.base58);

  try {
    // Deploy MockUSDT
    const mockUsdtArtifact = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../contracts/out/MockUSDT.sol/MockUSDT.json"),
        "utf8"
      )
    );

    console.log("Deploying MockUSDT...");
    const mockUsdt = await tronWeb.contract().new({
      abi: mockUsdtArtifact.abi,
      bytecode: mockUsdtArtifact.bytecode.object,
      feeLimit: 1000000000,
      callValue: 0,
      userFeePercentage: 100,
      originEnergyLimit: 10000000,
      parameters: [],
    });

    console.log("MockUSDT deployed at:", mockUsdt.address);

    // Deploy GasSaver
    const gasSaverArtifact = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../contracts/out/SaveGas.sol/GasSaver.json"),
        "utf8"
      )
    );

    console.log("Deploying GasSaver...");
    const gasSaver = await tronWeb.contract().new({
      abi: gasSaverArtifact.abi,
      bytecode: gasSaverArtifact.bytecode.object,
      feeLimit: 1000000000,
      callValue: 0,
      userFeePercentage: 100,
      originEnergyLimit: 10000000,
      parameters: [], // No constructor arguments
    });

    console.log("GasSaver deployed at:", gasSaver.address);

    return {
      mockUsdt: mockUsdt.address,
      gasSaver: gasSaver.address,
    };
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

deploy();
