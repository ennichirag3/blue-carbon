import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../database.js";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "blue-carbon-spatial-secret-2026";

// JWT Helper
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });
};

// --- REGISTER User ---
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, walletAddress } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const existing = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get(cleanEmail);
    if (existing) {
      return res.status(400).json({ message: "Account with this email already exists" });
    }

    // Default random wallet if not supplied
    const finalWallet = walletAddress && walletAddress.startsWith("0x")
      ? walletAddress.toLowerCase()
      : `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const insert = db.prepare(`
      INSERT INTO users (name, email, password, walletAddress, role, balance)
      VALUES (?, ?, ?, ?, 'user', 100.0)
    `);

    const result = insert.run(name.trim(), cleanEmail, hashedPassword, finalWallet);
    const userId = Number(result.lastInsertRowid);

    const user = db.prepare("SELECT id, name, email, walletAddress, role, balance, createdAt FROM users WHERE id = ?").get(userId);
    const token = generateToken(userId);

    res.status(201).json({
      message: "✅ User registered successfully",
      token,
      user
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// --- LOGIN User ---
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = db.prepare("SELECT * FROM users WHERE LOWER(email) = ?").get(cleanEmail);

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user.id);

    res.json({
      message: "✅ Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role,
        balance: user.balance,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// --- GET CURRENT USER PROFILE (by Token) ---
router.get("/me", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No authorization token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare("SELECT id, name, email, walletAddress, role, balance, createdAt FROM users WHERE id = ?").get(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

// --- GET ALL USERS ---
router.get("/", (req, res) => {
  try {
    const users = db.prepare("SELECT id, name, email, walletAddress, role, balance, createdAt FROM users ORDER BY id DESC").all();
    res.json(users);
  } catch (err) {
    console.error("❌ Error fetching users:", err.message);
    res.status(500).json({ message: "Failed to fetch users", error: err.message });
  }
});

export default router;
