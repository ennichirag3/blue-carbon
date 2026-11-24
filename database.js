import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "bluecarbon.sqlite");

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high performance and integrity
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    walletAddress TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    balance REAL DEFAULT 100.0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    carbonSaved REAL DEFAULT 0,
    targetCredits REAL DEFAULT 10000,
    creditsIssued REAL DEFAULT 0,
    status TEXT DEFAULT 'Active',
    category TEXT DEFAULT 'Mangrove Conservation',
    verifier TEXT DEFAULT 'Verra VCS Standard',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromAddress TEXT NOT NULL,
    toAddress TEXT NOT NULL,
    amount REAL NOT NULL,
    tokenSymbol TEXT DEFAULT 'BCX',
    txHash TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Confirmed',
    blockNumber INTEGER DEFAULT 18920412,
    type TEXT DEFAULT 'Transfer',
    note TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mrv_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    carbonVerified REAL NOT NULL,
    verificationMethod TEXT DEFAULT 'Multispectral Satellite & LiDAR Biomass',
    verifiedBy TEXT DEFAULT 'Global Carbon Council',
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed default data if empty
const seedDatabase = async () => {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (userCount === 0) {
    const salt = await bcrypt.genSalt(10);
    const demoPass = await bcrypt.hash("Password123!", salt);

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, walletAddress, role, balance)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      "David Owner",
      "admin@cryptonest.io",
      demoPass,
      "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      "admin",
      234.42
    );

    insertUser.run(
      "Sarah Jenkins",
      "sarah@bluecarbon.org",
      demoPass,
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "user",
      84.15
    );
  }

  const projectCount = db.prepare("SELECT COUNT(*) as count FROM projects").get().count;
  if (projectCount === 0) {
    const insertProject = db.prepare(`
      INSERT INTO projects (name, description, location, carbonSaved, targetCredits, creditsIssued, status, category, verifier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProject.run(
      "Sundarbans Mangrove Blue Carbon",
      "Preservation of 14,000 hectares of critical tidal halophytic mangrove biome capturing oceanic blue carbon.",
      "Bay of Bengal, India",
      48500,
      60000,
      48500,
      "Verified",
      "Mangrove Restoration",
      "Verra VCS #1842"
    );

    insertProject.run(
      "Sulawesi Seagrass Meadow Carbon Sink",
      "High-density tropical seagrass conservation with 35x higher carbon storage capacity than rainforests.",
      "Wakatobi, Indonesia",
      31200,
      45000,
      31200,
      "Active",
      "Seagrass Meadows",
      "Gold Standard #4091"
    );

    insertProject.run(
      "Hebrides Oceanic Kelp Forest Preservation",
      "Sub-tidal giant kelp cultivation producing certified marine blue carbon offset credits.",
      "Outer Hebrides, Scotland",
      19800,
      25000,
      19800,
      "Verified",
      "Kelp Forests",
      "Puro.earth Oceanic"
    );

    insertProject.run(
      "Biscayne Bay Saltmarsh Wetland Shield",
      "Restoration of hurricane-impacted tidal saltmarshes preventing coastal erosion and locking sediment carbon.",
      "Florida Keys, USA",
      26750,
      35000,
      26750,
      "Active",
      "Saltmarsh Wetlands",
      "Verra VCS #2041"
    );
  }

  const txCount = db.prepare("SELECT COUNT(*) as count FROM transactions").get().count;
  if (txCount === 0) {
    const insertTx = db.prepare(`
      INSERT INTO transactions (fromAddress, toAddress, amount, tokenSymbol, txHash, status, blockNumber, type, note, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTx.run(
      "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      3.5676,
      "BTC",
      "0x4f9c1827419e74bc293d8102e34fa6198547201bc89457291a27498cbe78261a",
      "Confirmed",
      19284102,
      "Trade",
      "Sundarbans Carbon Offset Purchase",
      "2026-04-23 14:28:10"
    );

    insertTx.run(
      "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      3.5676,
      "BTC",
      "0x789b91028741e9827361a9b20754ca6201bce471029487cbf9281a7b8294c1a2",
      "Confirmed",
      19283995,
      "Trade",
      "Sulawesi Seagrass Credit Allocation",
      "2026-04-23 11:15:40"
    );

    insertTx.run(
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      150.0,
      "BCX",
      "0x12a9bc7418293746a81b293847cbe91028374618293847561829374659102837",
      "Confirmed",
      19283520,
      "Mint",
      "Verified Blue Carbon Credit Issue",
      "2026-04-22 09:30:00"
    );

    insertTx.run(
      "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      45.5,
      "ETH",
      "0x992014857102948cba7192837461928374619283746192837461928374619283",
      "Confirmed",
      19283110,
      "Retire",
      "Biscayne Bay Corporate Neutrality Retirement",
      "2026-04-21 16:45:12"
    );
  }
};

await seedDatabase();

export default db;
