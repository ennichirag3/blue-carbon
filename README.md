# 🌿 CryptoNest · Blue Carbon Spatial 3D Platform

A decentralized Blue Carbon conservation, verification, and offset registry platform built with a VisionOS-inspired spatial glassmorphism UI, interactive 3D motion, and an ultra-fast SQLite database.

![CryptoNest Spatial UI](./public/css/spatial.css)

## ✨ What's New in v2.0 (Spatial 3D & SQLite Migration)
- **Zero-Config Database**: Fully migrated from MongoDB to **SQLite (WAL Mode)**. No local or external MongoDB server required. Runs seamlessly anywhere out-of-the-box.
- **VisionOS Spatial Glassmorphism UI**: High-end translucent dark frosted glass aesthetic with subtle ambient lighting, glowing neon lime (`#bdf72b`) accents, and interactive 3D card tilt physics.
- **Fluid 3D Motion Transitions**: Dynamic perspective transitions between views (`Dashboard`, `Deposit & Offset`, `Withdrawal & Blockchain Transfer`, `Projects & MRV`, and `Auth`).
- **Interactive Canvas Charts**:
  - **Overview Spline Chart**: Glowing spline curve with interactive tooltip.
  - **General Statistics**: Climbing valuation curve with diagonal striped/hatched area fill.
  - **Daily Relative Dominance**: 3D perspective multi-slice polar/pie visualization.
- **Interactive Wallet Slider & Exchange**: Interactive slider for sending/receiving crypto and carbon credits (BCX).
- **Resilient Autonomous Blockchain Engine**: Works seamlessly in any cloud environment (including Render free tier) without requiring a running Hardhat daemon, while supporting real JSON-RPC connectivity whenever available.
- **3D Flip Card Authentication**: Interactive 180° flipping glass card for instant sign-in and registration with 1-click Demo credentials.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The server will start on `http://localhost:5001`. Open your browser to explore the platform.

### 3. Demo Credentials
- **Email**: `admin@cryptonest.io`
- **Password**: `Password123!`
- Or simply click **⚡ Demo 1-Click Sign In (David Owner)** on the login screen.

---

## 🌐 Deploy to Render

This repository is pre-configured with `render.yaml` for 1-click deployment on [Render](https://render.com):

1. Push your repository to GitHub.
2. In Render dashboard, click **New +** -> **Blueprint**.
3. Select your repository.
4. Render will automatically detect `render.yaml`, install dependencies, and launch your public web service!

**Manual Render Web Service Settings:**
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT`: `10000`
  - `NODE_ENV`: `production`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health and SQLite status |
| `POST` | `/api/users/login` | Authenticate user & return JWT |
| `POST` | `/api/users/register` | Register new user |
| `GET` | `/api/blockchain/stats` | Summary stats (price, volume, carbon saved) |
| `GET` | `/api/blockchain/balance/:address` | Fetch wallet balance |
| `POST` | `/api/blockchain/transfer` | Execute blockchain token transfer |
| `POST` | `/api/blockchain/retire` | Permanently offset & retire carbon credits |
| `GET` | `/api/blockchain/history` | Real-time on-chain transaction history |
| `GET` | `/api/projects` | List all verified blue carbon projects |
| `POST` | `/api/projects` | Register a new blue carbon project |
| `GET` | `/api/projects/qrcode/:id` | Generate QR code for mobile on-chain verification |
