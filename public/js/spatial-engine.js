/**
 * Blue Carbon Spatial 3D Experience Engine
 * Handles 3D Card Tilts, Spatial Canvas Charts, Interactive Blockchain Engine, and Fluid Page Transitions
 */

class SpatialApp {
  constructor() {
    this.token = localStorage.getItem("token") || null;
    this.currentUser = null;
    this.currentView = "dashboard";
    this.charts = {};
    this.audioCtx = null;
    this.isMuted = false;

    this.init();
  }

  async init() {
    this.initSound();
    this.initTiltEffect();
    this.initNavigation();
    this.initSlider();
    this.initAuthForms();
    this.initBlockchainForms();
    this.initProjectsView();

    // Check auth or load demo
    await this.checkAuthStatus();

    // Render spatial canvas charts
    this.initCanvasCharts();

    // Fetch initial live data
    await this.refreshDashboardData();

    // Ambient mouse follower for subtle glow
    window.addEventListener("pointermove", (e) => {
      const g1 = document.querySelector(".glow-1");
      const g2 = document.querySelector(".glow-2");
      if (g1 && g2) {
        const xPercent = (e.clientX / window.innerWidth) - 0.5;
        const yPercent = (e.clientY / window.innerHeight) - 0.5;
        g1.style.transform = `translate(${xPercent * 60}px, ${yPercent * 60}px)`;
        g2.style.transform = `translate(${-xPercent * 60}px, ${-yPercent * 60}px)`;
      }
    });

    // Resize handler for high-DPI canvas charts
    window.addEventListener("resize", () => {
      this.initCanvasCharts();
    });
  }

  // --- AUDIO SYNTHESIS (Tactile UI Feedback) ---
  initSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    } catch (e) {}
  }

  playSound(type = "click") {
    if (this.isMuted || !this.audioCtx) return;
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }

    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    if (type === "click") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.06);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.start(t);
      osc.stop(t + 0.06);
    } else if (type === "success") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(640, t + 0.15);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.18);
    }
  }

  // --- 3D CARD TILT ON MOUSE HOVER ---
  initTiltEffect() {
    const cards = document.querySelectorAll(".glass-panel");
    cards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.008, 1.008, 1.008)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      });
    });
  }

  // --- NAVIGATION & 3D VIEW TRANSITIONS ---
  initNavigation() {
    const navButtons = document.querySelectorAll(".nav-pill-btn[data-view]");
    navButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const targetView = btn.getAttribute("data-view");
        this.switchView(targetView);
        this.playSound("click");
      });
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        this.token = null;
        this.currentUser = null;
        this.showToast("Signed out. Returning to Login screen.");
        this.switchView("auth");
      });
    }

    // Hash navigation support
    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.replace("#", "") || "dashboard";
      this.switchView(hash, false);
    });
  }

  switchView(viewId, updateHash = true) {
    const currentActiveView = document.querySelector(".spatial-view.active");
    const targetView = document.getElementById(`view-${viewId}`) || document.getElementById(`view-dashboard`);

    if (!targetView) return;

    // Update nav active pill
    document.querySelectorAll(".nav-pill-btn").forEach((btn) => {
      if (btn.getAttribute("data-view") === viewId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    if (currentActiveView && currentActiveView !== targetView) {
      currentActiveView.style.opacity = "0";
      currentActiveView.style.transform = "translate3d(0, -15px, -50px) scale(0.97)";
      
      setTimeout(() => {
        currentActiveView.classList.remove("active");
        currentActiveView.style.display = "none";

        targetView.style.display = "block";
        // Force reflow
        void targetView.offsetWidth;

        targetView.classList.add("active");
        targetView.style.opacity = "1";
        targetView.style.transform = "translate3d(0, 0, 0) scale(1)";

        // Re-render canvas charts if dashboard is active
        if (viewId === "dashboard") {
          this.initCanvasCharts();
        }
      }, 250);
    } else {
      targetView.style.display = "block";
      targetView.classList.add("active");
      targetView.style.opacity = "1";
      targetView.style.transform = "translate3d(0, 0, 0) scale(1)";
    }

    this.currentView = viewId;
    if (updateHash) {
      window.location.hash = viewId;
    }
  }

  // --- AUTH STATUS & AUTO-LOGIN ---
  async checkAuthStatus() {
    if (this.token) {
      try {
        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${this.token}` }
        });
        if (res.ok) {
          const user = await res.json();
          this.currentUser = user;
          this.updateUserUI(user);
          this.switchView("dashboard");
          return;
        }
      } catch (e) {}
    }

    // Default to David Owner demo experience or auth screen
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
        this.updateUserUI(this.currentUser);
        this.switchView("dashboard");
        return;
      } catch (e) {}
    }

    // Pre-populate with default demo user so dashboard works immediately
    this.currentUser = {
      name: "David Owner",
      email: "admin@cryptonest.io",
      walletAddress: "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7",
      balance: 234.42
    };
    this.updateUserUI(this.currentUser);
  }

  updateUserUI(user) {
    const nameEl = document.querySelector(".user-name");
    const roleEl = document.querySelector(".user-role");
    const walletBalanceEl = document.getElementById("walletBalanceTop");
    const sliderBalance = document.getElementById("sliderBalanceVal");

    if (nameEl) nameEl.textContent = user.name || "David Owner";
    if (roleEl) roleEl.textContent = user.email || "admin@cryptonest.io";
    if (walletBalanceEl) walletBalanceEl.textContent = `$${Number(user.balance || 234.42).toFixed(2)}`;
    if (sliderBalance) sliderBalance.textContent = Number(user.balance || 234.42).toFixed(2);
  }

  // --- AUTHENTICATION & 3D FLIP CARD ---
  initAuthForms() {
    const flipCard = document.getElementById("authFlipCard");
    const toRegisterBtn = document.getElementById("toRegisterTrigger");
    const toLoginBtn = document.getElementById("toLoginTrigger");
    const demoLoginBtn = document.getElementById("demoLoginBtn");

    if (toRegisterBtn && flipCard) {
      toRegisterBtn.addEventListener("click", (e) => {
        e.preventDefault();
        flipCard.classList.add("flipped");
        this.playSound("click");
      });
    }

    if (toLoginBtn && flipCard) {
      toLoginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        flipCard.classList.remove("flipped");
        this.playSound("click");
      });
    }

    if (demoLoginBtn) {
      demoLoginBtn.addEventListener("click", async () => {
        this.playSound("click");
        await this.handleLogin("admin@cryptonest.io", "Password123!");
      });
    }

    // Login Form Submit
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value.trim();
        const pass = document.getElementById("loginPassword").value.trim();
        await this.handleLogin(email, pass);
      });
    }

    // Register Form Submit
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const pass = document.getElementById("regPassword").value.trim();
        const wallet = document.getElementById("regWallet").value.trim();

        try {
          const res = await fetch("/api/users/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password: pass, walletAddress: wallet })
          });
          const data = await res.json();
          if (res.ok) {
            this.token = data.token;
            this.currentUser = data.user;
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            this.updateUserUI(data.user);
            this.playSound("success");
            this.showToast("Account created successfully! Welcome.");
            this.switchView("dashboard");
          } else {
            this.showToast(`Registration failed: ${data.message}`);
          }
        } catch (err) {
          this.showToast("Server error during registration.");
        }
      });
    }
  }

  async handleLogin(email, password) {
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        this.token = data.token;
        this.currentUser = data.user;
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        this.updateUserUI(data.user);
        this.playSound("success");
        this.showToast(`Welcome back, ${data.user.name}!`);
        this.switchView("dashboard");
        await this.refreshDashboardData();
      } else {
        this.showToast(data.message || "Invalid credentials");
      }
    } catch (err) {
      this.showToast("Connection error. Using offline cached mode.");
      this.switchView("dashboard");
    }
  }

  // --- INTERACTIVE WALLET SLIDER ---
  initSlider() {
    const slider = document.getElementById("walletSlider");
    const sendInput = document.getElementById("swapSendAmount");
    const receiveInput = document.getElementById("swapReceiveAmount");

    if (slider) {
      slider.addEventListener("input", (e) => {
        const percent = Number(e.target.value);
        const maxBalance = this.currentUser ? this.currentUser.balance : 234.42;
        const sendVal = ((percent / 100) * maxBalance).toFixed(2);
        const receiveVal = (sendVal * 1.46).toFixed(2); // simulated exchange rate

        if (sendInput) sendInput.value = sendVal;
        if (receiveInput) receiveInput.value = receiveVal;
      });
    }

    const exchangeBtn = document.getElementById("btnExchangeAction");
    if (exchangeBtn) {
      exchangeBtn.addEventListener("click", () => {
        this.switchView("transfer");
        this.playSound("click");
      });
    }
  }

  // --- BLOCKCHAIN TRANSFER & MINT ACTIONS ---
  initBlockchainForms() {
    const transferForm = document.getElementById("blockchainTransferForm");
    if (transferForm) {
      transferForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const toAddress = document.getElementById("transferToAddress").value.trim();
        const amount = document.getElementById("transferAmount").value.trim();
        const tokenSymbol = document.getElementById("transferTokenSymbol").value;
        const note = document.getElementById("transferNote").value.trim();

        const submitBtn = transferForm.querySelector("button[type='submit']");
        submitBtn.disabled = true;
        submitBtn.textContent = "⏳ Broadcasting & Mining TX...";

        try {
          const res = await fetch("/api/blockchain/transfer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromAddress: this.currentUser ? this.currentUser.walletAddress : undefined,
              toAddress,
              amount: Number(amount),
              tokenSymbol,
              note
            })
          });

          const data = await res.json();
          if (res.ok) {
            this.playSound("success");
            this.showToast(`Transfer Confirmed! TX: ${data.txHash.slice(0, 10)}...`);
            transferForm.reset();
            await this.refreshDashboardData();
            this.switchView("dashboard");
          } else {
            this.showToast(`❌ Error: ${data.message}`);
          }
        } catch (err) {
          this.showToast("Failed to broadcast transaction.");
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = "🚀 Send Transaction";
        }
      });
    }

    // Offset / Retire Form
    const retireForm = document.getElementById("offsetRetireForm");
    if (retireForm) {
      retireForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const amount = document.getElementById("retireAmount").value.trim();
        const holder = document.getElementById("retireHolder").value.trim();
        const note = document.getElementById("retireNote").value.trim();

        try {
          const res = await fetch("/api/blockchain/retire", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromAddress: this.currentUser ? this.currentUser.walletAddress : undefined,
              amount: Number(amount),
              certificateHolder: holder,
              notes: note
            })
          });
          const data = await res.json();
          if (res.ok) {
            this.playSound("success");
            this.showToast(`🌱 Carbon Retired! Certificate: ${data.certificateId}`);
            retireForm.reset();
            await this.refreshDashboardData();
            this.switchView("dashboard");
          } else {
            this.showToast(`Offset error: ${data.message}`);
          }
        } catch (err) {
          this.showToast("Server error during offset.");
        }
      });
    }
  }

  // --- PROJECTS & QR CODES ---
  initProjectsView() {
    const addProjectForm = document.getElementById("addProjectForm");
    if (addProjectForm) {
      addProjectForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("projName").value.trim();
        const location = document.getElementById("projLocation").value.trim();
        const category = document.getElementById("projCategory").value;
        const carbonSaved = document.getElementById("projCarbon").value;
        const description = document.getElementById("projDesc").value.trim();

        try {
          const res = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, location, category, carbonSaved: Number(carbonSaved), description })
          });
          if (res.ok) {
            this.playSound("success");
            this.showToast("🌿 New Blue Carbon Project registered!");
            addProjectForm.reset();
            await this.loadProjects();
            this.switchView("projects");
          }
        } catch (err) {
          this.showToast("Failed to save project.");
        }
      });
    }
  }

  async loadProjects() {
    const container = document.getElementById("projectsContainer");
    if (!container) return;

    try {
      const res = await fetch("/api/projects");
      const projects = await res.json();

      container.innerHTML = projects.map(p => `
        <div class="glass-panel project-spatial-card">
          <div class="card-top-row">
            <span class="project-card-badge ${p.status === 'Verified' ? 'badge-verified' : 'badge-active'}">
              ● ${p.status}
            </span>
            <span style="font-size:12px; color:var(--text-dim); font-family:var(--font-mono);">${p.category}</span>
          </div>
          <div>
            <h3 class="project-card-title">${p.name}</h3>
            <p style="font-size:12px; color:var(--neon-lime); margin: 4px 0 8px;">📍 ${p.location}</p>
            <p class="project-card-desc">${p.description}</p>
          </div>
          <div class="project-metric-row">
            <div class="metric-item">
              <span class="metric-label">Carbon Sequestered</span>
              <span class="metric-value">${Number(p.carbonSaved).toLocaleString()} kg CO₂</span>
            </div>
            <div class="metric-item" style="text-align:right;">
              <span class="metric-label">Target Credits</span>
              <span class="metric-value">${Number(p.targetCredits).toLocaleString()} BCX</span>
            </div>
          </div>
          <div style="display:flex; gap:10px; margin-top:8px;">
            <button class="mini-glass-btn" style="flex:1;" onclick="window.spatialApp.viewQRCode(${p.id})">📱 View QR</button>
            <button class="mini-glass-btn" style="flex:1; background:rgba(189,247,43,0.15); color:var(--neon-lime);" onclick="window.spatialApp.quickOffsetProject(${p.id}, '${p.name}')">Offset Now</button>
          </div>
        </div>
      `).join("");
      this.initTiltEffect();
    } catch (err) {}
  }

  async viewQRCode(projectId) {
    try {
      const res = await fetch(`/api/projects/qrcode/${projectId}`);
      const data = await res.json();
      
      const modal = document.getElementById("qrModal");
      const qrImg = document.getElementById("qrModalImage");
      const qrTitle = document.getElementById("qrModalTitle");
      if (modal && qrImg && qrTitle) {
        qrImg.src = data.qrCode;
        qrTitle.textContent = data.project ? data.project.name : "Project Verification QR";
        modal.style.display = "flex";
      }
    } catch (err) {
      this.showToast("Could not load QR code.");
    }
  }

  quickOffsetProject(projectId, name) {
    this.switchView("deposit");
    const holderInput = document.getElementById("retireHolder");
    const noteInput = document.getElementById("retireNote");
    if (holderInput && this.currentUser) holderInput.value = this.currentUser.name;
    if (noteInput) noteInput.value = `Direct offset for ${name}`;
  }

  // --- REFRESH DATA & HISTORY ---
  async refreshDashboardData() {
    try {
      // 1. Fetch Stats
      const statsRes = await fetch("/api/blockchain/stats");
      if (statsRes.ok) {
        const stats = await statsRes.json();
        const priceHuge = document.querySelector(".price-display-huge");
        if (priceHuge) priceHuge.textContent = stats.currentPriceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 });
      }

      // 2. Fetch History
      const histRes = await fetch("/api/blockchain/history?limit=10");
      if (histRes.ok) {
        const txs = await histRes.json();
        this.renderHistoryTable(txs);
      }

      // 3. Load projects in background
      await this.loadProjects();
    } catch (err) {}
  }

  renderHistoryTable(transactions) {
    const tbody = document.getElementById("historyTableBody");
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-dim); padding:20px;">No transactions recorded</td></tr>`;
      return;
    }

    tbody.innerHTML = transactions.map(tx => {
      const dateStr = tx.createdAt ? tx.createdAt.slice(0, 10) : "2026-04-23";
      const isBTC = tx.tokenSymbol === "BTC";
      const isETH = tx.tokenSymbol === "ETH";
      const tokenPrice = isBTC ? "$34,679.00 USD" : (isETH ? "$3,240.00 USD" : "$24.65 USD");
      const shortFrom = `${tx.fromAddress.slice(0, 6)}...${tx.fromAddress.slice(-4)}`;
      const shortTo = `${tx.toAddress.slice(0, 6)}...${tx.toAddress.slice(-4)}`;

      return `
        <tr>
          <td>${dateStr}</td>
          <td>
            <span class="table-token-badge">
              <span class="${isBTC ? 'token-icon-orange' : (isETH ? 'token-icon-lime' : 'token-icon-lime')}" style="width:18px; height:18px; font-size:10px;">
                ${isBTC ? '₿' : (isETH ? 'Ξ' : '🌿')}
              </span>
              ${tx.amount} ${tx.tokenSymbol}
            </span>
          </td>
          <td style="font-family:var(--font-mono); font-size:12px;">${tokenPrice}</td>
          <td style="color:var(--neon-lime); font-family:var(--font-mono); font-size:12px;">${shortFrom} → ${shortTo}</td>
          <td><span style="font-size:11px; color:var(--text-dim);">${tx.type || 'Transfer'}</span></td>
          <td style="font-weight:700;">$${(tx.amount * (isBTC ? 34679 : (isETH ? 3240 : 24.65))).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
          <td style="font-family:var(--font-mono);">${tx.blockNumber || 19284102}</td>
          <td>
            <button class="action-circle-btn" title="Inspect Hash" onclick="alert('Transaction Hash:\\n${tx.txHash}')">↗</button>
            <button class="action-circle-btn" title="Verify on Explorer">✓</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  showToast(message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "toast-spatial";
    toast.innerHTML = `<span>✨</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.35s ease";
      setTimeout(() => toast.remove(), 350);
    }, 3800);
  }

  // ========================================================
  // SPATIAL CANVAS CHARTS (Overview, General Stats, 3D Dominance)
  // ========================================================
  initCanvasCharts() {
    this.renderOverviewChart();
    this.renderGeneralStatsChart();
    this.render3DDominanceChart();
  }

  // 1. Overview Spline Chart (Matches top middle card in photo)
  renderOverviewChart() {
    const canvas = document.getElementById("overviewChartCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Y Grid lines
    const yLevels = [0.2, 0.45, 0.7, 0.95];
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;

    yLevels.forEach((level) => {
      const y = h * level;
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
    });

    // Spline curve points
    const points = [
      { x: 30, y: h * 0.75 },
      { x: w * 0.25, y: h * 0.72 },
      { x: w * 0.45, y: h * 0.45 },
      { x: w * 0.65, y: h * 0.42 },
      { x: w * 0.82, y: h * 0.58 },
      { x: w - 20, y: h * 0.52 }
    ];

    // Create curve path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);

    // Stroke spline with glowing neon line
    ctx.strokeStyle = "#bdf72b";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(189, 247, 43, 0.6)";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Fill underneath
    ctx.lineTo(points[points.length - 1].x, h);
    ctx.lineTo(points[0].x, h);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "rgba(189, 247, 43, 0.18)");
    grad.addColorStop(1, "rgba(189, 247, 43, 0.0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Target point + tooltip matching screenshot (+0.25%, May 25)
    const target = points[3];
    ctx.fillStyle = "#bdf72b";
    ctx.beginPath();
    ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw pill badge tooltip
    const pillW = 60;
    const pillH = 22;
    const pillX = target.x - pillW / 2;
    const pillY = target.y - 32;

    ctx.fillStyle = "rgba(18, 24, 34, 0.9)";
    ctx.strokeStyle = "rgba(189, 247, 43, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 11);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#bdf72b";
    ctx.font = "600 10px Plus Jakarta Sans";
    ctx.textAlign = "center";
    ctx.fillText("+0.25%", target.x, pillY + 14);
  }

  // 2. General Statistics Chart with Signature Hatched/Diagonal Stripes
  renderGeneralStatsChart() {
    const canvas = document.getElementById("generalStatsCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Y Axis levels: 12k, 10k, 6k, 3k
    const yGrid = [0.2, 0.45, 0.7, 0.9];
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    yGrid.forEach(pct => {
      ctx.beginPath();
      ctx.moveTo(35, h * pct);
      ctx.lineTo(w - 20, h * pct);
      ctx.stroke();
    });

    // Month points
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const stepX = (w - 70) / (months.length - 1);

    // Generate rising curve matching screenshot
    const curvePoints = [
      { x: 35 + 0 * stepX, y: h * 0.82 },
      { x: 35 + 1 * stepX, y: h * 0.80 },
      { x: 35 + 2 * stepX, y: h * 0.78 },
      { x: 35 + 3 * stepX, y: h * 0.76 },
      { x: 35 + 4 * stepX, y: h * 0.65 },
      { x: 35 + 5 * stepX, y: h * 0.58 },
      { x: 35 + 6 * stepX, y: h * 0.56 },
      { x: 35 + 7 * stepX, y: h * 0.54 },
      { x: 35 + 8 * stepX, y: h * 0.38 }, // Peak $33k
      { x: 35 + 9 * stepX, y: h * 0.48 },
      { x: 35 + 10 * stepX, y: h * 0.45 },
      { x: 35 + 11 * stepX, y: h * 0.52 }
    ];

    // Pattern creation: DIAGONAL STRIPES (Exact match to screenshot!)
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = 12;
    patternCanvas.height = 12;
    const pctx = patternCanvas.getContext("2d");
    pctx.strokeStyle = "rgba(212, 255, 50, 0.45)";
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.moveTo(0, 12);
    pctx.lineTo(12, 0);
    pctx.stroke();

    const stripePattern = ctx.createPattern(patternCanvas, "repeat");

    // Clip and fill the striped area
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const xc = (curvePoints[i].x + curvePoints[i + 1].x) / 2;
      const yc = (curvePoints[i].y + curvePoints[i + 1].y) / 2;
      ctx.quadraticCurveTo(curvePoints[i].x, curvePoints[i].y, xc, yc);
    }
    ctx.lineTo(curvePoints[curvePoints.length - 1].x, curvePoints[curvePoints.length - 1].y);
    ctx.lineTo(curvePoints[curvePoints.length - 1].x, h - 25);
    ctx.lineTo(curvePoints[0].x, h - 25);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = stripePattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // Outline the curve with glowing neon lime line
    ctx.beginPath();
    ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const xc = (curvePoints[i].x + curvePoints[i + 1].x) / 2;
      const yc = (curvePoints[i].y + curvePoints[i + 1].y) / 2;
      ctx.quadraticCurveTo(curvePoints[i].x, curvePoints[i].y, xc, yc);
    }
    ctx.lineTo(curvePoints[curvePoints.length - 1].x, curvePoints[curvePoints.length - 1].y);
    ctx.strokeStyle = "#ccff00";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(204, 255, 0, 0.5)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dots on each point
    curvePoints.forEach(pt => {
      ctx.fillStyle = "#ccff00";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Peak badge ($33k)
    const peak = curvePoints[8];
    const badgeW = 50;
    const badgeH = 22;
    ctx.fillStyle = "rgba(22, 28, 38, 0.95)";
    ctx.strokeStyle = "#ccff00";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(peak.x - badgeW / 2, peak.y - 28, badgeW, badgeH, 11);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "700 11px Plus Jakarta Sans";
    ctx.textAlign = "center";
    ctx.fillText("$33k", peak.x, peak.y - 13);

    // X Axis Month Labels
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "500 11px Plus Jakarta Sans";
    ctx.textAlign = "center";
    months.forEach((m, idx) => {
      ctx.fillText(m, 35 + idx * stepX, h - 8);
    });
  }

  // 3. Daily Relative Dominance (3D Perspective Polar/Pie Chart)
  render3DDominanceChart() {
    const canvas = document.getElementById("dominanceCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    const cx = w * 0.52;
    const cy = h * 0.56;
    const rx = Math.min(w, h) * 0.42;
    const ry = rx * 0.55; // 3D perspective squish

    // Slices matching screenshot (Emerald Green, Navy Blue, Purple, Teal, Lime)
    const slices = [
      { label: "Blue Carbon", val: 0.38, color: "#166534", stroke: "#22c55e" },
      { label: "Ethereum", val: 0.24, color: "#1e3a8a", stroke: "#3b82f6" },
      { label: "Bitcoin", val: 0.18, color: "#581c87", stroke: "#a855f7" },
      { label: "Solana", val: 0.12, color: "#0e7490", stroke: "#06b6d4" },
      { label: "Binance", val: 0.08, color: "#365314", stroke: "#bdf72b" }
    ];

    let startAngle = -Math.PI * 0.85;

    // Draw bottom shadow base for 3D depth
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, rx * 1.05, ry * 1.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.filter = "blur(8px)";
    ctx.fill();
    ctx.restore();

    // Draw 3D Slices with perspective
    slices.forEach((slice) => {
      const sliceAngle = slice.val * (Math.PI * 2);
      const endAngle = startAngle + sliceAngle;

      // 3D side depth extrusion
      ctx.beginPath();
      ctx.ellipse(cx, cy + 8, rx, ry, 0, startAngle, endAngle);
      ctx.lineTo(cx + Math.cos(endAngle) * rx, cy + Math.sin(endAngle) * ry);
      ctx.ellipse(cx, cy, rx, ry, 0, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fill();

      // Top face
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.ellipse(cx, cy, rx, ry, 0, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.fill();
      ctx.strokeStyle = slice.stroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      startAngle = endAngle;
    });

    // Central circular glass hub
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.28, ry * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(18, 24, 34, 0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// Global bootstrap
document.addEventListener("DOMContentLoaded", () => {
  window.spatialApp = new SpatialApp();
});
