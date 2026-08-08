import React, { useRef, useState } from "react";
import {
  Printer,
  FileText,
  FileSpreadsheet,
  Cloud,
  Download,
  Upload,
  FileCheck,
} from "lucide-react";
import { SchoolIdentity } from "../types";
import { exportHtmlToDoc } from "../lib/exportDoc";
import { exportTableToExcelFormat } from "../lib/exportExcel";

export interface ExportActionBarProps {
  title: string;
  filename: string;
  headers?: string[];
  rows?: (string | number)[][];
  schoolIdentity?: SchoolIdentity;
  onOpenPrintModal?: () => void;
  onSyncGoogleSheets?: () => void;
  onUploadExcelSheets?: (file: File) => void;
  onUploadDocsWord?: (file: File) => void;
  htmlContentForDoc?: string;
  customButtons?: React.ReactNode;
  showUpload?: boolean;
}

export const ExportActionBar: React.FC<ExportActionBarProps> = ({
  title,
  filename,
  headers = [],
  rows = [],
  schoolIdentity,
  onOpenPrintModal,
  onSyncGoogleSheets,
  onUploadExcelSheets,
  onUploadDocsWord,
  htmlContentForDoc,
  customButtons,
  showUpload = true,
}) => {
  const sheetsFileInputRef = useRef<HTMLInputElement>(null);
  const docsFileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [excelFormat, setExcelFormat] = useState<"xlsx" | "xls" | "csv">("xlsx");

  const handleExportExcel = () => {
    exportTableToExcelFormat(headers, rows, filename, excelFormat, title);
  };

  const handleExportDoc = () => {
    if (htmlContentForDoc) {
      exportHtmlToDoc({
        htmlContent: htmlContentForDoc,
        filename: `${filename}.doc`,
        title,
        schoolIdentity,
      });
    } else {
      // Build an HTML table automatically from headers & rows
      const tableHtml = `
        <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background-color:#f3f4f6; font-weight:bold;">
              ${headers.map((h) => `<th style="border:1px solid #333; padding:6px; text-align:left;">${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>
                ${row.map((cell) => `<td style="border:1px solid #333; padding:6px;">${cell ?? ""}</td>`).join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;

      exportHtmlToDoc({
        htmlContent: tableHtml,
        filename: `${filename}.doc`,
        title,
        schoolIdentity,
      });
    }
  };

  const handleSheetsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onUploadExcelSheets) {
      onUploadExcelSheets(file);
    }
    setNotification(`✅ Berkas Google Sheets / Excel (${file.name}) berhasil diunggah!`);
    setTimeout(() => setNotification(null), 4000);
    if (sheetsFileInputRef.current) sheetsFileInputRef.current.value = "";
  };

  const handleDocsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onUploadDocsWord) {
      onUploadDocsWord(file);
    }
    setNotification(`✅ Dokumen Google Docs / Word (${file.name}) berhasil diunggah!`);
    setTimeout(() => setNotification(null), 4000);
    if (docsFileInputRef.current) docsFileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2 no-print w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider hidden sm:inline">
            Opsi Dokumen:
          </span>

          {/* 1. Print / PDF Button */}
          {onOpenPrintModal && (
            <button
              onClick={onOpenPrintModal}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
              title="Cetak Laporan atau Simpan sebagai PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
          )}

          {/* 2. Google Sheets / Excel DOWNLOAD with format options */}
          <div className="flex items-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs overflow-hidden">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 transition-all hover:bg-black/10"
              title={`Unduh data dalam format Excel (${excelFormat.toUpperCase()})`}
            >
              <Download className="w-3.5 h-3.5" />
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Unduh Excel ({excelFormat.toUpperCase()})</span>
            </button>
            <select
              value={excelFormat}
              onChange={(e) => setExcelFormat(e.target.value as any)}
              className="bg-emerald-700 text-white text-[11px] font-extrabold px-1.5 py-1 border-l border-emerald-500 cursor-pointer focus:outline-none"
              title="Pilih Format Excel"
            >
              <option value="xlsx">.XLSX</option>
              <option value="xls">.XLS</option>
              <option value="csv">.CSV</option>
            </select>
          </div>

          {/* 3. Google Sheets / Excel UPLOAD */}
          {showUpload && (
            <>
              <button
                onClick={() => sheetsFileInputRef.current?.click()}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
                title="Unggah / Impor file Google Sheets / Excel (.xlsx, .xls, .csv)"
              >
                <Upload className="w-3.5 h-3.5" />
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                <span>Unggah Sheets / Excel</span>
              </button>
              <input
                ref={sheetsFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                onChange={handleSheetsFileChange}
                className="hidden"
              />
            </>
          )}

          {/* 4. Google Docs / Word DOWNLOAD */}
          <button
            onClick={handleExportDoc}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
            title="Unduh dokumen dalam format Google Docs / Word (.docx/.doc)"
          >
            <Download className="w-3.5 h-3.5" />
            <FileText className="w-3.5 h-3.5 text-blue-200" />
            <span>Unduh Docs / Word</span>
          </button>

          {/* 5. Google Docs / Word UPLOAD */}
          {showUpload && (
            <>
              <button
                onClick={() => docsFileInputRef.current?.click()}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
                title="Unggah / Impor berkas Google Docs / Word (.docx, .doc)"
              >
                <Upload className="w-3.5 h-3.5" />
                <FileText className="w-3.5 h-3.5 text-blue-200" />
                <span>Unggah Docs / Word</span>
              </button>
              <input
                ref={docsFileInputRef}
                type="file"
                accept=".docx,.doc,.txt"
                onChange={handleDocsFileChange}
                className="hidden"
              />
            </>
          )}

          {/* 6. Sync Google Sheets */}
          {onSyncGoogleSheets && (
            <button
              onClick={onSyncGoogleSheets}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
              title="Sinkronkan data modul ini ke Google Sheets"
            >
              <Cloud className="w-3.5 h-3.5 text-teal-200" />
              <span>Sync Sheets</span>
            </button>
          )}
        </div>

        {customButtons && <div className="flex items-center gap-2">{customButtons}</div>}
      </div>

      {notification && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
};

