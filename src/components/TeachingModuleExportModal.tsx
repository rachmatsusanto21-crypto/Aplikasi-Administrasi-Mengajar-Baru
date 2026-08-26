import React, { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Download,
  CheckCircle2,
  X,
  FileDown,
  Info,
  CheckSquare,
  Square,
  BookOpen,
  Sparkles,
  Layers,
  Award,
} from "lucide-react";
import { TeachingModule, SchoolIdentity, SemesterType } from "../types";
import { exportTeachingModuleToDocx } from "../lib/exportDocx";
import { exportHtmlToDoc } from "../lib/exportDoc";
import { exportTableToExcelFormat } from "../lib/exportExcel";

interface TeachingModuleExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  module: TeachingModule;
  schoolIdentity?: SchoolIdentity;
  onOpenPrintModal?: () => void;
}

export const TeachingModuleExportModal: React.FC<TeachingModuleExportModalProps> = ({
  isOpen,
  onClose,
  module,
  schoolIdentity = {
    schoolName: "SD NEGERI 1 MERDEKA",
    academicYear: "2026/2027",
    semester: "Ganjil" as SemesterType,
    gradeClass: "Kelas IV",
  },
  onOpenPrintModal,
}) => {
  const [includeLkpd, setIncludeLkpd] = useState<boolean>(true);
  const [includeRubric, setIncludeRubric] = useState<boolean>(true);
  const [includeKisiKisi, setIncludeKisiKisi] = useState<boolean>(true);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerFeedback = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  // 1. Export Native Word (.docx)
  const handleExportDocx = async () => {
    try {
      await exportTeachingModuleToDocx(module, schoolIdentity);
      triggerFeedback("Modul Ajar (.docx) resmi berhasil diunduh!");
    } catch (err) {
      console.error(err);
      triggerFeedback("Gagal mengunduh file .docx. Mencoba fallback ke .doc...");
      handleExportDoc();
    }
  };

  // 2. Export Word (.doc) with customizable attachments
  const handleExportDoc = async () => {
    const generalInfo = module.generalInfo || {};
    const iden = module.identifikasi || {};
    const desain = module.desainPembelajaran || {};
    const act = module.activities || {};
    const ass = module.assessment || {};

    let lkpdHtml = "";
    if (includeLkpd && module.lkpd) {
      lkpdHtml = `
        <div style="page-break-before: always; margin-top: 30px;">
          <h3 style="text-align: center; text-decoration: underline;">LAMPIRAN 1: LEMBAR KERJA PESERTA DIDIK (LKPD)</h3>
          <p><b>Materi:</b> ${module.title || generalInfo.topik || "-"}</p>
          <div style="border: 1px solid #333; padding: 10px; margin-top: 10px;">
            <h4>A. Petunjuk Pengerjaan:</h4>
            <p>${module.lkpd.petunjuk || "1. Diskusikan dengan kelompok.\n2. Tuliskan jawaban dengan rapi."}</p>
            <h4>B. Aktivitas Pembelajaran:</h4>
            <p>${module.lkpd.aktivitas || "Lakukan pengamatan dan analisis konsep terkait."}</p>
          </div>
        </div>
      `;
    }

    let rubricHtml = "";
    if (includeRubric && module.rubrikPenilaian) {
      rubricHtml = `
        <div style="page-break-before: always; margin-top: 30px;">
          <h3 style="text-align: center; text-decoration: underline;">LAMPIRAN 2: RUBRIK PENILAIAN ASESMEN</h3>
          <p><b>Kriteria & Pedoman Penilaian:</b></p>
          <div style="border: 1px solid #333; padding: 10px; margin-top: 10px;">
            <p><b>Teknik Penilaian:</b> Observasi, Kinerja LKPD, dan Tes Tertulis</p>
            <p><b>Aspek Dinilai:</b> Pemahaman Konsep, Keterampilan Berpikir Kritis, Kolaborasi Kelompok</p>
          </div>
        </div>
      `;
    }

    let kisiKisiHtml = "";
    if (includeKisiKisi && module.kisiKisi && module.kisiKisi.length > 0) {
      kisiKisiHtml = `
        <div style="page-break-before: always; margin-top: 30px;">
          <h3 style="text-align: center; text-decoration: underline;">LAMPIRAN 3: KISI-KISI ASESMEN PEMBELAJARAN</h3>
          <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
            <thead>
              <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
                <th>No</th>
                <th>Tujuan Pembelajaran</th>
                <th>Materi</th>
                <th>Indikator</th>
                <th>Level Kognitif</th>
                <th>Bentuk</th>
              </tr>
            </thead>
            <tbody>
              ${module.kisiKisi
                .map(
                  (k) => `
                <tr>
                  <td align="center">${k.no}</td>
                  <td>${k.tujuanPembelajaran}</td>
                  <td>${k.materi}</td>
                  <td>${k.indikator}</td>
                  <td align="center">${k.levelKognitif}</td>
                  <td align="center">${k.bentukSoal}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    const docContent = `
      <div style="text-align: center; margin-bottom: 15px;">
        <h2 style="margin: 0; font-size: 14pt; text-transform: uppercase;">MODUL AJAR / RENCANA PEMBELAJARAN MENDALAM (RPM)</h2>
        <p style="margin: 4px 0; font-size: 11pt;">KURIKULUM MERDEKA - TAHUN PELAJARAN ${schoolIdentity.academicYear || "2026/2027"}</p>
      </div>

      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-bottom: 15px;">
        <tr style="background-color: #f5f5f5;">
          <th colspan="4" style="text-align: left; font-size: 11pt; padding: 6px;">I. INFORMASI UMUM</th>
        </tr>
        <tr>
          <td width="25%"><b>Nama Sekolah</b></td>
          <td width="25%">${schoolIdentity.schoolName}</td>
          <td width="25%"><b>Mata Pelajaran</b></td>
          <td width="25%">${module.subject}</td>
        </tr>
        <tr>
          <td><b>Fase / Kelas</b></td>
          <td>${module.targetClass || "Fase B / Kelas IV"}</td>
          <td><b>Alokasi Waktu</b></td>
          <td>${module.allocationJP || "2 x 35 Menit"}</td>
        </tr>
        <tr>
          <td><b>Model Pembelajaran</b></td>
          <td>${module.learningModel || "Problem Based Learning (PBL)"}</td>
          <td><b>Pendekatan</b></td>
          <td>${module.approach || "Deep Learning"}</td>
        </tr>
        <tr>
          <td><b>Profil Pelajar Pancasila</b></td>
          <td colspan="3">${(generalInfo.profilPelajarPancasila || []).join(", ") || "Bernalar Kritis, Gotong Royong, Mandiri"}</td>
        </tr>
      </table>

      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-bottom: 15px;">
        <tr style="background-color: #f5f5f5;">
          <th colspan="2" style="text-align: left; font-size: 11pt; padding: 6px;">II. KOMPONEN INTI</th>
        </tr>
        <tr>
          <td width="30%"><b>Capaian Pembelajaran (CP)</b></td>
          <td>${desain.capaianPembelajaran || "-"}</td>
        </tr>
        <tr>
          <td><b>Tujuan Pembelajaran (TP)</b></td>
          <td>${desain.tujuanPembelajaran || "-"}</td>
        </tr>
        <tr>
          <td><b>Pemahaman Bermakna</b></td>
          <td>${module.coreComponent?.pemahamanBermakna || "-"}</td>
        </tr>
        <tr>
          <td><b>Pertanyaan Pemantik</b></td>
          <td>${module.coreComponent?.pertanyaanPemantik || "-"}</td>
        </tr>
      </table>

      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-bottom: 15px;">
        <tr style="background-color: #f5f5f5;">
          <th colspan="2" style="text-align: left; font-size: 11pt; padding: 6px;">III. KEGIATAN PEMBELAJARAN</th>
        </tr>
        <tr>
          <td width="25%"><b>A. Kegiatan Pendahuluan</b></td>
          <td>${(module.kegiatanAwalText || act.pendahuluan || "-").replace(/\n/g, "<br/>")}</td>
        </tr>
        <tr>
          <td><b>B. Kegiatan Inti</b></td>
          <td>${(act.inti || "-").replace(/\n/g, "<br/>")}</td>
        </tr>
        <tr>
          <td><b>C. Kegiatan Penutup</b></td>
          <td>${(module.kegiatanPenutupText || act.penutup || "-").replace(/\n/g, "<br/>")}</td>
        </tr>
      </table>

      <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10.5pt; margin-bottom: 25px;">
        <tr style="background-color: #f5f5f5;">
          <th colspan="2" style="text-align: left; font-size: 11pt; padding: 6px;">IV. ASESMEN & PENILAIAN</th>
        </tr>
        <tr>
          <td width="25%"><b>Asesmen Diagnostik</b></td>
          <td>${ass.diagnostik || "-"}</td>
        </tr>
        <tr>
          <td><b>Asesmen Formatif</b></td>
          <td>${ass.formatif || "-"}</td>
        </tr>
        <tr>
          <td><b>Asesmen Sumatif</b></td>
          <td>${ass.sumatif || "-"}</td>
        </tr>
      </table>

      ${lkpdHtml}
      ${rubricHtml}
      ${kisiKisiHtml}
    `;

    await exportHtmlToDoc({
      htmlContent: docContent,
      filename: `Modul_Ajar_${module.subject}_${(module.title || "Materi").replace(/[^a-zA-Z0-9]/g, "_")}.doc`,
      title: `MODUL AJAR - ${module.subject}`,
      schoolIdentity,
    });

    triggerFeedback("Dokumen Word (.doc) Modul Ajar berhasil diunduh!");
  };

  // 3. Export Excel Spreadsheet (.xlsx)
  const handleExportExcel = () => {
    const headers = [
      "No",
      "Komponen",
      "Rincian Deskripsi Modul Ajar",
    ];

    const rows = [
      [1, "Mata Pelajaran", module.subject],
      [2, "Judul / Topik", module.title || module.generalInfo?.topik || "-"],
      [3, "Kelas / Fase", module.targetClass || "Kelas IV / Fase B"],
      [4, "Pendekatan", module.approach || "Deep Learning"],
      [5, "Model Pembelajaran", module.learningModel || "Problem Based Learning"],
      [6, "Alokasi Waktu", module.allocationJP || "2 x 35 Menit"],
      [7, "Capaian Pembelajaran", module.desainPembelajaran?.capaianPembelajaran || "-"],
      [8, "Tujuan Pembelajaran", module.desainPembelajaran?.tujuanPembelajaran || "-"],
      [9, "Pertanyaan Pemantik", module.coreComponent?.pertanyaanPemantik || "-"],
      [10, "Kegiatan Awal", module.kegiatanAwalText || module.activities?.pendahuluan || "-"],
      [11, "Kegiatan Inti", module.activities?.inti || "-"],
      [12, "Kegiatan Penutup", module.kegiatanPenutupText || module.activities?.penutup || "-"],
      [13, "Asesmen Formatif", module.assessment?.formatif || "-"],
      [14, "Asesmen Sumatif", module.assessment?.sumatif || "-"],
    ];

    exportTableToExcelFormat(
      headers,
      rows,
      `Modul_Ajar_${module.subject}_${(module.title || "Materi").replace(/[^a-zA-Z0-9]/g, "_")}`,
      "xlsx",
      `MODUL AJAR ${module.subject.toUpperCase()} - ${module.title?.toUpperCase() || ""}`
    );

    triggerFeedback("File Spreadsheet (.xlsx) Modul Ajar berhasil diunduh!");
  };

  // 4. Download Template Modul Ajar
  const downloadTemplate = (format: "excel" | "word") => {
    if (format === "excel") {
      const headers = ["No", "Komponen Modul", "Deskripsi / Isian Guru", "Petunjuk"];
      const rows = [
        [1, "Identitas Modul", "Nama Guru, Satuan Pendidikan, Kelas, Mapel, Alokasi Waktu", "Wajib diisi lengkap"],
        [2, "Kompetensi Awal", "Kemampuan prasyarat yang dimiliki peserta didik", "Kontekstual"],
        [3, "Profil Pelajar Pancasila", "Dimensi P3 yang dituju (contoh: Bernalar Kritis, Mandiri)", "Pilih 2-3 dimensi"],
        [4, "Tujuan Pembelajaran", "Audience, Behavior, Condition, Degree", "Sesuai CP/TP"],
        [5, "Pemahaman Bermakna", "Manfaat pembelajaran bagi kehidupan peserta didik", "Konsep mendalam"],
        [6, "Langkah Pembelajaran", "Pendahuluan, Inti (Sintaks Model), Penutup", "Terstruktur per pertemuan"],
        [7, "Asesmen & Rubrik", "Diagnostik, Formatif (LKPD), Sumatif", "Disertai kisi-kisi"],
      ];
      exportTableToExcelFormat(headers, rows, "Template_Modul_Ajar_SD", "xlsx", "TEMPLATE MODUL AJAR KURIKULUM MERDEKA");
    } else {
      handleExportDoc();
    }
    triggerFeedback(`Template Modul Ajar (${format.toUpperCase()}) berhasil diunduh!`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden transition-all">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Ekspor Modul Ajar / RPM</span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{module.subject}</span>
                <span>•</span>
                <span className="text-sky-600 dark:text-sky-400 font-semibold">{module.targetClass || "Kelas IV"}</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{module.approach || "Deep Learning"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[72vh]">
          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {/* Ringkasan Modul Ajar Box */}
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-950 dark:text-blue-300">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Rencana Pembelajaran Mendalam (RPM)</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                {module.learningModel || "PBL"}
              </span>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300">
              <div className="font-bold text-slate-900 dark:text-white text-sm">{module.title || "Modul Ajar Kurikulum Merdeka"}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Alokasi: {module.allocationJP || "2 JP"} • Dilengkapi LKPD interaktif, Rubrik Penilaian, & Matriks Kisi-Kisi Kognitif.
              </div>
            </div>
          </div>

          {/* Opsi 1: Microsoft Word Native (.docx) */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-blue-400 dark:hover:border-blue-600/60 transition-all space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Format Native Word (.docx)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Format Word modern (.docx) dengan layout tabel resmi, Kop Surat, sintaks model pembelajaran, dan siap diedit di MS Word / Google Docs.
                </p>
              </div>
              <button
                onClick={handleExportDocx}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh .docx</span>
              </button>
            </div>
          </div>

          {/* Opsi 2: Microsoft Word Terformat (.doc) dengan Pilihan Lampiran */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-600/60 transition-all space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Format Dokumen Lengkap (.doc) + Lampiran
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ekspor Modul Ajar lengkap dengan lampiran opsional LKPD siswa, instrumen rubrik penilaian, dan kisi-kisi kognitif.
                </p>
              </div>
              <button
                onClick={handleExportDoc}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh .doc</span>
              </button>
            </div>

            {/* Checkboxes */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs">
              <button
                type="button"
                onClick={() => setIncludeLkpd(!includeLkpd)}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
              >
                {includeLkpd ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
                <span>Sertakan LKPD</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeRubric(!includeRubric)}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
              >
                {includeRubric ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
                <span>Sertakan Rubrik Penilaian</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeKisiKisi(!includeKisiKisi)}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
              >
                {includeKisiKisi ? <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
                <span>Sertakan Kisi-Kisi Kognitif</span>
              </button>
            </div>
          </div>

          {/* Opsi 3: Excel Spreadsheet (.xlsx) */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-400 dark:hover:border-emerald-600/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Format Excel / Spreadsheet (.xlsx)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Matriks rincian komponen modul ajar untuk pemetaan kurikulum satuan pendidikan.
              </p>
            </div>
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Excel (.xlsx)</span>
            </button>
          </div>

          {/* Opsi 4: Cetak / Simpan PDF */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-amber-400 dark:hover:border-amber-600/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cetak Langsung / Simpan PDF
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pratinjau cetak A4/F4 resmi lengkap dengan Kop Surat Sekolah dan pengesahan Kepala Sekolah & Guru.
              </p>
            </div>
            <button
              onClick={() => {
                if (onOpenPrintModal) onOpenPrintModal();
                onClose();
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
          </div>

          {/* Template Modul Ajar untuk Guru */}
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Template Modul Ajar Kosong untuk Rekan Guru:</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Bagikan template berikut untuk penyusunan Modul Ajar berstandar Kurikulum Merdeka.
            </p>
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                onClick={() => downloadTemplate("excel")}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Unduh Template Excel</span>
              </button>
              <button
                onClick={() => downloadTemplate("word")}
                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-700 dark:text-blue-400 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Unduh Template Word</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
