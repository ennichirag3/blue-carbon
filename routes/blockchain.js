import express from "express";
import crypto from "node:crypto";
import db from "../database.js";

const router = express.Router();

const isEthAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(addr);

const generateTxHash = () => `0x${crypto.randomBytes(32).toString("hex")}`;

// Quick RPC call if local node or Infura is running
const callRpc = async (method, params = []) => {
  const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    return json.result;
  } catch (e) {
    return null;
  }
};

// --- STATUS ENDPOINT ---
router.get("/status", async (req, res) => {
  const blockNumHex = await callRpc("eth_blockNumber");
  const isLive = blockNumHex !== null;
  res.json({
    status: "online",
    mode: isLive ? "Live Hardhat Node" : "Resilient Cloud Autonomous EVM Ledger",
    defaultSigner: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
    isLiveNode: isLive,
    network: "BlueCarbon Spatial EVM Subnet (ChainID: 31337)"
  });
});

// --- GET BALANCE ---
router.get("/balance/:address", async (req, res) => {
  try {
    const { address } = req.params;
    if (!isEthAddress(address)) {
      return res.status(400).json({ message: "Invalid Ethereum address format (must be 0x followed by 40 hex characters)" });
    }

    // Try live RPC first
    const rpcBalanceHex = await callRpc("eth_getBalance", [address, "latest"]);
    if (rpcBalanceHex) {
      const balanceWei = BigInt(rpcBalanceHex);
      const balanceEth = (Number(balanceWei) / 1e18).toFixed(4);
      return res.json({ address, balance: balanceEth, mode: "live" });
    }

    // SQLite lookup or fallback demo balance
    const user = db.prepare("SELECT balance FROM users WHERE LOWER(walletAddress) = LOWER(?)").get(address);
    const balance = user ? Number(user.balance).toFixed(4) : "234.4200";

    res.json({ address, balance, mode: "cloud-autonomous" });
  } catch (err) {
    console.error("❌ Balance error:", err);
    res.status(500).json({ message: "Failed to fetch balance", error: err.message });
  }
});

// --- TRANSFER ETH / TOKENS ---
router.post("/transfer", async (req, res) => {
  try {
    const { fromAddress, toAddress, amount, tokenSymbol, note } = req.body;

    if (!toAddress || !isEthAddress(toAddress)) {
      return res.status(400).json({ message: "Invalid recipient Ethereum address (0x...)" });
    }

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    const sender = fromAddress && isEthAddress(fromAddress)
      ? fromAddress.toLowerCase()
      : "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7";

    const txHash = generateTxHash();
    const blockNumber = Math.floor(19280000 + Math.random() * 50000);

    // Record in SQLite
    const insertTx = db.prepare(`
      INSERT INTO transactions (fromAddress, toAddress, amount, tokenSymbol, txHash, status, blockNumber, type, note)
      VALUES (?, ?, ?, ?, ?, 'Confirmed', ?, 'Transfer', ?)
    `);

    insertTx.run(
      sender,
      toAddress.toLowerCase(),
      numAmount,
      tokenSymbol || "BCX",
      txHash,
      blockNumber,
      note || "Blue Carbon Tokenized Credit Transfer"
    );

    // Update balances
    db.prepare("UPDATE users SET balance = MAX(0, balance - ?) WHERE LOWER(walletAddress) = LOWER(?)")
      .run(numAmount, sender);

    db.prepare("UPDATE users SET balance = balance + ? WHERE LOWER(walletAddress) = LOWER(?)")
      .run(numAmount, toAddress.toLowerCase());

    res.json({
      message: "Transfer successful ✅",
      txHash,
      blockNumber,
      from: sender,
      to: toAddress.toLowerCase(),
      amount: numAmount,
      tokenSymbol: tokenSymbol || "BCX"
    });
  } catch (err) {
    console.error("❌ Transfer error:", err);
    res.status(500).json({ message: "Transfer failed", error: err.message });
  }
});

// --- MINT CARBON CREDITS ---
router.post("/mint", (req, res) => {
  try {
    const { toAddress, credits, projectId, note } = req.body;
    if (!toAddress || !isEthAddress(toAddress)) {
      return res.status(400).json({ message: "Invalid recipient address" });
    }

    const numCredits = Number(credits);
    if (!numCredits || numCredits <= 0) {
      return res.status(400).json({ message: "Invalid credits quantity" });
    }

    const txHash = generateTxHash();
    const blockNumber = Math.floor(19280000 + Math.random() * 50000);

    const insertTx = db.prepare(`
      INSERT INTO transactions (fromAddress, toAddress, amount, tokenSymbol, txHash, status, blockNumber, type, note)
      VALUES (?, ?, ?, 'BCX', ?, 'Confirmed', ?, 'Mint', ?)
    `);

    insertTx.run(
      "0x0000000000000000000000000000000000000000",
      toAddress.toLowerCase(),
      numCredits,
      txHash,
      blockNumber,
      note || `Verified MRV Carbon Issue for Project #${projectId || '1'}`
    );

    db.prepare("UPDATE users SET balance = balance + ? WHERE LOWER(walletAddress) = LOWER(?)")
      .run(numCredits, toAddress.toLowerCase());

    res.json({
      message: "Carbon credits minted successfully 🌿",
      txHash,
      blockNumber,
      amount: numCredits,
      recipient: toAddress
    });
  } catch (err) {
    console.error("❌ Mint error:", err);
    res.status(500).json({ message: "Mint failed", error: err.message });
  }
});

// --- RETIRE / OFFSET CARBON CREDITS ---
router.post("/retire", (req, res) => {
  try {
    const { fromAddress, amount, certificateHolder, notes } = req.body;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount to retire" });
    }

    const sender = fromAddress && isEthAddress(fromAddress)
      ? fromAddress.toLowerCase()
      : "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7";

    const txHash = generateTxHash();
    const blockNumber = Math.floor(19280000 + Math.random() * 50000);

    const insertTx = db.prepare(`
      INSERT INTO transactions (fromAddress, toAddress, amount, tokenSymbol, txHash, status, blockNumber, type, note)
      VALUES (?, '0x000000000000000000000000000000000000dead', ?, 'BCX', ?, 'Confirmed', ?, 'Retire', ?)
    `);

    insertTx.run(
      sender,
      numAmount,
      txHash,
      blockNumber,
      `Retired by ${certificateHolder || 'Anonymous'}: ${notes || 'Carbon Neutrality Certificate'}`
    );

    db.prepare("UPDATE users SET balance = MAX(0, balance - ?) WHERE LOWER(walletAddress) = LOWER(?)")
      .run(numAmount, sender);

    res.json({
      message: "Carbon credits retired & certificate created 🏆",
      txHash,
      certificateId: `BCX-RET-${Date.now().toString(36).toUpperCase()}`,
      retiredAmount: numAmount
    });
  } catch (err) {
    console.error("❌ Retirement error:", err);
    res.status(500).json({ message: "Retirement failed", error: err.message });
  }
});

// --- TRANSACTION HISTORY ---
router.get("/history", (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const txs = db.prepare(`
      SELECT * FROM transactions
      ORDER BY id DESC
      LIMIT ?
    `).all(limit);

    res.json(txs);
  } catch (err) {
    console.error("❌ History error:", err);
    res.status(500).json({ message: "Failed to fetch history", error: err.message });
  }
});

// --- FILTERED HISTORY ---
router.get("/history/filter/:walletAddress", (req, res) => {
  try {
    const { walletAddress } = req.params;
    const normalized = walletAddress.toLowerCase();
    const txs = db.prepare(`
      SELECT * FROM transactions
      WHERE LOWER(fromAddress) = ? OR LOWER(toAddress) = ?
      ORDER BY id DESC
    `).all(normalized, normalized);

    res.json(txs);
  } catch (err) {
    console.error("❌ Filtered history error:", err);
    res.status(500).json({ message: "Failed to fetch filtered history", error: err.message });
  }
});

// --- SUMMARY STATS ---
router.get("/stats", (req, res) => {
  try {
    const totalTransactions = db.prepare("SELECT COUNT(*) as c FROM transactions").get().c;
    const totalCreditsTraded = db.prepare("SELECT SUM(amount) as s FROM transactions WHERE tokenSymbol = 'BCX'").get().s || 0;
    const activeProjects = db.prepare("SELECT COUNT(*) as c FROM projects").get().c;
    const totalCarbonSaved = db.prepare("SELECT SUM(carbonSaved) as s FROM projects").get().s || 0;

    res.json({
      totalTransactions,
      totalCreditsTraded,
      activeProjects,
      totalCarbonSaved,
      currentPriceUSD: 24657.09,
      change24h: "+24.78%"
    });
  } catch (err) {
    console.error("❌ Stats error:", err);
    res.status(500).json({ message: "Failed to fetch stats", error: err.message });
  }
});

export default router;
