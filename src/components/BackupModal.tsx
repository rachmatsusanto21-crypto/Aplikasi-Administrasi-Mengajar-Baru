import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  Upload,
  HardDrive,
  Cloud,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  Database,
  FolderArchive,
  Trash2,
  FileJson,
  ArrowUpRight,
  ShieldCheck,
  Server,
  CloudUpload,
  CloudDownload,
  FolderPlus,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import { SchoolIdentity, GASConfig } from "../types";
import { exportDataToJSON, saveToStorage, STORAGE_KEYS } from "../lib/storage";
import { DEFAULT_GAS_CODE } from "../lib/gasScriptConstant";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolIdentity: SchoolIdentity;
  allData: Record<string, any>;
  onRestoreData?: (newData: Record<string, any>) => void;
  gasConfig?: GASConfig;
}

interface ServerBackupItem {
  filename: string;
  schoolName: string;
  backupDate: string;
  sizeBytes: number;
  sizeFormatted: string;
  totalItems: number;
  location: string;
}

interface CloudBackupItem {
  id: string;
  filename: string;
  backupDate: string;
  sizeBytes: number;
  sizeFormatted: string;
  downloadUrl?: string;
  location: string;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  schoolIdentity,
  allData,
  onRestoreData,
  gasConfig,
}) => {
  const [activeTab, setActiveTab] = useState<"server" | "cloud" | "guide">("server");
  const [serverBackups, setServerBackups] = useState<ServerBackupItem[]>([]);
  const [cloudBackups, setCloudBackups] = useState<CloudBackupItem[]>([]);
  const [selectedCloudIds, setSelectedCloudIds] = useState<string[]>([]);
  const [confirmDeleteCloudIds, setConfirmDeleteCloudIds] = useState<string[] | null>(null);
  const [isDeletingCloud, setIsDeletingCloud] = useState(false);
  const [loadingServerList, setLoadingServerList] = useState(false);
  const [loadingCloudList, setLoadingCloudList] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const localFileInputRef = useRef<HTMLInputElement>(null);
  const cloudFileInputRef = useRef<HTMLInputElement>(null);

  const webAppUrl = gasConfig?.webAppUrl?.trim() || "";

  // Fetch backups from dedicated server folder
  const fetchServerBackups = async () => {
    setLoadingServerList(true);
    try {
      const res = await fetch("/api/backup/list");
      if (res.ok) {
        const text = await res.text();
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch (e) {
          // Response is non-JSON (e.g. 404 HTML page on static host)
        }
        if (json && json.backups) {
          setServerBackups(json.backups);
        }
      }
    } catch (e) {
      console.warn("Folder backup server tidak terjangkau (404/offline):", e);
    } finally {
      setLoadingServerList(false);
    }
  };

  // Fetch backups from Google Drive dedicated folder via GAS
  const fetchCloudBackups = async () => {
    if (!webAppUrl) {
      setActionMessage({
        type: "error",
        text: "URL Google Apps Script / Drive belum terhubung. Silakan atur URL Web App terlebih dahulu.",
      });
      return;
    }
    setLoadingCloudList(true);
    try {
      const fetchUrl = webAppUrl.includes("?")
        ? `${webAppUrl}&action=listBackups`
        : `${webAppUrl}?action=listBackups`;

      const res = await fetch(fetchUrl);
      const rawText = await res.text();

      let json: any = null;
      try {
        json = JSON.parse(rawText);
      } catch (pErr) {
        // Response is not JSON (likely 404, Vercel page, or Google Login/Permission HTML page)
        if (
          rawText.includes("NOT_FOUND") ||
          rawText.includes("The page could not be found") ||
          res.status === 404
        ) {
          setActionMessage({
            type: "error",
            text: `❌ URL Web App tidak dapat dijangkau (Status 404 / Halaman tidak ditemukan).
Pastikan URL Web App diisi dengan URL Google Apps Script yang valid (berawalan https://script.google.com/macros/s/.../exec) dan diset ke 'Siapa saja' (Anyone).`,
          });
          return;
        }

        if (
          rawText.includes("DriveApp") ||
          rawText.includes("authorization") ||
          rawText.includes("permission") ||
          rawText.includes("Service Accounts") ||
          rawText.includes("getFoldersByName")
        ) {
          setActionMessage({
            type: "error",
            text: `🔑 OTORISASI GOOGLE DRIVE DIPERLUKAN!
Di editor Google Apps Script:
1. Pilih fungsi 'initPermissions' di menu dropdown toolbar atas.
2. Klik tombol 'Jalankan' (Run) -> Klik 'Tinjau Izin' (Review Permissions) -> Pilih Akun Google -> Klik 'Lanjutan' (Advanced) -> 'Buka Project' -> 'Izinkan' (Allow).
3. Setelah itu, pastikan Deploy diset 'Siapa saja' (Anyone), lalu klik 'Muat Ulang Berkas Cloud'!`,
          });
          return;
        }
      }

      if (json && json.status === "success" && Array.isArray(json.backups)) {
        setCloudBackups(json.backups);
        setActionMessage({
          type: "success",
          text: `✅ Ditemukan ${json.backups.length} file backup di 1 folder Google Drive (${json.folderName || "Folder_Backup_dan_Sync_Administrasi_Guru"}).`,
        });
      } else if (
        json &&
        json.message &&
        (json.message.includes("DriveApp") ||
          json.message.includes("izin") ||
          json.message.includes("permission") ||
          json.message.includes("getFoldersByName"))
      ) {
        setActionMessage({
          type: "error",
          text: `🔑 OTORISASI GOOGLE DRIVE DIPERLUKAN!
Di editor Google Apps Script:
1. Pilih fungsi 'initPermissions' di menu dropdown toolbar atas.
2. Klik tombol 'Jalankan' (Run) -> Klik 'Tinjau Izin' (Review Permissions) -> Pilih Akun Google -> Klik 'Lanjutan' (Advanced) -> 'Buka Project' -> 'Izinkan' (Allow).
3. Setelah itu, klik 'Muat Ulang Berkas Cloud'!`,
        });
      } else if (
        json &&
        (json.message === "Web App Administrasi Guru Aktif!" ||
          json.message === "Web App Administrasi Guru & Drive Backup Aktif!" ||
          !Array.isArray(json.backups))
      ) {
        setActionMessage({
          type: "error",
          text: `⚠️ Respons Cloud: "${json.message || "Versi lama"}". Script Apps Script Anda belum versi terbaru. Silakan buka tab 'Panduan & Script', salin kodenya, lalu lakukan Deploy Baru (Deploy -> New deployment).`,
        });
      } else if (json) {
        setActionMessage({
          type: "error",
          text: `❌ Respons Cloud: ${json.message || "Format data tidak sesuai"}`,
        });
      } else {
        setActionMessage({
          type: "error",
          text: "Gagal menghubungkan ke Google Drive Web App. Pastikan Deployment Akses diset ke 'Anyone'.",
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: `❌ Terjadi kesalahan jaringan / CORS: ${err.message || err}`,
      });
    } finally {
      setLoadingCloudList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServerBackups();
      if (webAppUrl) {
        fetchCloudBackups();
      }
    }
  }, [isOpen, webAppUrl]);

  if (!isOpen) return null;

  // 1. Create instant snapshot in dedicated app backup folder
  const handleCreateServerSnapshot = async () => {
    setIsSyncing(true);
    setActionMessage(null);
    try {
      const payload = {
        schoolName: schoolIdentity.schoolName,
        backupDate: new Date().toISOString(),
        data: allData,
      };

      const res = await fetch("/api/backup/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let json: any = {};
      const responseText = await res.text();
      try {
        json = JSON.parse(responseText);
      } catch (err) {
        if (res.status === 404 || responseText.includes("NOT_FOUND")) {
          setActionMessage({
            type: "error",
            text: "⚠️ Endpoint server lokal tidak merespons API /api/backup/upload (Status 404). Gunakan tab 'Cloud Google Drive Folder' atau tombol 'Unduh Langsung' untuk membuat cadangan.",
          });
          return;
        }
        if (res.status === 413) {
          setActionMessage({
            type: "error",
            text: "Ukuran data backup terlalu besar melebihi batas server (413). Gunakan tombol 'Unduh Langsung'.",
          });
          return;
        }
        setActionMessage({
          type: "error",
          text: `Server merespons dengan status ${res.status}: ${responseText.slice(0, 100)}`,
        });
        return;
      }

      if (res.ok && json.status === "success") {
        setActionMessage({
          type: "success",
          text: `✅ ${json.message}`,
        });
        fetchServerBackups();
      } else {
        setActionMessage({
          type: "error",
          text: `❌ Gagal menyimpan backup: ${json.error || json.message || "Kesalahan server"}`,
        });
      }
    } catch (e: any) {
      setActionMessage({
        type: "error",
        text: `❌ Gagal membuat snapshot backup: ${e.message || e}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 2. Upload file JSON from computer into dedicated server backup folder & restore data
  const handleUploadFileToServerBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    setActionMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const contentStr = event.target?.result as string;
        const parsed = JSON.parse(contentStr);

        // ALWAYS restore data immediately to local state and storage
        if (onRestoreData) {
          onRestoreData(parsed);
        }

        let serverSaved = false;
        let serverErrorMsg = "";

        try {
          const res = await fetch("/api/backup/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              rawJson: parsed,
            }),
          });

          const responseText = await res.text();
          let json: any = null;
          try {
            json = JSON.parse(responseText);
          } catch {
            // Not JSON (e.g. 404 page)
          }

          if (res.ok && json && json.status === "success") {
            serverSaved = true;
          } else if (json && json.error) {
            serverErrorMsg = json.error;
          }
        } catch (serverErr) {
          console.warn("Tautan server backup tidak dapat dijangkau:", serverErr);
        }

        if (serverSaved) {
          setActionMessage({
            type: "success",
            text: `✅ File "${file.name}" BERHASIL DIRESTORE KE APLIKASI dan tersimpan di Folder Backup Server!`,
          });
          fetchServerBackups();
        } else {
          setActionMessage({
            type: "success",
            text: `✅ File "${file.name}" BERHASIL DIRESTORE KE APLIKASI! (Seluruh data Modul Ajar, Soal & Kisi-kisi, Nilai, dll sudah berhasil dipulihkan). ${serverErrorMsg ? `Note: ${serverErrorMsg}` : ""}`,
          });
        }
      } catch (err: any) {
        setActionMessage({
          type: "error",
          text: `❌ File backup tidak dapat dibaca: ${err.message || err}. Pastikan file dalam format JSON yang valid.`,
        });
      } finally {
        setIsSyncing(false);
        if (e.target) e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // 3. Upload current data to Cloud Google Drive folder
  const handleUploadToCloudDrive = async () => {
    if (!webAppUrl || !webAppUrl.trim()) {
      setActionMessage({
        type: "error",
        text: "URL Google Apps Script belum diatur. Silakan atur URL Web App terlebih dahulu di tab 'Panduan & Script'.",
      });
      return;
    }

    if (!webAppUrl.includes("script.google.com/macros/s/")) {
      setActionMessage({
        type: "error",
        text: "⚠️ URL Web App tidak valid. URL Google Apps Script harus berawalan 'https://script.google.com/macros/s/.../exec'. Silakan periksa kembali URL di tab 'Panduan & Script'.",
      });
      return;
    }

    setIsSyncing(true);
    setActionMessage(null);

    try {
      const uploadUrl = webAppUrl.includes("?")
        ? `${webAppUrl}&action=uploadBackup`
        : `${webAppUrl}?action=uploadBackup`;

      // Safely serialize body JSON
      const payloadString = JSON.stringify({
        action: "uploadBackup",
        schoolName: schoolIdentity.schoolName || "Sekolah",
        timestamp: new Date().toISOString(),
        data: {
          backupDate: new Date().toISOString(),
          schoolName: schoolIdentity.schoolName || "Sekolah",
          data: allData || {},
        },
      });

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: payloadString,
      });

      const rawText = await res.text();
      let result: any = null;
      try {
        result = JSON.parse(rawText);
      } catch (pErr) {
        // Response is non-JSON text / HTML
      }

      if (!result) {
        if (
          rawText.includes("NOT_FOUND") ||
          rawText.includes("The page could not be found") ||
          res.status === 404
        ) {
          setActionMessage({
            type: "error",
            text: `❌ URL Google Apps Script tidak dapat dijangkau (Status 404 / Halaman tidak ditemukan).
Pastikan URL Web App diisi dengan URL Google Apps Script yang tepat (berawalan https://script.google.com/macros/s/.../exec) dan diset ke 'Siapa saja' (Anyone).`,
          });
          return;
        }

        if (
          rawText.includes("DriveApp") ||
          rawText.includes("izin") ||
          rawText.includes("permission") ||
          rawText.includes("authorization") ||
          rawText.includes("getFoldersByName")
        ) {
          setActionMessage({
            type: "error",
            text: `🔑 OTORISASI GOOGLE DRIVE DIPERLUKAN!
Di editor Google Apps Script:
1. Pilih fungsi 'initPermissions' di menu dropdown toolbar atas.
2. Klik tombol 'Jalankan' (Run) -> Klik 'Tinjau Izin' (Review Permissions) -> Pilih Akun Google -> Klik 'Lanjutan' (Advanced) -> 'Buka Project' -> 'Izinkan' (Allow).
3. Setelah itu, pastikan Deploy diset 'Siapa saja' (Anyone), lalu klik lagi 'Unggah Backup ke Cloud Drive'!`,
          });
          return;
        }

        setActionMessage({
          type: "error",
          text: `❌ Respons Cloud bukan JSON valid: ${rawText.slice(0, 150)}`,
        });
        return;
      }

      const msg = (result.message || "").toString();

      // Check for Google Drive OAuth / DriveApp Permission exception in JSON result
      if (
        msg.includes("DriveApp") ||
        msg.includes("izin") ||
        msg.includes("permission") ||
        msg.includes("authorization") ||
        msg.includes("getFoldersByName")
      ) {
        setActionMessage({
          type: "error",
          text: `🔑 OTORISASI GOOGLE DRIVE DIPERLUKAN! 
Di editor Google Apps Script:
1. Pilih fungsi 'initPermissions' di menu dropdown toolbar atas.
2. Klik tombol 'Jalankan' (Run) -> Klik 'Tinjau Izin' (Review Permissions) -> Pilih Akun Google -> Klik 'Lanjutan' (Advanced) -> 'Buka Project' -> Klik 'Izinkan' (Allow).
3. Setelah itu, klik lagi tombol 'Unggah Backup ke Cloud Drive' di aplikasi ini!`,
        });
      } else if (
        msg === "Web App Administrasi Guru Aktif!" ||
        msg === "Web App Administrasi Guru & Drive Backup Aktif!" ||
        (!result.fileId && !result.folderName && (!msg || !msg.toLowerCase().includes("berhasil")))
      ) {
        setActionMessage({
          type: "error",
          text: `⚠️ Respons Cloud: "${msg || "OK"}". Script Apps Script Anda belum versi terbaru. Silakan klik tab 'Panduan & Script', salin kode script terbaru, lalu lakukan DEPLOY BARU (Deploy -> New deployment) di Google Apps Script.`,
        });
      } else if (result.status === "success" || result.fileId) {
        setActionMessage({
          type: "success",
          text: `✅ ${result.message || "File backup berhasil disimpan di folder Google Drive!"}`,
        });
        fetchCloudBackups();
      } else {
        setActionMessage({
          type: "error",
          text: `❌ Gagal upload ke Cloud: ${msg || "Respon error dari Google Apps Script"}`,
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: `❌ Terjadi kesalahan jaringan / CORS: ${err.message || err}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Download file from Cloud Google Drive
  const handleDownloadCloudBackup = async (fileId: string, filename: string) => {
    if (!webAppUrl) return;
    try {
      const res = await fetch(`${webAppUrl}?action=downloadBackup&fileId=${encodeURIComponent(fileId)}`);
      if (res.ok) {
        const jsonStr = await res.text();
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Gagal mengunduh file dari Cloud Google Drive.", e);
    }
  };

  // 5. Restore data from Cloud Google Drive
  const handleRestoreFromCloudBackup = async (fileId: string, filename: string) => {
    if (!webAppUrl) return;

    setIsSyncing(true);
    try {
      const res = await fetch(`${webAppUrl}?action=downloadBackup&fileId=${encodeURIComponent(fileId)}`);
      if (res.ok) {
        const text = await res.text();
        const json = JSON.parse(text);

        if (onRestoreData) {
          onRestoreData(json);
        } else {
          const restoredData = json.data || json;
          Object.keys(restoredData).forEach((key) => {
            if ((STORAGE_KEYS as any)[key]) {
              saveToStorage((STORAGE_KEYS as any)[key], restoredData[key]);
            }
          });
        }
        onClose();
      }
    } catch (e) {
      console.error("Gagal membaca file backup dari Cloud.", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // 6. Restore data from Server Backup file
  const handleRestoreFromServerBackup = async (filename: string) => {
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/backup/download/${encodeURIComponent(filename)}`);
      if (res.ok) {
        const json = await res.json();

        if (onRestoreData) {
          onRestoreData(json);
        } else {
          const restoredData = json.data || json;
          Object.keys(restoredData).forEach((key) => {
            if ((STORAGE_KEYS as any)[key]) {
              saveToStorage((STORAGE_KEYS as any)[key], restoredData[key]);
            }
          });
        }
        onClose();
      }
    } catch (e) {
      console.error("Gagal memuat file backup server.", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // 7. Delete server backup file
  const handleDeleteServerBackup = async (filename: string) => {
    try {
      const res = await fetch(`/api/backup/delete/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchServerBackups();
      }
    } catch (e) {
      console.error("Gagal menghapus file backup server.", e);
    }
  };

  // 7b. Cloud Backup selection & deletion handlers
  const handleToggleSelectCloud = (id: string) => {
    setSelectedCloudIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllCloud = () => {
    if (selectedCloudIds.length === cloudBackups.length) {
      setSelectedCloudIds([]);
    } else {
      setSelectedCloudIds(cloudBackups.map((c) => c.id));
    }
  };

  const handleDeleteCloudBackups = async (idsToDelete: string[]) => {
    if (!webAppUrl || idsToDelete.length === 0) return;

    setIsDeletingCloud(true);
    setActionMessage(null);

    try {
      let successCount = 0;
      for (const id of idsToDelete) {
        const deleteUrl = webAppUrl.includes("?")
          ? `${webAppUrl}&action=deleteBackup&fileId=${encodeURIComponent(id)}`
          : `${webAppUrl}?action=deleteBackup&fileId=${encodeURIComponent(id)}`;

        const res = await fetch(deleteUrl);
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          if (json.status === "success") {
            successCount++;
          }
        } catch (e) {
          if (res.ok) successCount++;
        }
      }

      setActionMessage({
        type: "success",
        text: `✅ Berhasil menghapus ${successCount} file backup dari Google Drive!`,
      });
      setSelectedCloudIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
      fetchCloudBackups();
    } catch (err: any) {
      setActionMessage({
        type: "error",
        text: `❌ Gagal menghapus file dari Google Drive: ${err.message || err}`,
      });
    } finally {
      setIsDeletingCloud(false);
      setConfirmDeleteCloudIds(null);
    }
  };

  // 8. Download direct local JSON backup file to browser downloads
  const handleDownloadDirectJson = () => {
    const backupPayload = {
      backupDate: new Date().toISOString(),
      schoolName: schoolIdentity.schoolName,
      data: allData,
    };
    const dateStr = new Date().toISOString().slice(0, 10);
    exportDataToJSON(backupPayload, `Backup_Administrasi_Guru_${schoolIdentity.schoolName.replace(/[^a-zA-Z0-9]/g, "_")}_${dateStr}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-indigo-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-teal-700">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <FolderArchive className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight">Pusat & Folder Backup Aplikasi</h3>
              <p className="text-xs text-emerald-200">
                Folder Cadangan Khusus Lokal Server & Integrasi Cloud Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab("server")}
            className={`px-4 py-2.5 rounded-t-xl flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "server"
                ? "bg-white dark:bg-slate-900 border-emerald-600 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Server className="w-4 h-4 text-emerald-600" />
            <span>Folder Backup Aplikasi (Lokal/Server)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px]">
              {serverBackups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("cloud")}
            className={`px-4 py-2.5 rounded-t-xl flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "cloud"
                ? "bg-white dark:bg-slate-900 border-indigo-600 text-indigo-700 dark:text-indigo-400 shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Cloud className="w-4 h-4 text-indigo-600" />
            <span>Cloud Google Drive Folder</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-[10px]">
              {cloudBackups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("guide")}
            className={`px-4 py-2.5 rounded-t-xl flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "guide"
                ? "bg-white dark:bg-slate-900 border-purple-600 text-purple-700 dark:text-purple-400 shadow-2xs"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <HelpCircle className="w-4 h-4 text-purple-600" />
            <span>Panduan & Script</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 dark:text-slate-200 text-xs sm:text-sm flex-1">
          {/* Status / Action Notification Banner */}
          {actionMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 shadow-2xs ${
                actionMessage.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
                  : "bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800"
              }`}
            >
              {actionMessage.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{actionMessage.text}</span>
            </div>
          )}

          {/* TAB 1: SERVER / DEDICATED APP BACKUP FOLDER */}
          {activeTab === "server" && (
            <div className="space-y-4">
              {/* Folder Banner & Quick Controls */}
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white text-sm block flex items-center gap-2">
                      <FolderArchive className="w-4 h-4 text-emerald-600" />
                      Folder Backup Khusus: <code className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded">/backups/</code>
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Tersimpan secara terisolasi khusus untuk aplikasi administrasi guru ini.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleCreateServerSnapshot}
                      disabled={isSyncing}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 text-xs shadow-2xs transition-colors"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Buat Snapshot Baru
                    </button>

                    <button
                      onClick={() => localFileInputRef.current?.click()}
                      disabled={isSyncing}
                      className="px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-xl flex items-center gap-1.5 text-xs transition-colors"
                    >
                      <CloudUpload className="w-4 h-4 text-emerald-600" />
                      Unggah File (.json)
                    </button>
                    <input
                      ref={localFileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleUploadFileToServerBackup}
                      className="hidden"
                    />

                    <button
                      onClick={handleDownloadDirectJson}
                      className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-colors"
                      title="Unduh langsung file backup ke komputer"
                    >
                      <Download className="w-4 h-4" />
                      Unduh Langsung
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <span>Jumlah berkas di folder: <b>{serverBackups.length} file</b></span>
                  <button
                    onClick={fetchServerBackups}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingServerList ? "animate-spin" : ""}`} />
                    Segarkan Folder
                  </button>
                </div>
              </div>

              {/* List of Server Backup Files */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Daftar Berkas Cadangan di Folder Aplikasi Server
                </h4>

                {loadingServerList ? (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                    <p className="text-xs">Memuat daftar file dari folder backup khusus...</p>
                  </div>
                ) : serverBackups.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <FileJson className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">Belum ada file backup di folder server.</p>
                    <p className="text-[11px] text-slate-500">
                      Klik "Buat Snapshot Baru" di atas untuk menyimpan cadangan pertama Anda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {serverBackups.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-emerald-500 transition-colors shadow-2xs"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5 break-all">
                            <FileJson className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{item.filename}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                            <span>📅 {new Date(item.backupDate).toLocaleString("id-ID")}</span>
                            <span>💾 {item.sizeFormatted}</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                              🏫 {item.schoolName}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <a
                            href={`/api/backup/download/${encodeURIComponent(item.filename)}`}
                            download
                            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1"
                            title="Unduh file ke komputer"
                          >
                            <Download className="w-3.5 h-3.5 text-indigo-600" />
                            Unduh
                          </a>

                          <button
                            onClick={() => handleRestoreFromServerBackup(item.filename)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                            title="Pulihkan data aplikasi dari file ini"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Pulihkan
                          </button>

                          <button
                            onClick={() => handleDeleteServerBackup(item.filename)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="Hapus file backup"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CLOUD GOOGLE DRIVE FOLDER */}
          {activeTab === "cloud" && (
            <div className="space-y-4">
              <div className="bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl p-4 border border-indigo-200 dark:border-indigo-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-200 dark:border-indigo-800 pb-3">
                  <div>
                    <span className="font-bold text-indigo-950 dark:text-indigo-200 text-sm block flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-indigo-600" />
                      Google Drive Folder (1 Tempat Backup & Sync): <code className="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded">Folder_Backup_dan_Sync_Administrasi_Guru</code>
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Tersambung langsung ke penyimpanan Google Drive akun Anda secara otomatis.
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleUploadToCloudDrive}
                      disabled={isSyncing || !webAppUrl}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 text-xs shadow-2xs transition-colors"
                    >
                      <CloudUpload className="w-4 h-4" />
                      {isSyncing ? "Mengunggah ke Cloud..." : "Unggah Backup ke Cloud Drive"}
                    </button>

                    <button
                      onClick={fetchCloudBackups}
                      disabled={loadingCloudList || !webAppUrl}
                      className="px-3 py-2 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 hover:bg-indigo-50 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingCloudList ? "animate-spin" : ""}`} />
                      Muat Ulang Berkas Cloud
                    </button>
                  </div>
                </div>

                {!webAppUrl && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                    <span>⚠️ Web App URL Google Apps Script belum terhubung.</span>
                    <button
                      onClick={() => setActiveTab("guide")}
                      className="font-bold underline text-amber-800 dark:text-amber-300 hover:text-amber-950"
                    >
                      Lihat Cara Menghubungkan
                    </button>
                  </div>
                )}
              </div>

              {/* Cloud Files List */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                    Daftar Berkas Cadangan di Google Drive Cloud ({cloudBackups.length})
                  </h4>

                  {cloudBackups.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSelectAllCloud}
                        className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline flex items-center gap-1"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCloudIds.length === cloudBackups.length && cloudBackups.length > 0}
                          onChange={handleSelectAllCloud}
                          className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>Pilih Semua</span>
                      </button>

                      {selectedCloudIds.length > 0 && (
                        <button
                          onClick={() => setConfirmDeleteCloudIds(selectedCloudIds)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs animate-fadeIn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Terpilih ({selectedCloudIds.length})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {loadingCloudList ? (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                    <p className="text-xs">Mengkoneksikan ke Google Drive Cloud...</p>
                  </div>
                ) : cloudBackups.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <Cloud className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">Belum ada file backup terdeteksi di Google Drive.</p>
                    <p className="text-[11px] text-slate-500">
                      Klik "Unggah Backup ke Cloud Drive" untuk membuat file cadangan di akun Google Anda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {cloudBackups.map((item) => {
                      const isSelected = selectedCloudIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`p-3 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors shadow-2xs ${
                            isSelected
                              ? "bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectCloud(item.id)}
                              className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div className="space-y-1">
                              <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5 break-all">
                                <Cloud className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span>{item.filename}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                                <span>📅 {new Date(item.backupDate).toLocaleString("id-ID")}</span>
                                <span>💾 {item.sizeFormatted}</span>
                                <span className="text-indigo-600 font-semibold">{item.location}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => handleDownloadCloudBackup(item.id, item.filename)}
                              className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1"
                              title="Unduh berkas dari Cloud ke gawai"
                            >
                              <CloudDownload className="w-3.5 h-3.5 text-indigo-600" />
                              Unduh
                            </button>

                            <button
                              onClick={() => handleRestoreFromCloudBackup(item.id, item.filename)}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                              title="Pulihkan data aplikasi dari Cloud"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Pulihkan
                            </button>

                            <button
                              onClick={() => setConfirmDeleteCloudIds([item.id])}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                              title="Hapus file backup ini dari Google Drive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GUIDE & SCRIPT GENERATOR */}
          {activeTab === "guide" && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Petunjuk Aktivasi Google Drive Backup otomatis (1 Menit)
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                  <li>Buka Google Spreadsheet atau Google Drive Anda.</li>
                  <li>
                    Pilih menu <b>Ekstensi</b> → <b>Apps Script</b>.
                  </li>
                  <li>Kosongkan seluruh kode bawaan Google Apps Script.</li>
                  <li>Salin seluruh kode script di bawah ini, lalu tempelkan (Paste) di Google Apps Script.</li>
                  <li>
                    Klik <b>Terapkan (Deploy)</b> → <b>Deployment baru</b> → Pilih jenis <b>Web App</b>.
                  </li>
                  <li>
                    Setel <b>Akses (Who has access)</b> ke <b>Siapa saja (Anyone)</b>.
                  </li>
                  <li>Klik Deploy, berikan izin akses Google Drive, lalu tempelkan URL Web App ke aplikasi.</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Kode Google Apps Script (Drive Backup Auto-Folder):</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(DEFAULT_GAS_CODE);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? "Tersalin!" : "Salin Kode Script"}
                  </button>
                </div>
                <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-48 border border-slate-800">
                  {DEFAULT_GAS_CODE}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            🔒 Backup tersimpan aman & dapat diakses dari gawai/HP/laptop mana saja.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
        {/* Confirmation Modal for Cloud Delete */}
        {confirmDeleteCloudIds && confirmDeleteCloudIds.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 animate-fadeIn backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-950 rounded-xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Konfirmasi Hapus File Cloud</h4>
                  <p className="text-xs text-slate-500">Google Drive Storage</p>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin menghapus <b>{confirmDeleteCloudIds.length} file backup</b> terpilih dari folder Google Drive Anda? Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setConfirmDeleteCloudIds(null)}
                  disabled={isDeletingCloud}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  onClick={() => handleDeleteCloudBackups(confirmDeleteCloudIds)}
                  disabled={isDeletingCloud}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  {isDeletingCloud ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menghapus...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ya, Hapus Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
