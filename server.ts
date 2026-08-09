import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { DEFAULT_GAS_CODE } from "./src/lib/gasScriptConstant.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = 3000;

// User Config File persistence for multi-device sync by Email
const USER_CONFIG_FILE = path.join(process.cwd(), "user_configs.json");
const BACKUPS_DIR = path.join(process.cwd(), "backups");

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  } catch (e) {
    console.error("Failed to create backups directory:", e);
  }
}

function readUserConfigs(): Record<string, any> {
  try {
    if (fs.existsSync(USER_CONFIG_FILE)) {
      const data = fs.readFileSync(USER_CONFIG_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading user configs file:", e);
  }
  return {};
}

function saveUserConfig(email: string, config: { webAppUrl: string; sheetId?: string }) {
  try {
    const current = readUserConfigs();
    const cleanEmail = email.toLowerCase().trim();
    current[cleanEmail] = {
      ...current[cleanEmail],
      ...config,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(USER_CONFIG_FILE, JSON.stringify(current, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving user config:", e);
  }
}

// API endpoint to fetch user Google Sheets Web App URL by email
app.get("/api/user-config", (req, res) => {
  const email = (req.query.email as string)?.toLowerCase()?.trim();
  if (!email) {
    return res.status(400).json({ error: "Email parameter required" });
  }
  const configs = readUserConfigs();
  const userConfig = configs[email] || {};
  return res.json({
    email,
    webAppUrl: userConfig.webAppUrl || "",
    sheetId: userConfig.sheetId || "",
  });
});

// API endpoint to save user Google Sheets Web App URL by email
app.post("/api/user-config", (req, res) => {
  const { email, webAppUrl, sheetId } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email required" });
  }
  saveUserConfig(email, { webAppUrl: webAppUrl || "", sheetId: sheetId || "" });
  return res.json({
    status: "success",
    message: `Konfigurasi URL Google Sheets berhasil tersambung secara otomatis dengan email: ${email}`,
  });
});

// ==========================================
// DEDICATED APP BACKUP FOLDER API ENDPOINTS
// ==========================================

const AUTO_SYNC_FILE = path.join(BACKUPS_DIR, "auto_sync_latest.json");

// Fetch the latest global application data snapshot for automatic multi-device restore
app.get("/api/backup/latest", (req, res) => {
  try {
    if (fs.existsSync(AUTO_SYNC_FILE)) {
      const content = fs.readFileSync(AUTO_SYNC_FILE, "utf-8");
      const parsed = JSON.parse(content);
      return res.json({
        status: "success",
        timestamp: parsed.timestamp || parsed.backupDate || null,
        data: parsed.data || null,
        schoolName: parsed.schoolName || "",
      });
    }
    return res.json({ status: "empty", message: "Belum ada data backup di cloud" });
  } catch (err: any) {
    console.error("Error reading latest backup snapshot:", err);
    return res.status(500).json({ error: "Gagal membaca snapshot data terbaru" });
  }
});

// Save / Auto-sync the latest global application data snapshot
app.post("/api/backup/save-latest", (req, res) => {
  try {
    const { timestamp, schoolName, data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Payload data tidak valid" });
    }

    const payload = {
      timestamp: timestamp || new Date().toISOString(),
      schoolName: schoolName || data?.schoolIdentity?.schoolName || "Sekolah",
      data,
    };

    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    fs.writeFileSync(AUTO_SYNC_FILE, JSON.stringify(payload, null, 2), "utf-8");

    return res.json({
      status: "success",
      timestamp: payload.timestamp,
      message: "Data berhasil tersimpan di server cloud dan siap direstore di perangkat lain!",
    });
  } catch (err: any) {
    console.error("Error saving latest backup snapshot:", err);
    return res.status(500).json({ error: "Gagal menyimpan snapshot data terbaru ke server" });
  }
});

// 1. List backup files in the app's dedicated backup folder
app.get("/api/backup/list", (req, res) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const files = fs.readdirSync(BACKUPS_DIR);
    const backupList = files
      .filter((file) => file.endsWith(".json"))
      .map((file) => {
        const filePath = path.join(BACKUPS_DIR, file);
        const stats = fs.statSync(filePath);
        let schoolName = "Sekolah";
        let backupDate = stats.mtime.toISOString();
        let totalItems = 0;

        try {
          const content = fs.readFileSync(filePath, "utf-8");
          const parsed = JSON.parse(content);
          schoolName = parsed.schoolName || parsed.data?.schoolIdentity?.schoolName || "Sekolah";
          backupDate = parsed.backupDate || parsed.timestamp || stats.mtime.toISOString();
          if (parsed.data && typeof parsed.data === "object") {
            totalItems = Object.keys(parsed.data).reduce((acc, k) => {
              const val = parsed.data[k];
              return acc + (Array.isArray(val) ? val.length : 1);
            }, 0);
          }
        } catch (e) {
          // ignore parse error
        }

        return {
          filename: file,
          schoolName,
          backupDate,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`,
          totalItems,
          location: "Folder Backup Aplikasi Server",
        };
      })
      .sort((a, b) => new Date(b.backupDate).getTime() - new Date(a.backupDate).getTime());

    return res.json({ status: "success", backups: backupList });
  } catch (err: any) {
    console.error("Error listing backups:", err);
    return res.status(500).json({ error: "Gagal membaca folder backup aplikasi" });
  }
});

// 2. Upload / Save new backup file to dedicated app backup folder
app.post("/api/backup/upload", (req, res) => {
  try {
    const { filename, schoolName, backupDate, data, rawJson } = req.body;

    let payloadToSave: any;
    if (rawJson) {
      try {
        payloadToSave = typeof rawJson === "string" ? JSON.parse(rawJson) : rawJson;
      } catch (e) {
        return res.status(400).json({ error: "Format JSON tidak valid" });
      }
    } else if (data) {
      payloadToSave = {
        backupDate: backupDate || new Date().toISOString(),
        schoolName: schoolName || data?.schoolIdentity?.schoolName || "SDN PISANGCANDI 1",
        data,
      };
    } else {
      return res.status(400).json({ error: "Payload data backup tidak ditemukan" });
    }

    const dateStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const cleanSchoolName = (schoolName || payloadToSave.schoolName || "Sekolah").replace(/[^a-zA-Z0-9]/g, "_");
    const targetFilename = filename || `Backup_Administrasi_Guru_${cleanSchoolName}_${dateStr}.json`;

    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const targetPath = path.join(BACKUPS_DIR, targetFilename);
    fs.writeFileSync(targetPath, JSON.stringify(payloadToSave, null, 2), "utf-8");

    return res.json({
      status: "success",
      filename: targetFilename,
      message: `File backup ${targetFilename} berhasil disimpan di Folder Backup Khusus Aplikasi!`,
    });
  } catch (err: any) {
    console.error("Error uploading backup:", err);
    return res.status(500).json({ error: "Gagal menyimpan file backup ke folder server" });
  }
});

// 3. Download backup file from dedicated app backup folder
app.get("/api/backup/download/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    const targetPath = path.join(BACKUPS_DIR, safeFilename);

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: "File backup tidak ditemukan" });
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);
    return res.sendFile(targetPath);
  } catch (err: any) {
    console.error("Error downloading backup:", err);
    return res.status(500).json({ error: "Gagal mengunduh file backup" });
  }
});

// 4. Delete backup file from dedicated app backup folder
app.delete("/api/backup/delete/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    const targetPath = path.join(BACKUPS_DIR, safeFilename);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }

    return res.json({ status: "success", message: `File backup ${safeFilename} berhasil dihapus` });
  } catch (err: any) {
    console.error("Error deleting backup:", err);
    return res.status(500).json({ error: "Gagal menghapus file backup" });
  }
});

// API route for AI Generation with Auto-Retry for 503/429 temporary errors
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { prompt, model = "gemini-3.6-flash", manualApiKey, systemInstruction } = req.body;

    let targetModel = model;
    if (!targetModel || targetModel.includes("2.5") || targetModel.includes("1.5") || targetModel.includes("2.0")) {
      targetModel = "gemini-3.6-flash";
    }

    const apiKey = manualApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: "Kunci API Gemini tidak ditemukan. Harap masukkan API Key secara manual atau pastikan GEMINI_API_KEY telah dikonfigurasi.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Auto retry loop for 503 (high demand) or 429 (rate limit)
    let lastError: any = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: prompt,
          config: systemInstruction
            ? {
                systemInstruction: systemInstruction,
                temperature: 0.7,
              }
            : {
                temperature: 0.7,
              },
        });

        if (response && response.text) {
          return res.json({ result: response.text });
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const isTemporary =
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        if (isTemporary && attempt < maxRetries) {
          console.warn(`AI Generation attempt ${attempt} failed with temporary error: ${errMsg}. Retrying in ${attempt * 1500}ms...`);
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
          continue;
        }

        // If not temporary or out of attempts, stop retrying
        break;
      }
    }

    // Format error message for human readability
    const rawError = String(lastError?.message || lastError || "");
    if (rawError.includes("503") || rawError.includes("high demand") || rawError.includes("UNAVAILABLE")) {
      return res.status(503).json({
        error: "Server Google Gemini sedang mengalami lonjakan trafik tinggi (503 High Demand). Mohon tunggu beberapa detik lalu tekan tombol 'Coba Lagi'.",
      });
    } else if (rawError.includes("429") || rawError.includes("RESOURCE_EXHAUSTED")) {
      return res.status(429).json({
        error: "Batas kuota Gemini API tercapai (429 Rate Limit). Mohon tunggu sejenak sebelum mencoba kembali.",
      });
    }

    return res.status(500).json({
      error: rawError || "Terjadi kesalahan saat memproses permintaan AI.",
    });
  } catch (error: any) {
    console.error("AI Generation error:", error);
    return res.status(500).json({
      error: error?.message || "Terjadi kesalahan saat memproses permintaan AI.",
    });
  }
});

// API route for generating Google Apps Script Code
app.get("/api/gas/script", (req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(DEFAULT_GAS_CODE);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Administrasi Guru berjalan di http://0.0.0.0:${PORT}`);
  });
}

startServer();
