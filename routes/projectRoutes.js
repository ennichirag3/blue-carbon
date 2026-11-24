import express from "express";
import QRCode from "qrcode";
import db from "../database.js";

const router = express.Router();

// --- GET ALL PROJECTS ---
router.get("/", (req, res) => {
  try {
    const projects = db.prepare("SELECT * FROM projects ORDER BY id DESC").all();
    res.json(projects);
  } catch (err) {
    console.error("❌ Error fetching projects:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --- GET SINGLE PROJECT BY ID ---
router.get("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Attach MRV records if any
    const mrvRecords = db.prepare("SELECT * FROM mrv_records WHERE projectId = ? ORDER BY id DESC").all(id);
    res.json({ ...project, mrvRecords });
  } catch (err) {
    console.error("❌ Error fetching project:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --- CREATE A NEW PROJECT ---
router.post("/", (req, res) => {
  try {
    const { name, description, location, carbonSaved, targetCredits, category, verifier } = req.body;

    if (!name || !description || !location) {
      return res.status(400).json({ message: "Name, description, and location are required" });
    }

    const insert = db.prepare(`
      INSERT INTO projects (name, description, location, carbonSaved, targetCredits, creditsIssued, status, category, verifier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      description.trim(),
      location.trim(),
      Number(carbonSaved) || 0,
      Number(targetCredits) || 10000,
      Number(carbonSaved) || 0,
      "Active",
      category || "Mangrove Conservation",
      verifier || "Verra VCS Standard"
    );

    const newProject = db.prepare("SELECT * FROM projects WHERE id = ?").get(Number(result.lastInsertRowid));
    res.status(201).json(newProject);
  } catch (err) {
    console.error("❌ Error creating project:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --- UPDATE PROJECT ---
router.put("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ message: "Project not found" });
    }

    const { name, description, location, carbonSaved, targetCredits, status, category, verifier } = req.body;

    const update = db.prepare(`
      UPDATE projects SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        location = COALESCE(?, location),
        carbonSaved = COALESCE(?, carbonSaved),
        targetCredits = COALESCE(?, targetCredits),
        status = COALESCE(?, status),
        category = COALESCE(?, category),
        verifier = COALESCE(?, verifier)
      WHERE id = ?
    `);

    update.run(
      name || null,
      description || null,
      location || null,
      carbonSaved !== undefined ? Number(carbonSaved) : null,
      targetCredits !== undefined ? Number(targetCredits) : null,
      status || null,
      category || null,
      verifier || null,
      id
    );

    const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating project:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --- DELETE PROJECT ---
router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = db.prepare("DELETE FROM projects WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json({ message: "Project deleted successfully", id });
  } catch (err) {
    console.error("❌ Error deleting project:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --- QR CODE GENERATION ---
router.get("/qrcode/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const host = req.get("host") || "localhost:5001";
    const protocol = req.protocol || "http";
    const projectURL = `${protocol}://${host}/#projects`;

    const qrCodeData = await QRCode.toDataURL(projectURL, {
      color: {
        dark: "#ccff00",
        light: "#12171f"
      },
      width: 300,
      margin: 2
    });

    res.json({ qrCode: qrCodeData, url: projectURL, project });
  } catch (err) {
    console.error("❌ QR error:", err);
    res.status(500).json({ message: "Failed to generate QR code", error: err.message });
  }
});

// --- ADD MRV AUDIT RECORD ---
router.post("/:id/mrv", (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { carbonVerified, verificationMethod, verifiedBy, notes } = req.body;

    const insert = db.prepare(`
      INSERT INTO mrv_records (projectId, carbonVerified, verificationMethod, verifiedBy, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      projectId,
      Number(carbonVerified) || 0,
      verificationMethod || "Multispectral Biomass Satellite Scan",
      verifiedBy || "Verra VCS",
      notes || ""
    );

    // Update project carbonSaved
    db.prepare(`
      UPDATE projects SET
        carbonSaved = carbonSaved + ?,
        creditsIssued = creditsIssued + ?
      WHERE id = ?
    `).run(Number(carbonVerified) || 0, Number(carbonVerified) || 0, projectId);

    const mrv = db.prepare("SELECT * FROM mrv_records WHERE id = ?").get(Number(result.lastInsertRowid));
    res.status(201).json(mrv);
  } catch (err) {
    console.error("❌ MRV error:", err);
    res.status(500).json({ message: "Failed to record MRV", error: err.message });
  }
});

export default router;
