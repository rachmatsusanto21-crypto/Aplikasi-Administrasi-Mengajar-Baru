import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Calendar,
  Layers,
  ArrowRight,
  HelpCircle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Student, AttendanceRecord, SchoolIdentity } from "../../types";
import {
  downloadMonthlyMatrixTemplate,
  downloadSemesterRecapTemplate,
  parseMonthlyMatrixUpload,
  parseSemesterRecapUpload,
  ParsedAttendanceResult,
} from "../../lib/attendanceTemplateHelper";

interface AttendanceTemplateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "matrix" | "semester";
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  schoolIdentity: Partial<SchoolIdentity>;
  selectedMonth: string;
  selectedMonthLabel: string;
  onApplyAttendanceRecords: (newRecords: AttendanceRecord[], mode: "merge" | "replace", targetMonth?: string) => void;
}

export const AttendanceTemplateUploadModal: React.FC<AttendanceTemplateUploadModalProps> = ({
  isOpen,
  onClose,
  initialMode = "matrix",
  students,
  attendanceRecords,
  schoolIdentity,
  selectedMonth,
  selectedMonthLabel,
  onApplyAttendanceRecords,
}) => {
  const [activeMode, setActiveMode] = useState<"matrix" | "semester">(initialMode);
  const [targetMonth, setTargetMonth] = useState<string>(selectedMonth || "2025-07");
  const [mergeStrategy, setMergeStrategy] = useState<"merge" | "replace">("merge");
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedResult, setParsedResult] = useState<ParsedAttendanceResult | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const startYear = parseInt((schoolIdentity?.academicYear || "2025/2026").split("/")[0] || "2025", 10);
  const endYear = startYear + 1;

  const availableMonths = [
    { value: `${startYear}-07`, label: `Juli ${startYear}` },
    { value: `${startYear}-08`, label: `Agustus ${startYear}` },
    { value: `${startYear}-09`, label: `September ${startYear}` },
    { value: `${startYear}-10`, label: `Oktober ${startYear}` },
    { value: `${startYear}-11`, label: `November ${startYear}` },
    { value: `${startYear}-12`, label: `Desember ${startYear}` },
    { value: `${endYear}-01`, label: `Januari ${endYear}` },
    { value: `${endYear}-02`, label: `Februari ${endYear}` },
    { value: `${endYear}-03`, label: `Maret ${endYear}` },
    { value: `${endYear}-04`, label: `April ${endYear}` },
    { value: `${endYear}-05`, label: `Mei ${endYear}` },
    { value: `${endYear}-06`, label: `Juni ${endYear}` },
  ];

  const getMonthLabel = (val: string) => {
    const found = availableMonths.find((m) => m.value === val);
    return found ? found.label : val;
  };

  const handleFileProcess = async (file: File) => {
    setIsParsing(true);
    setSelectedFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      let result: ParsedAttendanceResult;

      if (activeMode === "matrix") {
        result = parseMonthlyMatrixUpload(buffer, students, targetMonth);
        if (result.detectedMonth) {
          setTargetMonth(result.detectedMonth);
        }
      } else {
        result = parseSemesterRecapUpload(buffer, students, schoolIdentity.academicYear || "2025/2026");
      }

      setParsedResult(result);
    } catch (err: any) {
      setParsedResult({
        status: "error",
        type: activeMode,
        records: [],
        matchedStudentsCount: 0,
        totalStudentsCount: students.length,
        counts: { H: 0, S: 0, I: 0, A: 0 },
        unmappedStudents: [],
        previewList: [],
        errorMessage: `Gagal membaca file: ${err.message || err}`,
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    if (activeMode === "matrix") {
      downloadMonthlyMatrixTemplate(
        students,
        schoolIdentity,
        targetMonth,
        getMonthLabel(targetMonth),
        attendanceRecords
      );
    } else {
      downloadSemesterRecapTemplate(
        students,
        attendanceRecords,
        schoolIdentity,
        schoolIdentity.semester || "Semester Ganjil"
      );
    }
  };

  const handleApply = () => {
    if (!parsedResult || parsedResult.status !== "success") return;
    onApplyAttendanceRecords(
      parsedResult.records,
      mergeStrategy,
      activeMode === "matrix" ? targetMonth : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Template Google Sheets & Unggah Presensi
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Unduh template resmi format spreadsheet, isi di Google Sheets/Excel, lalu unggah kembali ke aplikasi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-4 pb-0 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setActiveMode("matrix");
                setParsedResult(null);
                setSelectedFileName("");
              }}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
                activeMode === "matrix"
                  ? "border-emerald-600 text-emerald-900 dark:text-emerald-300 bg-white dark:bg-slate-800 shadow-xs"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              1. Template Matriks Bulanan (1-31)
            </button>
            <button
              onClick={() => {
                setActiveMode("semester");
                setParsedResult(null);
                setSelectedFileName("");
              }}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
                activeMode === "semester"
                  ? "border-emerald-600 text-emerald-900 dark:text-emerald-300 bg-white dark:bg-slate-800 shadow-xs"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              2. Template Rekap Semester & Log Detail
            </button>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 mb-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Template ({activeMode === "matrix" ? "Matriks Bulanan" : "Rekap Semester"})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Step 1: Download & Fill Guide */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold">1</span>
                Pengaturan Periode & Unduh Template:
              </span>
              {activeMode === "matrix" && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Target Bulan:</span>
                  <select
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    {availableMonths.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              {activeMode === "matrix"
                ? `Template Matriks Bulanan telah disiapkan dengan daftar ${students.length} murid di kelas ini. Anda dapat mengisinya langsung di Google Sheets/Excel dengan kode: H (Hadir), S (Sakit), I (Izin), A (Alpa).`
                : `Template Rekap Semester memuat rekapitulasi semester, kolom log tanggal ketidakhadiran (format: DD/MM [S] - Alasan), serta lembar log harian rinci.`}
            </p>
          </div>

          {/* Step 2: Upload Area */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] flex items-center justify-center font-bold">2</span>
              Unggah File Hasil Pengisian (.xlsx / .xls / .csv):
            </span>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
                  : "border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/20"
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Klik untuk memilih file atau seret file ke sini
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mendukung format Microsoft Excel (.xlsx, .xls) dan Google Sheets yang diunduh
                  </p>
                </div>
                {selectedFileName && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>File Terpilih: {selectedFileName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Parsing Results & Preview */}
          {isParsing && (
            <div className="p-6 text-center space-y-2 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Memproses dan memvalidasi data presensi spreadsheet...
              </p>
            </div>
          )}

          {parsedResult && !isParsing && (
            <div className="space-y-4">
              {parsedResult.status === "error" ? (
                <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-red-900 dark:text-red-200">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold">Gagal Memproses File Spreadsheet</h4>
                    <p className="text-xs mt-0.5">{parsedResult.errorMessage}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Summary Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
                      <div className="text-[11px] text-slate-500 font-medium">Siswa Teridentifikasi</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {parsedResult.matchedStudentsCount} / {parsedResult.totalStudentsCount}
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-center border border-emerald-200 dark:border-emerald-800/60">
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Total Hadir (H)</div>
                      <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                        {parsedResult.counts.H}
                      </div>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-center border border-amber-200 dark:border-amber-800/60">
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Sakit & Izin (S / I)</div>
                      <div className="text-sm font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                        {parsedResult.counts.S} / {parsedResult.counts.I}
                      </div>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl text-center border border-red-200 dark:border-red-800/60">
                      <div className="text-[11px] text-red-700 dark:text-red-400 font-medium">Alpa (A)</div>
                      <div className="text-sm font-bold text-red-800 dark:text-red-300 mt-0.5">
                        {parsedResult.counts.A}
                      </div>
                    </div>
                  </div>

                  {/* Unmapped Warnings */}
                  {parsedResult.unmappedStudents.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs">
                      <p className="font-bold">⚠️ Perhatian: Terdapat {parsedResult.unmappedStudents.length} baris nama tidak cocok dengan daftar murid:</p>
                      <p className="text-[11px] mt-0.5 opacity-90">{parsedResult.unmappedStudents.join(", ")}</p>
                    </div>
                  )}

                  {/* Merge Strategy Choice */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Opsi Penggabungan Data:
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="mergeStrategy"
                          checked={mergeStrategy === "merge"}
                          onChange={() => setMergeStrategy("merge")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Gabungkan / Perbarui (Aman)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                        <input
                          type="radio"
                          name="mergeStrategy"
                          checked={mergeStrategy === "replace"}
                          onChange={() => setMergeStrategy("replace")}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Timpa Semua Presensi Periode Ini</span>
                      </label>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-52 overflow-y-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 font-bold text-[11px]">
                        <tr>
                          <th className="p-2 w-8 text-center">No</th>
                          <th className="p-2">Nama Siswa</th>
                          <th className="p-2 text-center w-10 text-emerald-700">H</th>
                          <th className="p-2 text-center w-10 text-amber-700">S</th>
                          <th className="p-2 text-center w-10 text-blue-700">I</th>
                          <th className="p-2 text-center w-10 text-red-700">A</th>
                          {activeMode === "semester" && <th className="p-2">Log Detail</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                        {parsedResult.previewList.slice(0, 15).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-medium">{row.studentName}</td>
                            <td className="p-2 text-center font-bold text-emerald-700">{row.hCount || "-"}</td>
                            <td className="p-2 text-center font-bold text-amber-700">{row.sCount || "-"}</td>
                            <td className="p-2 text-center font-bold text-blue-700">{row.iCount || "-"}</td>
                            <td className="p-2 text-center font-bold text-red-700">{row.aCount || "-"}</td>
                            {activeMode === "semester" && (
                              <td className="p-2 font-mono text-[11px] text-slate-500 truncate max-w-xs">
                                {row.logSample}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Batal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!parsedResult || parsedResult.status !== "success" || parsedResult.records.length === 0}
              onClick={handleApply}
              className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm ${
                parsedResult && parsedResult.status === "success" && parsedResult.records.length > 0
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Terapkan & Simpan ke Aplikasi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
