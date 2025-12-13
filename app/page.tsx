"use client";

import { parseUnits, formatUnits } from "viem";
import { MockUSDTABI, SaveGasABI } from "./abis";
import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@tronweb3/tronwallet-adapter-react-hooks";
import { WalletActionButton } from "@tronweb3/tronwallet-adapter-react-ui";

import { TronWeb } from "tronweb";

const TRON_MOCK_USDT_ADDRESS = "TLCuviLXZtgF7JgXxwrUzrHpt4mmbMRTfW";
const TRON_GAS_SAVER_ADDRESS = "TESHt6Nrd7JtdXWzJUeeA7EGJsS8oma9qK";

export default function Home() {
  // Tron Hooks
  const { address: tronAddress, connected: isTronConnected } = useWallet();
  const [tronBalance, setTronBalance] = useState<string>("0");
  const [isTronPending, setIsTronPending] = useState(false);
  const [tronAllowance, setTronAllowance] = useState<bigint>(BigInt(0));
  const [networkName, setNetworkName] = useState<string>("Unknown");

  // Check network on load and change
  useEffect(() => {
    const checkNetwork = () => {
      if (
        window.tronWeb &&
        window.tronWeb.fullNode &&
        window.tronWeb.fullNode.host
      ) {
        setNetworkName(window.tronWeb.fullNode.host);
      }
    };

    checkNetwork();
    const interval = setInterval(checkNetwork, 2000);
    return () => clearInterval(interval);
  }, []);

  // Bulk Transfer State
  const [bulkList, setBulkList] = useState<
    { address: string; amount: string }[]
  >([{ address: "", amount: "" }]);
  const [tokenType, setTokenType] = useState<"Token" | "Native">("Token");
  const [bulkTotal, setBulkTotal] = useState<bigint>(BigInt(0));
  console.log("bulkTotal", bulkTotal);

  // Read-only TronWeb instance for fetching data to avoid 401 from wallet node
  const readTronWeb = useMemo(() => {
    return new TronWeb({
      fullHost: "https://nile.trongrid.io",
    });
  }, []);

  // Ensure we are only dealing with Nile
  useEffect(() => {
    if (
      window.tronWeb &&
      window.tronWeb.fullNode &&
      window.tronWeb.fullNode.host
    ) {
      const host = window.tronWeb.fullNode.host;
      // STRICT CHECK: Only allow nile.trongrid.io
      if (!host.includes("nile.trongrid.io")) {
        console.error(
          "WRONG NETWORK: You are not connected to nile.trongrid.io"
        );
        alert(
          "Wrong Network! Please switch TronLink Node to: https://nile.trongrid.io"
        );
      }
    }
  }, [networkName]);

  // Tron Interaction Functions
  // tsIgnore
  const getTronContract = async (address: string, abi:unknown) => {
    console.log("Getting Tron Contract...");

    // Helper to wait for TronWeb to be ready
    const waitForTronWeb = async () => {
      let attempts = 0;
      while (attempts < 50) {
        // Standard check
        if (window.tronWeb && window.tronWeb.ready) return true;
        // Fallback: check if address is available (sometimes ready is false but address is there)
        if (
          window.tronWeb &&
          window.tronWeb.defaultAddress &&
          window.tronWeb.defaultAddress.base58
        )
          return true;

        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      return false;
    };

    // Try to trigger TronLink connection if available
    if (window.tronLink && window.tronLink.request) {
      try {
        console.log("Requesting Tron accounts...");
        await window.tronLink.request({ method: "tron_requestAccounts" });
      } catch (e) {
        console.warn("Request accounts failed/rejected", e);
      }
    }

    if (window.tronWeb) {
      const ready = await waitForTronWeb();

      if (ready) {
        console.log(
          "TronWeb is ready. Address:",
          window.tronWeb.defaultAddress.base58
        );

        // Network Check
        const fullNode = window.tronWeb.fullNode?.host || "";
        console.log("Connected Node:", fullNode);

        // Just warn if it looks weird, but DO NOT BLOCK
        if (!fullNode.includes("nile.trongrid.io")) {
          console.warn("⚠️ Connected to a non-standard node:", fullNode);
          alert("Please switch your TronLink node to https://nile.trongrid.io");
        }

        try {
          // Direct instantiation - bypass getContract check which might fail on some nodes
          const contract = await window.tronWeb.contract(abi, address);
          return contract;
        } catch (e: unknown) {
          console.error("Contract instantiation failed", e);
          throw new Error(
            "Failed to load contract. Ensure you are on Nile Testnet and the contract exists."
          );
        }
      } else {
        console.error("TronWeb timeout. Ready state:", window.tronWeb.ready);
      }
    } else {
      console.error("window.tronWeb is undefined");
    }

    throw new Error(
      "TronWeb not ready. Please unlock your wallet and ensure you are on the correct network."
    );
  };

  const fetchTronData = async () => {
    if (isTronConnected && tronAddress && window.tronWeb) {
      try {
        console.log("Fetching data using wallet connection...");
        // Use the wallet's TronWeb instance to ensure we are on the same network as the user
        const instance = window.tronWeb;

        const contract = await instance.contract(
          MockUSDTABI,
          TRON_MOCK_USDT_ADDRESS
        );
        const balance = await contract.balanceOf(tronAddress).call();
        setTronBalance(balance.toString());

        const allowance = await contract
          .allowance(tronAddress, TRON_GAS_SAVER_ADDRESS)
          .call();
        setTronAllowance(BigInt(allowance.toString()));
      } catch (e) {
        console.error("Error fetching Tron data:", e);
        // Fallback to readTronWeb if wallet request fails (e.g. 401 on some nodes)
        console.log("Falling back to public node for reading...");
        try {
          readTronWeb.setAddress(TRON_MOCK_USDT_ADDRESS);
          const contract = await readTronWeb.contract(
            MockUSDTABI,
            TRON_MOCK_USDT_ADDRESS
          );
          const balance = await contract.balanceOf(tronAddress).call();
          setTronBalance(balance.toString());

          const allowance = await contract
            .allowance(tronAddress, TRON_GAS_SAVER_ADDRESS)
            .call();
          setTronAllowance(BigInt(allowance.toString()));
        } catch (fallbackError) {
          console.error("Fallback fetch failed:", fallbackError);
        }
      }
    }
  };

  useEffect(() => {
    if (isTronConnected) {
      fetchTronData();
      // Poll every 10 seconds
      const interval = setInterval(fetchTronData, 10000);
      return () => clearInterval(interval);
    }
  }, [isTronConnected, tronAddress]);

  // Helper to parse bulk data consistently
  const parseBulkData = (
    list: { address: string; amount: string }[],
    decimals: number = 6
  ) => {
    const recipients: string[] = [];
    const amounts: string[] = [];
    let total = BigInt(0);

    list.forEach((item) => {
      const addr = item.address.trim();
      const amt = item.amount.trim();
      if (addr && amt) {
        try {
          const val = parseUnits(amt, decimals);
          console.log(`Parsing: ${amt} with decimals ${decimals} -> ${val}`);
          recipients.push(addr);
          amounts.push(val.toString());
          total += val;
        } catch (e) {
          console.error("Parse Error:", e);
        }
      }
    });

    return { recipients, amounts, total };
  };

  useEffect(() => {
    // Both TRX and MockUSDT are 6 decimals on Tron
    const decimals = 6;
    const { total } = parseBulkData(bulkList, decimals);
    setBulkTotal(total);
  }, [bulkList, tokenType]);

  const addBulkRow = () => {
    setBulkList([...bulkList, { address: "", amount: "" }]);
  };

  const removeBulkRow = (index: number) => {
    if (bulkList.length > 1) {
      const newList = [...bulkList];
      newList.splice(index, 1);
      setBulkList(newList);
    }
  };

  const updateBulkRow = (
    index: number,
    field: "address" | "amount",
    value: string
  ) => {
    const newList = [...bulkList];
    newList[index][field] = value;
    setBulkList(newList);
  };

  const [diagnosticLog, setDiagnosticLog] = useState<string[]>([]);

  const runDiagnostics = async () => {
    const logs: string[] = [];
    const log = (msg: string) => logs.push(msg);

    log("--- Starting Diagnostics ---");
    if (!window.tronWeb) {
      log("❌ TronWeb not found in window");
      setDiagnosticLog(logs);
      return;
    }

    log(`📡 Current Node: ${window.tronWeb.fullNode?.host}`);

    // Check MockUSDT
    try {
      log(`🔍 Checking MockUSDT (${TRON_MOCK_USDT_ADDRESS})...`);
      const contract = await window.tronWeb.trx.getContract(
        TRON_MOCK_USDT_ADDRESS
      );
      if (contract.contract_address) {
        log("✅ MockUSDT Found on-chain!");
      } else {
        log("❌ MockUSDT NOT found! (Empty result)");
      }
    } catch (e: unknown) {
      log(`❌ Error checking MockUSDT: ${(e as Error).message}`);
    }

    // Check GasSaver
    try {
      log(`🔍 Checking GasSaver (${TRON_GAS_SAVER_ADDRESS})...`);
      const contract = await window.tronWeb.trx.getContract(
        TRON_GAS_SAVER_ADDRESS
      );
      if (contract.contract_address) {
        log("✅ GasSaver Found on-chain!");
      } else {
        log("❌ GasSaver NOT found! (Empty result)");
      }
    } catch (e: unknown) {
      log(`❌ Error checking GasSaver: ${(e as Error).message}`);
    }

    log("--- End Diagnostics ---");
    setDiagnosticLog(logs);
  };

  // Tron Handlers
  const handleTronMint = async () => {
    if (!window.tronWeb || !tronAddress) {
      alert("Please connect your wallet first.");
      return;
    }
    setIsTronPending(true);
    try {
      console.log("Preparing to mint...");
      console.log("User Address:", tronAddress);

      const contract = await getTronContract(TRON_MOCK_USDT_ADDRESS, [
        ...MockUSDTABI,
      ]);

      const amount = parseUnits("1000", 6).toString();
      console.log("Mint Amount:", amount);

      // Explicitly set feeLimit to avoid "Invalid transaction" errors
      const txId = await contract.mint(tronAddress, amount).send({
        feeLimit: 100_000_000, // 100 TRX
      });

      console.log("Mint Tx ID:", txId);
      alert("Mint transaction sent successfully!");
      fetchTronData();
    } catch (e: unknown) {
      console.error("Mint Error:", e);
      alert("Mint failed: " + (e instanceof Error ? e.message : String(e)));
    }
    setIsTronPending(false);
  };

  const handleTronBulkTransfer = async () => {
    if (!window.tronWeb) return;
    setIsTronPending(true);
    try {
      const decimals = 6;
      const { recipients, amounts, total } = parseBulkData(bulkList, decimals);

      if (recipients.length === 0) throw new Error("No valid data");

      const gasSaverContract = await getTronContract(TRON_GAS_SAVER_ADDRESS, [
        ...SaveGasABI,
      ]);

      let txId;
      if (tokenType === "Native") {
        // Native Transfer
        const zeroAddr = "0x0000000000000000000000000000000000000000";
        const tokensArray = recipients.map(() => zeroAddr);

        txId = await gasSaverContract
          .bulkTransfer(tokensArray, recipients, amounts)
          .send({
            callValue: total.toString(),
            feeLimit: 100_000_000,
          });
      } else {
        // Token Transfer
        const tokensArray = recipients.map(() => TRON_MOCK_USDT_ADDRESS);

        txId = await gasSaverContract
          .bulkTransfer(tokensArray, recipients, amounts)
          .send({
            feeLimit: 100_000_000,
          });
      }

      console.log("Bulk Transfer Tx ID:", txId);
      alert("Bulk Transfer sent!");
      fetchTronData();
    } catch (e: unknown) {
      console.error(e);
      alert(
        "Bulk Transfer failed: " + (e instanceof Error ? e.message : String(e))
      );
    }
    setIsTronPending(false);
  };

  const handleTronApprove = async () => {
    if (!window.tronWeb) return;
    setIsTronPending(true);
    try {
      const contract = await getTronContract(TRON_MOCK_USDT_ADDRESS, [
        ...MockUSDTABI,
      ]);
      alert(`DEBUG: Approving amount: ${bulkTotal}`); // Uncomment for UI debugging

      const txId = await contract
        .approve(TRON_GAS_SAVER_ADDRESS, bulkTotal * BigInt(1000000))
        .send({
          feeLimit: 100_000_000, // 100 TRX
        });

      console.log("Approve Tx ID:", txId);
      alert("Approve transaction sent! Waiting for confirmation...");

      // Wait for confirmation and then trigger bulk transfer
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await fetchTronData();

      // Auto-trigger bulk transfer
      await handleTronBulkTransfer();
    } catch (e: unknown) {
      console.error(e);
      alert("Approve failed: " + (e instanceof Error ? e.message : String(e)));
      setIsTronPending(false);
    }
    // Note: handleTronBulkTransfer will set isTronPending(false) when done.
    // If it wasn't called (error case), we set it false in catch.
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full max-w-md">
        <h1 className="text-2xl font-bold">Save Gas - Tron Nile</h1>

        <WalletActionButton />

        {isTronConnected && (
          <div className="flex flex-col gap-6 p-6 border rounded-xl w-full bg-gray-50 dark:bg-gray-800">
            <div className="text-sm break-all">
              <span className="font-semibold">Address:</span> {tronAddress}
            </div>
            <div className="text-sm break-all">
              <span className="font-semibold">Network Node:</span>{" "}
              <span className="text-xs text-gray-500" title={networkName}>
                {networkName.length > 30
                  ? networkName.substring(0, 30) + "..."
                  : networkName}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-semibold">MockUSDT Balance:</span>
              <span>
                {tronBalance ? (parseFloat(tronBalance) / 1e6).toFixed(2) : "0"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Allowance:</span>
              <span>
                {tronAllowance ? (Number(tronAllowance) / 1e6).toFixed(2) : "0"}
              </span>
            </div>

            <button
              onClick={handleTronMint}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
              disabled={isTronPending}
            >
              Mint 1000 MockUSDT
            </button>

            <div className="flex flex-col gap-3 mt-4 pt-4 border-t w-full">
              <label className="text-sm font-semibold">
                Bulk Transfer List
              </label>

              {/* Settings */}
              <div className="flex flex-col gap-2 mb-2 p-3 bg-gray-100 rounded text-black">
                <div className="flex justify-between">
                  <span className="text-xs font-bold uppercase text-gray-500">
                    Token Type
                  </span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tokenType"
                        checked={tokenType === "Token"}
                        onChange={() => setTokenType("Token")}
                      />
                      <span>MockUSDT</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tokenType"
                        checked={tokenType === "Native"}
                        onChange={() => setTokenType("Native")}
                      />
                      <span>Native TRX</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {bulkList.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="T...address"
                      value={item.address}
                      onChange={(e) =>
                        updateBulkRow(idx, "address", e.target.value)
                      }
                      className="flex-[2] p-2 border rounded text-black text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) =>
                        updateBulkRow(idx, "amount", e.target.value)
                      }
                      className="flex-1 p-2 border rounded text-black text-sm"
                    />
                    <button
                      onClick={() => removeBulkRow(idx)}
                      className="text-red-500 hover:text-red-700 px-2 font-bold"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addBulkRow}
                className="text-sm text-blue-600 hover:text-blue-800 self-start"
              >
                + Add Recipient
              </button>

              <div className="flex gap-2 w-full mt-2">
                {tokenType === "Token" && tronAllowance < bulkTotal ? (
                  <button
                    onClick={handleTronApprove}
                    className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                    disabled={isTronPending || bulkTotal === BigInt(0)}
                  >
                    Approve {formatUnits(bulkTotal, 6)} MockUSDT
                  </button>
                ) : (
                  <button
                    onClick={handleTronBulkTransfer}
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                    disabled={isTronPending || bulkTotal === BigInt(0)}
                  >
                    Bulk Transfer{" "}
                    {tokenType === "Native" ? "(Native)" : "(MockUSDT)"} (
                    {formatUnits(bulkTotal, 6)})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-4 w-full">
          <button
            onClick={runDiagnostics}
            className="bg-gray-200 text-gray-800 py-1 px-3 rounded text-sm hover:bg-gray-300 transition-colors w-full"
          >
            Run Network Diagnostics
          </button>
          {diagnosticLog.length > 0 && (
            <div className="bg-black text-green-400 p-2 rounded text-xs font-mono whitespace-pre-wrap">
              {diagnosticLog.join("\n")}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
