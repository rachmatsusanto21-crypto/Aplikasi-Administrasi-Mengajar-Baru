import React from "react";
import {
  School,
  Bot,
  FileSpreadsheet,
  Menu,
  Sun,
  Moon,
  Database,
  Users,
} from "lucide-react";
import { SchoolIdentity, AISettings } from "../types";

interface HeaderProps {
  schoolIdentity: SchoolIdentity;
  aiSettings: AISettings;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenAiModal: () => void;
  onOpenSheetsModal: () => void;
  onOpenBackupModal?: () => void;
  onOpenUsersModal?: () => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  schoolIdentity,
  aiSettings,
  theme,
  onToggleTheme,
  onOpenAiModal,
  onOpenSheetsModal,
  onOpenBackupModal,
  onOpenUsersModal,
  onToggleSidebar,
}) => {
  const selectedAgent = aiSettings?.selectedAgent || "gemini-3.6-flash";
  const sheetsUrl = aiSettings?.sheetsWebAppUrl || "";

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 sticky top-0 z-30 shadow-xs transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          title="Buka Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          {schoolIdentity?.logoUrl ? (
            <img
              src={schoolIdentity.logoUrl}
              alt="Logo"
              className="w-9 h-9 object-contain rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          ) : (
            <div className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-xs">
              <School className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </div>
          )}
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">
              {schoolIdentity?.schoolName || "SDN PISANGCANDI 1"}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              TA {schoolIdentity?.academicYear || "2025/2026"} - {schoolIdentity?.semester || "Semester Ganjil"} - {schoolIdentity?.phase || "Fase B"} - {schoolIdentity?.gradeClass || "Kelas IV"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Teacher Info */}
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xs font-bold uppercase text-slate-900 dark:text-slate-100">
            {schoolIdentity?.teacherName || "Rachmat Susanto, S.Pd."}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            NIP: {schoolIdentity?.teacherNip || schoolIdentity?.nip || "198811202014021003"}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Real-time Auto-Save Status Indicator */}
          <div
            title="Sistem Auto-Save Aktif: Setiap input nilai, absen, modul ajar, dan perubahan data langsung tersimpan otomatis secara real-time"
            className="hidden xl:flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded text-[11px] font-bold text-emerald-800 dark:text-emerald-300 select-none"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Auto-Save Aktif</span>
          </div>

          {/* User Management Button */}
          {onOpenUsersModal && (
            <button
              type="button"
              onClick={onOpenUsersModal}
              title="Kelola Data User & Pengguna Pengampu"
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">Data User</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            title={theme === "dark" ? "Ubah ke Mode Terang (Light Mode)" : "Ubah ke Mode Gelap (Dark Mode)"}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Backup & Drive Sync Button */}
          {onOpenBackupModal && (
            <button
              type="button"
              onClick={onOpenBackupModal}
              title="Backup Data Lokal & Sync ke Google Drive"
              className="px-2.5 py-1.5 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-900 dark:text-teal-200 border border-teal-200 dark:border-teal-800 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="hidden md:inline">Backup & Drive Sync</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAiModal}
            className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden md:inline">AI Agent:</span>
            <span className="text-indigo-700 dark:text-indigo-300 font-mono text-[11px]">
              {selectedAgent.includes("3.6") ? "3.6 Flash" : "3.1 Pro"}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSheetsModal}
            className={`px-2.5 py-1.5 text-xs font-bold rounded border flex items-center gap-1.5 transition-colors ${
              sheetsUrl
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/80"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${sheetsUrl ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`} />
            <span className="hidden sm:inline">GAS Sync</span>
          </button>
        </div>
      </div>
    </header>
  );
};


