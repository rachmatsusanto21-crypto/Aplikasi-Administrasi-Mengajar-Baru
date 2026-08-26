import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  X,
  FileDown,
  Info,
  CheckSquare,
  Square,
  BrainCircuit,
  HelpCircle,
  FileCheck,
} from "lucide-react";
import { ExamPackage, SchoolIdentity, SemesterType } from "../types";
import { exportHtmlToDoc } from "../lib/exportDoc";
import { exportTableToExcelFormat } from "../lib/exportExcel";

interface QuestionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: ExamPackage;
  schoolIdentity?: SchoolIdentity;
  onOpenPrintModal?: () => void;
}

export const QuestionExportModal: React.FC<QuestionExportModalProps> = ({
  isOpen,
  onClose,
  exam,
  schoolIdentity = {
    schoolName: "SD NEGERI 1 MERDEKA",
    academicYear: "2026/2027",
    semester: "Ganjil" as SemesterType,
    gradeClass: "Kelas IV",
  },
  onOpenPrintModal,
}) => {
  const [includeKeyInWord, setIncludeKeyInWord] = useState<boolean>(true);
  const [includeMatrixInWord, setIncludeMatrixInWord] = useState<boolean>(true);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Kalkulasi Ringkasan Distribusi Taksonomi Kognitif
  const bloomSummary = useMemo(() => {
    const total = exam.kisiKisi?.length || exam.questions?.length || 1;
    let lots = 0; // L1: C1, C2
    let mots = 0; // L2: C3
    let hots = 0; // L3: C4, C5, C6

    if (exam.kisiKisi && exam.kisiKisi.length > 0) {
      exam.kisiKisi.forEach((k) => {
        const lvl = (k.levelKognitif || k.tingkatKesulitan || "").toUpperCase();
        if (
          lvl.includes("L3") ||
          lvl.includes("C4") ||
          lvl.includes("C5") ||
          lvl.includes("C6") ||
          lvl.includes("HOTS") ||
          lvl.includes("PENALARAN")
        ) {
          hots++;
        } else if (
          lvl.includes("L2") ||
          lvl.includes("C3") ||
          lvl.includes("APLIKASI") ||
          lvl.includes("SEDANG")
        ) {
          mots++;
        } else {
          lots++;
        }
      });
    } else {
      lots = Math.ceil(total * 0.3);
      mots = Math.floor(total * 0.45);
      hots = Math.max(0, total - lots - mots);
    }

    return {
      total,
      lotsCount: lots,
      motsCount: mots,
      hotsCount: hots,
      lotsPercent: Math.round((lots / total) * 100),
      motsPercent: Math.round((mots / total) * 100),
      hotsPercent: Math.round((hots / total) * 100),
    };
  }, [exam]);

  if (!isOpen) return null;

  const triggerFeedback = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  // 1. Ekspor Dokumen Word (.doc)
  const handleExportWord = async () => {
    const questionsHtml = (exam.questions || [])
      .map((q) => {
        let opts = "";
        if (q.pilihan && q.pilihan.length > 0) {
          opts = `<ol type="A" style="margin-top: 4px; margin-bottom: 8px; padding-left: 20px;">
            ${q.pilihan.map((p) => `<li style="margin-bottom: 3px;">${p}</li>`).join("")}
          </ol>`;
        } else {
          opts = `<div style="height: 35px; border-bottom: 1px dashed #aaa; margin: 8px 0;"></div>`;
        }

        return `
          <div style="margin-bottom: 14px;">
            <p style="margin: 0 0 4px 0; font-weight: normal;"><b>${q.no}.</b> ${q.pertanyaan}</p>
            ${opts}
          </div>
        `;
      })
      .join("");

    let keyTableHtml = "";
    if (includeKeyInWord) {
      keyTableHtml = `
        <div style="page-break-before: always; margin-top: 30px;">
          <h3 style="text-align: center; text-decoration: underline; margin-bottom: 15px;">KUNCI JAWABAN & PEDOMAN PENSKORAN</h3>
          <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
            <thead>
              <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
                <th style="width: 8%; border: 1px solid #333;">No</th>
                <th style="width: 15%; border: 1px solid #333;">Bentuk Soal</th>
                <th style="border: 1px solid #333; text-align: left;">Kunci Jawaban / Kriteria Penilaian</th>
                <th style="width: 12%; border: 1px solid #333;">Bobot Skor</th>
              </tr>
            </thead>
            <tbody>
              ${(exam.questions || [])
                .map(
                  (q) => `
                <tr>
                  <td style="border: 1px solid #333; text-align: center;">${q.no}</td>
                  <td style="border: 1px solid #333; text-align: center;">${q.jenis}</td>
                  <td style="border: 1px solid #333;">${q.kunciJawaban || "-"}</td>
                  <td style="border: 1px solid #333; text-align: center;">${q.bobotSkor || (q.jenis === "PG" ? 1 : q.jenis === "ISIAN" ? 2 : 3)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    let matrixTableHtml = "";
    if (includeMatrixInWord && exam.kisiKisi && exam.kisiKisi.length > 0) {
      matrixTableHtml = `
        <div style="page-break-before: always; margin-top: 30px;">
          <h3 style="text-align: center; text-decoration: underline; margin-bottom: 15px;">MATRIKS KISI-KISI PENULISAN SOAL (TAKSONOMI KOGNITIF)</h3>
          <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
            <thead>
              <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
                <th style="width: 5%; border: 1px solid #333;">No</th>
                <th style="border: 1px solid #333; text-align: left;">Tujuan Pembelajaran (TP)</th>
                <th style="border: 1px solid #333; text-align: left; width: 18%;">Materi Pokok</th>
                <th style="border: 1px solid #333; text-align: left; width: 28%;">Indikator Soal</th>
                <th style="border: 1px solid #333; width: 16%;">Level Kognitif</th>
                <th style="border: 1px solid #333; width: 12%;">Bentuk</th>
                <th style="border: 1px solid #333; width: 6%;">No.</th>
              </tr>
            </thead>
            <tbody>
              ${exam.kisiKisi
                .map(
                  (k) => `
                <tr>
                  <td style="border: 1px solid #333; text-align: center;">${k.no}</td>
                  <td style="border: 1px solid #333;"><b>[${k.tpCode}]</b> ${k.tpDescription}</td>
                  <td style="border: 1px solid #333;">${k.materiPokok}</td>
                  <td style="border: 1px solid #333;"><i>${k.indikatorSoal}</i></td>
                  <td style="border: 1px solid #333; text-align: center;">${k.levelKognitif || k.tingkatKesulitan || "L2 - C3 (Menerapkan)"}</td>
                  <td style="border: 1px solid #333; text-align: center;">${k.bentukSoal}</td>
                  <td style="border: 1px solid #333; text-align: center; font-weight: bold;">${k.nomorSoal}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>

          <div style="margin-top: 15px; padding: 8px; border: 1px solid #aaa; font-size: 9pt; background-color: #fcfcfc;">
            <b>Distribusi Taksonomi Kognitif:</b> L1 / LOTS (C1-C2): ${bloomSummary.lotsCount} Soal (${bloomSummary.lotsPercent}%) | L2 / MOTS (C3): ${bloomSummary.motsCount} Soal (${bloomSummary.motsPercent}%) | L3 / HOTS (C4-C6): ${bloomSummary.hotsCount} Soal (${bloomSummary.hotsPercent}%)
          </div>
        </div>
      `;
    }

    const fullDocContent = `
      <div style="text-align: center; margin-bottom: 12px;">
        <h2 style="margin: 0; font-size: 14pt; text-transform: uppercase;">NASKAH SOAL ${exam.examType.toUpperCase()}</h2>
        <p style="margin: 3px 0; font-size: 10.5pt;">TAHUN PELAJARAN ${schoolIdentity.academicYear || "2026/2027"} - SEMESTER ${schoolIdentity.semester || "GANJIL"}</p>
      </div>

      <table style="width: 100%; font-size: 10.5pt; margin-bottom: 15px; border-collapse: collapse;">
        <tr>
          <td style="width: 22%; font-weight: bold;">Mata Pelajaran</td>
          <td style="width: 38%;">: ${exam.subject}</td>
          <td style="width: 18%; font-weight: bold;">Hari, Tanggal</td>
          <td style="width: 22%;">: ${exam.examDate || "-"}</td>
        </tr>
        <tr>
          <td style="font-weight: bold;">Kelas / Fase</td>
          <td>: ${exam.gradeClass}</td>
          <td style="font-weight: bold;">Alokasi Waktu</td>
          <td>: ${exam.timeAllocation}</td>
        </tr>
      </table>

      <div style="border-top: 2px solid #000; margin-bottom: 15px;"></div>

      <div style="font-size: 11pt; line-height: 1.4;">
        <h4 style="margin: 0 0 10px 0;">PETUNJUK PENGERJAAN:</h4>
        <ol style="margin: 0 0 15px 0; padding-left: 20px; font-size: 10pt;">
          <li>Tuliskan nama dan nomor absen pada lembar jawaban yang telah disediakan!</li>
          <li>Periksa dan bacalah setiap butir soal dengan teliti sebelum menjawab!</li>
          <li>Laporkan kepada pengawas jika terdapat tulisan yang kurang jelas atau rusak!</li>
          <li>Dahulukan menjawab soal-soal yang Anda anggap mudah!</li>
        </ol>

        <h4 style="margin: 15px 0 10px 0; text-transform: uppercase;">SOAL ASESMEN</h4>
        ${questionsHtml}
      </div>

      ${keyTableHtml}
      ${matrixTableHtml}
    `;

    await exportHtmlToDoc({
      htmlContent: fullDocContent,
      filename: `Naskah_Soal_${exam.examType.replace(/[^a-zA-Z0-9]/g, "_")}_${exam.subject}.doc`,
      title: `NASKAH SOAL ${exam.examType.toUpperCase()} - ${exam.subject}`,
      schoolIdentity,
    });

    triggerFeedback("Dokumen Word (.doc) ber-kisi-kisi Taksonomi berhasil diunduh!");
  };

  // 2. Ekspor Format Excel (.xlsx)
  const handleExportExcel = () => {
    const headers = [
      "No",
      "Tujuan Pembelajaran (TP)",
      "Materi Pokok",
      "Indikator Soal",
      "Level Kognitif",
      "Bentuk Soal",
      "No Soal",
      "Kunci Jawaban",
      "Bobot Skor",
    ];

    const rows = (exam.kisiKisi || []).map((k, idx) => {
      const q = exam.questions ? exam.questions[idx] : null;
      return [
        k.no,
        `[${k.tpCode}] ${k.tpDescription}`,
        k.materiPokok,
        k.indikatorSoal,
        k.levelKognitif || k.tingkatKesulitan || "L2 - C3 (Menerapkan)",
        k.bentukSoal,
        k.nomorSoal,
        q?.kunciJawaban || "-",
        q?.bobotSkor || (k.bentukSoal === "Pilihan Ganda" ? 1 : k.bentukSoal === "Isian Pendek" ? 2 : 3),
      ];
    });

    exportTableToExcelFormat(
      headers,
      rows,
      `Kisi_Dan_Bank_Soal_${exam.examType.replace(/[^a-zA-Z0-9]/g, "_")}_${exam.subject}`,
      "xlsx",
      `KISI-KISI & BANK SOAL ${exam.examType.toUpperCase()} - ${exam.subject.toUpperCase()}`
    );

    triggerFeedback("Berkas Excel (.xlsx) lengkap berhasil diunduh!");
  };

  // 3. Download Template Bank Soal Kosong untuk Rekan Guru
  const downloadTemplate = (format: "excel" | "word") => {
    if (format === "excel") {
      const headers = [
        "No",
        "Tujuan Pembelajaran (TP)",
        "Materi Pokok",
        "Indikator Soal",
        "Level Kognitif (L1/L2/L3)",
        "Bentuk Soal (PG/Isian/Uraian)",
        "Nomor Soal",
        "Butir Pertanyaan",
        "Opsi A",
        "Opsi B",
        "Opsi C",
        "Opsi D",
        "Kunci Jawaban",
        "Bobot Skor",
      ];
      const sampleRows = [
        [
          1,
          "Peserta didik memahami konsep dasar ekosistem",
          "Rantai Makanan",
          "Disajikan ilustrasi, peserta didik dapat menentukan peran produsen",
          "L1 - C2 (Memahami)",
          "Pilihan Ganda",
          1,
          "Peran tumbuhan hijau dalam rantai makanan adalah sebagai...",
          "Produsen",
          "Konsumen I",
          "Konsumen II",
          "Pengurai",
          "A",
          1,
        ],
        [
          2,
          "Peserta didik mampu menganalisis interaksi antar makhluk hidup",
          "Simbiosis",
          "Disajikan kasus kontekstual, peserta didik dapat menganalisis jenis simbiosis",
          "L3 - C4 (Menganalisis)",
          "Pilihan Ganda",
          2,
          "Interaksi antara lebah dan bunga mawar merupakan contoh simbiosis...",
          "Mutualisme",
          "Komensalisme",
          "Parasitisme",
          "Netralisme",
          "A",
          1,
        ],
      ];
      exportTableToExcelFormat(
        headers,
        sampleRows,
        "Template_Bank_Soal_Guru_SD",
        "xlsx",
        "TEMPLATE PENYUSUNAN BANK SOAL & KISI-KISI KOGNITIF"
      );
    } else {
      const templateDoc = `
        <h3 style="text-align: center; text-decoration: underline;">TEMPLATE PENYUSUNAN NASKAH SOAL GURU</h3>
        <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th>No</th><th>TP</th><th>Materi</th><th>Indikator</th><th>Level</th><th>Bentuk</th><th>Butir Soal</th><th>Kunci</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td><td>TP 1...</td><td>Materi A...</td><td>Disajikan teks...</td><td>L1 - C2</td><td>PG</td><td>Tuliskan butir soal di sini...</td><td>A</td>
            </tr>
          </tbody>
        </table>
      `;
      exportHtmlToDoc({
        htmlContent: templateDoc,
        filename: "Template_Penyusunan_Soal_Guru.doc",
        title: "Template Penyusunan Soal Guru",
        schoolIdentity,
      });
    }
    triggerFeedback(`Template ${format.toUpperCase()} berhasil diunduh!`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden transition-all">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Ekspor & Cetak Paket Naskah Soal</span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{exam.subject}</span>
                <span>•</span>
                <span className="text-sky-600 dark:text-sky-400 font-semibold">{exam.gradeClass}</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">TP: {schoolIdentity.academicYear || "2026/2027"}</span>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Sem: {schoolIdentity.semester || "Ganjil"}</span>
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

          {/* Ringkasan Distribusi Taksonomi Kognitif */}
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-950 dark:text-indigo-300">
                <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Distribusi Taksonomi Kognitif (Bloom & Pusmendik)</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                {exam.questions ? exam.questions.length : 0} Butir Soal
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
              <div className="p-2.5 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-xl shadow-xs">
                <div className="font-black text-rose-600 dark:text-rose-400 text-sm">{bloomSummary.hotsPercent}%</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">L3 / HOTS (C4–C6)</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{bloomSummary.hotsCount} Butir</div>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 rounded-xl shadow-xs">
                <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{bloomSummary.motsPercent}%</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">L2 / Aplikasi (C3)</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{bloomSummary.motsCount} Butir</div>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-900/50 rounded-xl shadow-xs">
                <div className="font-black text-sky-600 dark:text-sky-400 text-sm">{bloomSummary.lotsPercent}%</div>
                <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold">L1 / Pemahaman (C1–C2)</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{bloomSummary.lotsCount} Butir</div>
              </div>
            </div>
          </div>

          {/* Opsi 1: Microsoft Word (.doc) */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-600/60 transition-all space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Format Dokumen Word (.doc)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Naskah resmi dengan Kop Sekolah, petunjuk pengerjaan, butir soal terformat, opsi kunci jawaban, dan matriks kisi-kisi kognitif.
                </p>
              </div>
              <button
                onClick={handleExportWord}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Word (.doc)</span>
              </button>
            </div>

            {/* Checkbox Options */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 text-xs">
              <button
                type="button"
                onClick={() => setIncludeMatrixInWord(!includeMatrixInWord)}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
              >
                {includeMatrixInWord ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span>Sertakan Matriks Kisi-Kisi Kognitif</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeKeyInWord(!includeKeyInWord)}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
              >
                {includeKeyInWord ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <span>Sertakan Kunci & Penskoran</span>
              </button>
            </div>
          </div>

          {/* Opsi 2: Microsoft Excel (.xlsx) */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-emerald-400 dark:hover:border-emerald-600/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Format Excel / Spreadsheet (.xlsx)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Memuat tabulasi butir soal, TP, materi pokok, indikator, level kognitif, dan kunci jawaban untuk bank soal.
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

          {/* Opsi 3: Cetak / Simpan PDF Langsung */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-amber-400 dark:hover:border-amber-600/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cetak Langsung / Simpan PDF
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Membuka pratinjau cetak standar A4/F4 lengkap dengan Kop Surat Sekolah dan lembar tanda tangan.
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

          {/* Template Bank Soal untuk Guru */}
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Template Soal Kosong untuk Rekan Guru:</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Unduh template kosong untuk dibagikan ke rekan guru dalam penyusunan naskah soal asesmen.
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
                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-400 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
