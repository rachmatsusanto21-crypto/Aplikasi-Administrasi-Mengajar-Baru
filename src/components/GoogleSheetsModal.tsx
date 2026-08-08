import React, { useState, useEffect } from "react";
import { FileSpreadsheet, Copy, Check, RefreshCw, X, Database, AlertTriangle, HelpCircle, ChevronDown, ChevronUp, Mail, Laptop, Smartphone, CheckCircle2 } from "lucide-react";
import { GASConfig, UserAccount } from "../types";
import { DEFAULT_GAS_CODE } from "../lib/gasScriptConstant";

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: GASConfig;
  onSaveConfig?: (config: GASConfig) => void;
  sheetsUrl?: string;
  onUpdateSheetsUrl?: (url: string) => void;
  onSyncAllData?: () => Promise<boolean>;
  allData?: any;
  users?: UserAccount[];
  activeUserEmail?: string;
  onSelectUserEmail?: (email: string) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  sheetsUrl: propSheetsUrl,
  onUpdateSheetsUrl,
  onSyncAllData,
  allData,
  users = [],
  activeUserEmail = "rachmatsusanto21@guru.sd.belajar.id",
  onSelectUserEmail,
}) => {
  const [copied, setCopied] = useState(false);
  const [gasScript, setGasScript] = useState<string>(DEFAULT_GAS_CODE);
  const [loadingScript, setLoadingScript] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string>(
    activeUserEmail || (users[0]?.email || "rachmatsusanto21@guru.sd.belajar.id")
  );
  const [autoSyncEmailStatus, setAutoSyncEmailStatus] = useState<string | null>(null);

  const activeSheetsUrl = propSheetsUrl ?? config?.webAppUrl ?? "";

  // Auto-fetch deployment URL associated with current selected email from server
  const fetchUserConfigByEmail = async (email: string) => {
    if (!email) return;
    try {
      const res = await fetch(`/api/user-config?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.webAppUrl && data.webAppUrl !== activeSheetsUrl) {
          handleUrlChange(data.webAppUrl, email);
          setAutoSyncEmailStatus(`✅ URL Web App otomatis dimuat dari profil email: ${email}`);
        } else if (data.webAppUrl) {
          setAutoSyncEmailStatus(`✅ URL Web App tersambung dengan email: ${email}`);
        } else {
          setAutoSyncEmailStatus(`ℹ️ Email ${email} belum menyimpan URL. Isikan URL di bawah untuk menghubungkan.`);
        }
      }
    } catch (e) {
      console.error("Gagal memuat konfigurasi user email:", e);
    }
  };

  const handleUrlChange = (url: string, targetEmail?: string) => {
    const currentEmail = targetEmail || selectedEmail;
    if (onUpdateSheetsUrl) {
      onUpdateSheetsUrl(url);
    }
    if (onSaveConfig && config) {
      onSaveConfig({ ...config, webAppUrl: url, email: currentEmail });
    }

    // Persist to server user-config for multi-device cross syncing
    if (currentEmail && url) {
      fetch("/api/user-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail, webAppUrl: url }),
      }).catch((err) => console.error("Gagal menyimpan config ke server:", err));
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetch("/api/gas/script")
        .then((res) => res.text())
        .then((text) => {
          if (text && (text.startsWith("/**") || text.includes("function doGet"))) {
            setGasScript(text);
          } else {
            setGasScript(DEFAULT_GAS_CODE);
          }
        })
        .catch(() => {
          setGasScript(DEFAULT_GAS_CODE);
        });

      if (selectedEmail) {
        fetchUserConfigByEmail(selectedEmail);
      }
    }
  }, [isOpen]);

  const handleEmailSelect = (email: string) => {
    setSelectedEmail(email);
    if (onSelectUserEmail) {
      onSelectUserEmail(email);
    }
    fetchUserConfigByEmail(email);
  };

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gasScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSyncNow = async () => {
    if (!activeSheetsUrl || !activeSheetsUrl.trim()) {
      setSyncStatus("⚠️ Masukkan Web App Deployment URL terlebih dahulu.");
      return;
    }

    setSyncing(true);
    setSyncStatus(null);

    // Save configuration to server email store before syncing
    if (selectedEmail && activeSheetsUrl) {
      try {
        await fetch("/api/user-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: selectedEmail, webAppUrl: activeSheetsUrl.trim() }),
        });
      } catch (e) {
        console.error(e);
      }
    }

    try {
      if (onSyncAllData) {
        const success = await onSyncAllData();
        if (success) {
          setSyncStatus("✅ Seluruh data berhasil tersimpan & tersinkronisasi ke dalam 1 Folder Google Drive (Folder_Backup_dan_Sync_Administrasi_Guru)!");
        } else {
          setSyncStatus("⚠️ Gagal terhubung. Pastikan URL Web App sudah tepat dan hak akses diset ke 'Siapa Saja' (Anyone).");
        }
      } else {
        const cleanUrl = activeSheetsUrl.trim();
        const payload = {
          action: "syncAll",
          sheet: "MasterData",
          data: allData || {},
          timestamp: new Date().toISOString(),
          email: selectedEmail,
        };

        const res = await fetch(cleanUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify(payload),
        });

        const textResponse = await res.text();

        try {
          const json = JSON.parse(textResponse);
          if (json.status === "success" || json.result === "success") {
            setSyncStatus(`✅ ${json.message || "Seluruh data berhasil tersimpan & tersinkronisasi ke dalam 1 Folder Google Drive!"}`);
          } else {
            setSyncStatus(`⚠️ Respon Apps Script: ${json.message || json.error || "Gagal sinkronisasi"}`);
          }
        } catch {
          if (
            textResponse.includes("NOT_FOUND") ||
            textResponse.includes("The page could not be found") ||
            res.status === 404
          ) {
            setSyncStatus("❌ Gagal (Status 404 / Halaman Tidak Ditemukan): URL Web App Google Apps Script tidak valid atau belum dipublikasikan. Pastikan URL berawalan 'https://script.google.com/macros/s/...' dan berakhiran '/exec'.");
            setShowTroubleshooting(true);
          } else if (textResponse.includes("<!DOCTYPE") || textResponse.includes("<html") || textResponse.startsWith("The page")) {
            setSyncStatus("❌ Gagal: Google Apps Script mengembalikan halaman HTML/Login. Buka panduan Solusi di bawah!");
            setShowTroubleshooting(true);
          } else {
            setSyncStatus(`❌ Respon server bukan JSON: "${textResponse.slice(0, 80)}..."`);
          }
        }
      }
    } catch (err: any) {
      setSyncStatus(`❌ Kesalahan koneksi: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-green-800 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                Integrasi Google Sheets & Google Apps Script
              </h3>
              <p className="text-xs text-emerald-100">
                Hubungkan Google Sheet sebagai Database Utama & Penyimpanan Data Lintas Gawai (Multi-Device)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-700 dark:text-slate-300">
          {/* Multi-Device Email Sync Highlight Banner */}
          <div className="bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 rounded-2xl p-3.5 sm:p-4 text-indigo-950 dark:text-indigo-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 mt-0.5">
                <Laptop className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="font-extrabold text-sm text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <span>Fitur Lintas Gawai (HP, Tablet, Laptop)</span>
                    <span className="bg-indigo-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Otomatis
                    </span>
                  </h4>
                </div>
                <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                  Anda <b>tidak perlu lagi menyalin ulang Code.gs</b> atau mengisi ulang URL di setiap gawai (HP, Tablet, PC). Cukup hubungkan dengan email user Anda, maka URL integrasi akan aktif otomatis di mana pun Anda membuka aplikasi!
                </p>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="font-bold whitespace-nowrap text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Pilih Email User:
                  </span>
                  <select
                    value={selectedEmail}
                    onChange={(e) => handleEmailSelect(e.target.value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                  >
                    {users.length > 0 ? (
                      users.map((u) => (
                        <option key={u.id} value={u.email}>
                          {u.name} ({u.email})
                        </option>
                      ))
                    ) : (
                      <option value="rachmatsusanto21@guru.sd.belajar.id">
                        Rachmat Susanto (rachmatsusanto21@guru.sd.belajar.id)
                      </option>
                    )}
                  </select>
                </div>
                {autoSyncEmailStatus && (
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 pt-1">
                    {autoSyncEmailStatus}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Step 1: Apps Script Generator */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Salin Kode Google Apps Script (Code.gs)
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Tersalin!" : "Salin Kode GAS"}
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              Lakukan sekali di laptop/PC: Buka Google Sheet &gt; klik menu <b>Ekstensi</b> &gt; <b>Apps Script</b>. Hapus kode lama lalu tempel kode ini:
            </p>
            <div className="relative bg-slate-900 rounded-lg p-3 overflow-x-auto max-h-36 border border-slate-800">
              {loadingScript ? (
                <div className="text-slate-400 text-xs py-4 text-center">Memuat skrip Apps Script...</div>
              ) : (
                <pre className="text-[11px] font-mono text-emerald-300 leading-relaxed whitespace-pre font-normal">
                  {gasScript}
                </pre>
              )}
            </div>
          </div>

          {/* Step 2: Input Web App URL */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                Google Sheets Web App Deployment URL
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2.5">
              URL Web App di bawah tersimpan secara aman &amp; otomatis tersambung dengan email <b>{selectedEmail}</b>:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={activeSheetsUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3.5 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 font-mono text-slate-800 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncing || !activeSheetsUrl}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs whitespace-nowrap"
              >
                {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                {syncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}
              </button>
            </div>

            {syncStatus && (
              <div
                className={`text-xs mt-3 p-3 rounded-lg border font-medium ${
                  syncStatus.startsWith("✅")
                    ? "bg-emerald-100/80 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-rose-50 dark:bg-rose-950/80 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                }`}
              >
                {syncStatus}
              </div>
            )}
          </div>

          {/* Troubleshooting Section for Unexpected token T */}
          <div className="bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800/80 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTroubleshooting(!showTroubleshooting)}
              className="w-full p-3.5 text-left flex items-center justify-between font-bold text-xs text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 dark:hover:bg-amber-900/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Cara Mengatasi Error: <i>Unexpected token 'T', "The page c"... is not valid JSON</i>
              </span>
              {showTroubleshooting ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTroubleshooting && (
              <div className="p-4 pt-0 text-xs text-amber-950 dark:text-amber-100 space-y-2.5 border-t border-amber-200/60 dark:border-amber-800/60 mt-1">
                <p className="font-semibold text-rose-800 dark:text-rose-300">
                  Penyebab Error: Google Apps Script mengembalikan halaman HTML Login/Akses Ditolak bukannya data JSON. Hal ini terjadi karena setting izin akses di Google Apps Script belum benar.
                </p>
                <div className="space-y-2 bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="font-bold text-slate-800 dark:text-slate-200">Langkah Perbaikan (Wajib Dilakukan di Google Apps Script):</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 pl-1">
                    <li>
                      Buka Google Apps Script Editor Anda (menu <b>Ekstensi &gt; Apps Script</b> di Google Sheet).
                    </li>
                    <li>
                      Klik tombol biru <b>Terapkan (Deploy)</b> di pojok kanan atas &gt; pilih <b>Kelola Deployment (Manage deployments)</b> atau <b>Deployment Baru</b>.
                    </li>
                    <li>
                      Pada kolom <b>Akses (Who has access / Siapa yang memiliki akses)</b>, PASTIKAN memilih: <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold px-1.5 py-0.5 rounded">Siapa saja (Anyone)</span>. <i>Jangan pilih "Hanya saya" atau "Pemilik akun".</i>
                    </li>
                    <li>
                      Pastikan URL yang disalin berakhiran <code className="bg-slate-100 dark:bg-slate-800 px-1 font-bold text-indigo-700 dark:text-indigo-300">/exec</code>, BUKAN <code className="bg-slate-100 dark:bg-slate-800 px-1 text-rose-600 dark:text-rose-400 font-bold">/dev</code>.
                    </li>
                    <li>
                      Salin URL Web App terbaru tersebut dan tempelkan pada kolom di atas.
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};


