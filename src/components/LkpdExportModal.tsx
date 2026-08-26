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
  Award,
  Layers,
  HelpCircle,
} from "lucide-react";
import { LkpdPackage, SchoolIdentity, SemesterType } from "../types";
import { exportHtmlToDoc } from "../lib/exportDoc";
import { exportTableToExcelFormat } from "../lib/exportExcel";

interface LkpdExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lkpd: LkpdPackage;
  schoolIdentity?: SchoolIdentity;
  onOpenPrintModal?: () => void;
}

export const LkpdExportModal: React.FC<LkpdExportModalProps> = ({
  isOpen,
  onClose,
  lkpd,
  schoolIdentity = {
    schoolName: "SD NEGERI 1 MERDEKA",
    academicYear: "2026/2027",
    semester: "Ganjil" as SemesterType,
    gradeClass: "Kelas IV",
  },
  onOpenPrintModal,
}) => {
  const [includeRubric, setIncludeRubric] = useState<boolean>(true);
  const [includeAnswerKey, setIncludeAnswerKey] = useState<boolean>(true);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerFeedback = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  // 1. Ekspor Word (.doc)
  const handleExportWord = async () => {
    const petunjukList = (lkpd.petunjukKerja || [])
      .map((p, i) => `<li style="margin-bottom: 3px;">${p}</li>`)
      .join("");

    const stepsRows = (lkpd.langkahAktivitas || [])
      .map(
        (st) => `
      <tr>
        <td style="border: 1px solid #333; text-align: center; width: 6%;">${st.no}</td>
        <td style="border: 1px solid #333; width: 25%; font-weight: bold;">${st.tahap}</td>
        <td style="border: 1px solid #333;">${st.instruksi}</td>
      </tr>
    `
      )
      .join("");

    const questionsHtml = (lkpd.questions || [])
      .map((q) => {
        let optHtml = "";
        if (q.pilihan && q.pilihan.length > 0) {
          optHtml = `
            <ol type="A" style="margin: 4px 0; padding-left: 20px;">
              ${q.pilihan.map((p) => `<li>${p}</li>`).join("")}
            </ol>
          `;
        } else {
          optHtml = `
            <div style="border: 1px dashed #aaa; height: 50px; margin: 6px 0 12px 0; background: #fafafa;"></div>
          `;
        }
        return `
          <div style="margin-bottom: 12px;">
            <p style="margin: 0 0 4px 0;"><b>${q.no}.</b> ${q.pertanyaan}</p>
            ${optHtml}
          </div>
        `;
      })
      .join("");

    let keySectionHtml = "";
    if (includeAnswerKey && lkpd.questions && lkpd.questions.length > 0) {
      keySectionHtml = `
        <div style="page-break-before: always; margin-top: 30px;">
          <h3 style="text-align: center; text-decoration: underline; margin-bottom: 15px;">KUNCI JAWABAN & PEDOMAN PENSKORAN LKPD</h3>
          <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
            <thead>
              <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
                <th style="width: 8%; border: 1px solid #333;">No</th>
                <th style="width: 15%; border: 1px solid #333;">Bentuk</th>
                <th style="border: 1px solid #333; text-align: left;">Kunci Jawaban</th>
                <th style="width: 12%; border: 1px solid #333;">Skor Maks</th>
              </tr>
            </thead>
            <tbody>
              ${lkpd.questions
                .map(
                  (q) => `
                <tr>
                  <td style="border: 1px solid #333; text-align: center;">${q.no}</td>
                  <td style="border: 1px solid #333; text-align: center;">${q.jenis}</td>
                  <td style="border: 1px solid #333;">${q.kunciJawaban || "-"}</td>
                  <td style="border: 1px solid #333; text-align: center;">${q.skorMaks || 20}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    let rubricSectionHtml = "";
    if (includeRubric && lkpd.rubrikPenilaian && lkpd.rubrikPenilaian.length > 0) {
      rubricSectionHtml = `
        <div style="page-break-before: always; margin-top: 30px;">
          <h3 style="text-align: center; text-decoration: underline; margin-bottom: 15px;">RUBRIK PENILAIAN KINERJA LKPD</h3>
          <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
            <thead>
              <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
                <th style="width: 25%; border: 1px solid #333;">Aspek Dinilai</th>
                <th style="border: 1px solid #333;">Sangat Baik (4)</th>
                <th style="border: 1px solid #333;">Baik (3)</th>
                <th style="border: 1px solid #333;">Cukup (2)</th>
                <th style="border: 1px solid #333;">Perlu Bimbingan (1)</th>
              </tr>
            </thead>
            <tbody>
              ${lkpd.rubrikPenilaian
                .map(
                  (r) => `
                <tr>
                  <td style="border: 1px solid #333; font-weight: bold;">${r.aspek}</td>
                  <td style="border: 1px solid #333;">${r.kriteria4}</td>
                  <td style="border: 1px solid #333;">${r.kriteria3}</td>
                  <td style="border: 1px solid #333;">${r.kriteria2}</td>
                  <td style="border: 1px solid #333;">${r.kriteria1}</td>
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
        <h2 style="margin: 0; font-size: 14pt; text-transform: uppercase;">LEMBAR KERJA PESERTA DIDIK (LKPD)</h2>
        <p style="margin: 3px 0; font-size: 11pt;"><b>${lkpd.title}</b></p>
        <p style="margin: 0; font-size: 10pt; color: #555;">Jenis Aktivitas: ${lkpd.jenisLkpd} | Alokasi Waktu: ${lkpd.alokasiWaktu}</p>
      </div>

      <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt; margin-bottom: 15px;">
        <tr>
          <td style="width: 20%; background-color: #f9f9f9;"><b>Nama Siswa / Kelompok</b></td>
          <td style="width: 30%;">...................................................</td>
          <td style="width: 20%; background-color: #f9f9f9;"><b>Mata Pelajaran</b></td>
          <td style="width: 30%;">${lkpd.subject}</td>
        </tr>
        <tr>
          <td style="background-color: #f9f9f9;"><b>Kelas / Semester</b></td>
          <td>${lkpd.gradeClass} / ${schoolIdentity.semester || "Ganjil"}</td>
          <td style="background-color: #f9f9f9;"><b>Materi Pokok</b></td>
          <td>${lkpd.materiPokok}</td>
        </tr>
      </table>

      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; margin-bottom: 15px; font-size: 10pt;">
        <p style="margin: 0 0 4px 0;"><b>🎯 Capaian Pembelajaran:</b> ${lkpd.capaianPembelajaran || "-"}</p>
        <p style="margin: 0 0 4px 0;"><b>📌 Tujuan Pembelajaran:</b> ${lkpd.tujuanPembelajaran || "-"}</p>
        <p style="margin: 0;"><b>❓ Pertanyaan Pemantik:</b> ${lkpd.pertanyaanPemantik || "-"}</p>
      </div>

      <div style="margin-bottom: 15px; font-size: 10pt;">
        <h4 style="margin: 0 0 6px 0; text-transform: uppercase;">A. Petunjuk Pengerjaan:</h4>
        <ol style="margin: 0; padding-left: 20px;">
          ${petunjukList}
        </ol>
      </div>

      <div style="margin-bottom: 15px; font-size: 10pt;">
        <h4 style="margin: 0 0 6px 0; text-transform: uppercase;">B. Langkah Aktivitas & Eksplorasi:</h4>
        <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
              <th>No</th>
              <th>Tahap Kegiatan</th>
              <th>Instruksi / Lembar Kerja</th>
            </tr>
          </thead>
          <tbody>
            ${stepsRows}
          </tbody>
        </table>
      </div>

      <div style="margin-bottom: 25px; font-size: 10pt;">
        <h4 style="margin: 0 0 10px 0; text-transform: uppercase;">C. Lembar Tugas & Soal Asesmen Formatif:</h4>
        ${questionsHtml}
      </div>

      ${keySectionHtml}
      ${rubricSectionHtml}
    `;

    await exportHtmlToDoc({
      htmlContent: docContent,
      filename: `LKPD_${lkpd.subject}_${(lkpd.materiPokok || "Topik").replace(/[^a-zA-Z0-9]/g, "_")}.doc`,
      title: `LKPD - ${lkpd.subject} - ${lkpd.materiPokok}`,
      schoolIdentity,
    });

    triggerFeedback("Dokumen Word (.doc) LKPD berhasil diunduh!");
  };

  // 2. Ekspor Excel (.xlsx)
  const handleExportExcel = () => {
    const headers = [
      "No",
      "Tahap Aktivitas / Soal",
      "Deskripsi / Pertanyaan",
      "Kunci Jawaban / Kriteria",
      "Skor",
    ];

    const rows: (string | number)[][] = [];
    (lkpd.langkahAktivitas || []).forEach((st) => {
      rows.push([st.no, `Aktivitas: ${st.tahap}`, st.instruksi, "-", "-"]);
    });

    (lkpd.questions || []).forEach((q) => {
      rows.push([q.no, `Soal (${q.jenis})`, q.pertanyaan, q.kunciJawaban || "-", q.skorMaks || 20]);
    });

    exportTableToExcelFormat(
      headers,
      rows,
      `LKPD_${lkpd.subject}_${(lkpd.materiPokok || "Topik").replace(/[^a-zA-Z0-9]/g, "_")}`,
      "xlsx",
      `LEMBAR KERJA PESERTA DIDIK (LKPD) - ${lkpd.subject.toUpperCase()}`
    );

    triggerFeedback("File Spreadsheet (.xlsx) LKPD berhasil diunduh!");
  };

  // 3. Download Template LKPD
  const downloadTemplate = (format: "excel" | "word") => {
    if (format === "excel") {
      const headers = ["No", "Komponen LKPD", "Panduan Pengisian Guru"];
      const rows = [
        [1, "Identitas LKPD", "Mata Pelajaran, Fase/Kelas, Materi Pokok, Alokasi Waktu"],
        [2, "Tujuan Pembelajaran", "Kemampuan yang ingin dicapai melalui aktivitas LKPD"],
        [3, "Pertanyaan Pemantik", "Pertanyaan menggugah rasa ingin tahu siswa"],
        [4, "Petunjuk Pengerjaan", "Langkah kerja yang jelas, ringkas, dan ramah anak"],
        [5, "Langkah Aktivitas", "Tahap observasi, eksplorasi, diskusi, dan presentasi"],
        [6, "Soal / Tugas", "Pertanyaan evaluasi berbasis stimulus kontekstual"],
        [7, "Rubrik Penilaian", "Kriteria penskoran skala 1-4 untuk aspek kinerja"],
      ];
      exportTableToExcelFormat(headers, rows, "Template_LKPD_Guru_SD", "xlsx", "TEMPLATE LKPD KURIKULUM MERDEKA");
    } else {
      handleExportWord();
    }
    triggerFeedback(`Template LKPD (${format.toUpperCase()}) berhasil diunduh!`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full flex flex-col shadow-2xl overflow-hidden transition-all">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 text-teal-600 dark:text-teal-400 rounded-2xl">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Ekspor Lembar Kerja Peserta Didik (LKPD)</span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{lkpd.subject}</span>
                <span>•</span>
                <span className="text-sky-600 dark:text-sky-400 font-semibold">{lkpd.gradeClass}</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{lkpd.jenisLkpd}</span>
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

          {/* LKPD Summary Box */}
          <div className="p-4 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-950 dark:text-teal-300">
                <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Ringkasan Lembar Kerja Peserta Didik</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold border border-teal-200 dark:border-teal-800">
                {lkpd.alokasiWaktu}
              </span>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300">
              <div className="font-bold text-slate-900 dark:text-white text-sm">{lkpd.title}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Materi: <b>{lkpd.materiPokok}</b> • Terdiri dari {lkpd.langkahAktivitas?.length || 0} langkah eksplorasi, {lkpd.questions?.length || 0} butir tugas formatif, dan rubrik penilaian.
              </div>
            </div>
          </div>

          {/* Opsi 1: Microsoft Word (.doc) */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-teal-400 dark:hover:border-teal-600/60 transition-all space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Format Dokumen Word (.doc)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Naskah LKPD lengkap dengan Kop Surat Sekolah, tabel identitas murid/kelompok, instruksi kerja, dan opsi rubrik penilaian.
                </p>
              </div>
              <button
                onClick={handleExportWord}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Word (.doc)</span>
              </button>
            </div>

            {/* Checkboxes */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs">
              <button
                type="button"
                onClick={() => setIncludeRubric(!includeRubric)}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
              >
                {includeRubric ? <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
                <span>Sertakan Rubrik Penilaian Kinerja</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludeAnswerKey(!includeAnswerKey)}
                className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none"
              >
                {includeAnswerKey ? <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-400 shrink-0" />}
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
                Memuat tabulasi tahapan aktivitas, butir penugasan, dan penskoran LKPD.
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

          {/* Opsi 3: Cetak Langsung / Simpan PDF */}
          <div className="p-4.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-amber-400 dark:hover:border-amber-600/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cetak Langsung / Simpan PDF
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pratinjau cetak A4/F4 resmi siap cetak untuk dibagikan kepada peserta didik.
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

          {/* Template LKPD untuk Guru */}
          <div className="p-3.5 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Info className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Template LKPD Kosong untuk Rekan Guru:</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Bagikan template berikut untuk mempermudah penyusunan LKPD pembelajaran.
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
                className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-teal-700 dark:text-teal-400 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
