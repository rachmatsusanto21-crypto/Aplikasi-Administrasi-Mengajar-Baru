import React, { useState, useMemo } from "react";
import {
  FileText,
  Sparkles,
  Printer,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  ListOrdered,
  BookOpen,
  Building2,
  UserCheck,
  Award,
  Layers,
  Wand2,
  Save,
  History,
  Trash2,
  Eye,
  Search,
} from "lucide-react";
import { SchoolIdentity, CPTPItem, LkpdPackage, AISettings } from "../../types";
import { generateAIContent } from "../../lib/aiHelper";
import { KopSurat } from "../KopSurat";
import { exportTableToExcelFormat } from "../../lib/exportExcel";
import { STORAGE_KEYS, loadStoredData, saveStoredData } from "../../lib/storage";

interface LkpdGeneratorViewProps {
  cptpList?: CPTPItem[];
  subjects?: string[];
  schoolIdentity?: SchoolIdentity;
  initialSelectedTopic?: string;
  onOpenPrintModal?: (title: string, subtitle: string, content: React.ReactNode) => void;
  aiSettings?: AISettings;
}

export const LkpdGeneratorView: React.FC<LkpdGeneratorViewProps> = ({
  cptpList = [],
  subjects = ["Bahasa Indonesia", "Matematika", "IPAS", "Pancasila", "Seni Budaya", "PJOK", "Bahasa Inggris"],
  schoolIdentity,
  initialSelectedTopic = "",
  onOpenPrintModal,
  aiSettings,
}) => {
  const [activeTab, setActiveTab] = useState<"generator" | "history">("generator");

  // Input Parameters Form
  const [subject, setSubject] = useState<string>(subjects[0] || "Bahasa Indonesia");
  const [gradeClass, setGradeClass] = useState<string>(schoolIdentity?.gradeClass || "Kelas IV SD");
  const [materiPokok, setMateriPokok] = useState<string>(initialSelectedTopic || "Anatomi Tumbuhan & Proses Fotosintesis");
  const [jenisLkpd, setJenisLkpd] = useState<"Perorangan (Mandiri)" | "Kelompok (Diskusi/Proyek)" | "PjBL (Project Based)" | "PBL (Problem Based)" | "Discovery Learning">("Kelompok (Diskusi/Proyek)");
  const [alokasiWaktu, setAlokasiWaktu] = useState<string>("2 JP (2 x 35 Menit)");
  const [tingkatKesulitan, setTingkatKesulitan] = useState<string>("HOTS & Analitis");
  const [instruksiTambahan, setInstruksiTambahan] = useState<string>("");

  // Loading & Result States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeLkpd, setActiveLkpd] = useState<LkpdPackage | null>(null);
  const [savedLkpdHistory, setSavedLkpdHistory] = useState<LkpdPackage[]>(() =>
    loadStoredData<LkpdPackage[]>(STORAGE_KEYS.LKPD_HISTORY, [])
  );
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Topic suggestions from CPTP
  const topicSuggestions = useMemo(() => {
    return (cptpList || []).map((cp: any) => ({
      subject: cp.subject || "",
      element: cp.element || "",
      tpCode: cp.codeTP || cp.tpCode || "",
      tpDescription: cp.descriptionTP || cp.tpDescription || cp.tpText || "",
    }));
  }, [cptpList]);

  // Handle Generate LKPD AI
  const handleGenerateLkpd = async () => {
    setIsGenerating(true);
    const prompt = `Buatkan Lembar Kerja Peserta Didik (LKPD) Kurikulum Merdeka untuk Mata Pelajaran ${subject}, ${gradeClass}, materi pokok: "${materiPokok}".
Jenis LKPD: ${jenisLkpd}, Alokasi Waktu: ${alokasiWaktu}, Kesulitan: ${tingkatKesulitan}.
Instruksi Tambahan: ${instruksiTambahan}.

Hasilkan keluaran JSON valid dengan struktur:
{
  "title": "LKPD: Judul Kreatif & Kontekstual",
  "subject": "${subject}",
  "gradeClass": "${gradeClass}",
  "materiPokok": "${materiPokok}",
  "jenisLkpd": "${jenisLkpd}",
  "alokasiWaktu": "${alokasiWaktu}",
  "capaianPembelajaran": "Deskripsi CP yang sesuai",
  "tujuanPembelajaran": "Siswa dapat...",
  "pertanyaanPemantik": "Pertanyaan pemantik?",
  "petunjukKerja": [
    "Petunjuk 1...",
    "Petunjuk 2...",
    "Petunjuk 3..."
  ],
  "langkahAktivitas": [
    { "no": 1, "tahap": "Tahap Awal", "instruksi": "Instruksi langkah 1..." },
    { "no": 2, "tahap": "Pengamatan / Diskusi", "instruksi": "Instruksi langkah 2..." },
    { "no": 3, "tahap": "Analisis / Pelaporan", "instruksi": "Instruksi langkah 3..." }
  ],
  "questions": [
    {
      "no": 1,
      "pertanyaan": "Soal isian/uraian 1...",
      "jenis": "Uraian",
      "kunciJawaban": "Kunci jawaban singkat...",
      "skorMaks": 25
    },
    {
      "no": 2,
      "pertanyaan": "Soal isian/uraian 2...",
      "jenis": "Isian",
      "kunciJawaban": "Kunci jawaban singkat...",
      "skorMaks": 25
    }
  ],
  "rubrikPenilaian": [
    { "kriteria": "Kelengkapan Jawaban & Ketepatan Konsep", "skorMaks": 50, "pedoman": "Pedoman skoring..." },
    { "kriteria": "Kerjasama Kelompok & Kerapan Penulisan", "skorMaks": 50, "pedoman": "Pedoman skoring..." }
  ],
  "refleksiSiswa": "Bagaimana perasaanmu setelah menyelesaikan LKPD ini?"
}`;

    try {
      const response = await generateAIContent({
        prompt,
        systemInstruction: "Anda adalah Pakar Kurikulum Merdeka & Penulis LKPD Profesional SD/SMP. Hasilkan format JSON valid.",
        manualApiKey: aiSettings?.manualApiKey,
      });

      let parsed: any = null;
      if (response) {
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.warn("Parsing JSON LKPD failed, using structured fallback template.");
        }
      }

      const lkpdItem: LkpdPackage = {
        id: `lkpd-${Date.now()}`,
        title: parsed?.title || `LKPD Interaktif: ${materiPokok}`,
        subject,
        gradeClass,
        materiPokok,
        jenisLkpd,
        alokasiWaktu,
        capaianPembelajaran: parsed?.capaianPembelajaran || `Peserta didik menganalisis dan memahami materi ${materiPokok} secara aktif dan kontekstual.`,
        tujuanPembelajaran: parsed?.tujuanPembelajaran || `Melalui aktivitas ${jenisLkpd}, peserta didik mampu menjelaskan, mengidentifikasi, dan menerapkan konsep ${materiPokok} dengan tepat.`,
        pertanyaanPemantik: parsed?.pertanyaanPemantik || `Mengapa kita perlu mempelajari ${materiPokok} dalam kehidupan sehari-hari?`,
        petunjukKerja: parsed?.petunjukKerja || [
          "Tuliskan nama anggota kelompok dan kelas pada kolom identitas yang tersedia.",
          "Bacalah setiap petunjuk langkah kegiatan dengan cermat sebelum berdiskusi.",
          "Kerjakan seluruh soal dan pertanyaan analisis bersama anggota kelompokmu.",
          "Konsultasikan kepada guru jika mengalami kendala atau kesulitan."
        ],
        langkahAktivitas: parsed?.langkahAktivitas || [
          { no: 1, tahap: "Persiapan & Pengamatan", instruksi: `Amati objek/gambar studi kasus tentang ${materiPokok} yang diberikan oleh guru.` },
          { no: 2, tahap: "Diskusi & Eksplorasi", instruksi: "Diskusikan dengan teman kelompokmu mengenai temuan utama dan catat pada tabel kerja." },
          { no: 3, tahap: "Penyusunan Laporan", instruksi: "Buat kesimpulan singkat dan bersiaplah mempresentasikannya di depan kelas." }
        ],
        questions: parsed?.questions || [
          { no: 1, pertanyaan: `Sebutkan 3 komponen utama yang berkaitan dengan ${materiPokok}!`, jenis: "Uraian", kunciJawaban: "Komponen A, Komponen B, dan Komponen C.", skorMaks: 30 },
          { no: 2, pertanyaan: `Jelaskan fungsi utama dari ${materiPokok} bagi lingkungan sekitarmu!`, jenis: "Uraian", kunciJawaban: "Fungsi utama adalah menjaga keseimbangan lingkungan.", skorMaks: 35 },
          { no: 3, pertanyaan: `Bagaimana caramu menerapkan pemahaman materi ${materiPokok} di rumah?`, jenis: "Uraian", kunciJawaban: "Diterapkan dalam kebiasaan sehari-hari.", skorMaks: 35 }
        ],
        rubrikPenilaian: parsed?.rubrikPenilaian || [
          { kriteria: "Ketepatan Analisis & Pemahaman Materi", skorMaks: 50, pedoman: "Mampu menjawab seluruh pertanyaan dengan benar dan logis." },
          { kriteria: "Kerjasama Kelompok & Kerapian LKPD", skorMaks: 50, pedoman: "Aktif berdiskusi dan tulisan rapi dapat dibaca." }
        ],
        refleksiSiswa: parsed?.refleksiSiswa || "Lingkari emoticon perasaanmu setelah menyelesaikan LKPD ini: [ 😀 Senang / 🤔 Penasaran / 💡 Paham ]",
        createdAt: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
      };

      setActiveLkpd(lkpdItem);
      setSavedLkpdHistory((prev) => {
        const updated = [lkpdItem, ...prev];
        saveStoredData(STORAGE_KEYS.LKPD_HISTORY, updated);
        return updated;
      });
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (e) {
      console.error("Error generating LKPD AI:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save active LKPD manually to history
  const handleSaveActiveLkpd = (lkpdToSave?: LkpdPackage) => {
    const target = lkpdToSave || activeLkpd;
    if (!target) return;

    setSavedLkpdHistory((prev) => {
      const existsIndex = prev.findIndex((item) => item.id === target.id);
      let updated: LkpdPackage[];
      if (existsIndex >= 0) {
        updated = [...prev];
        updated[existsIndex] = target;
      } else {
        updated = [target, ...prev];
      }
      saveStoredData(STORAGE_KEYS.LKPD_HISTORY, updated);
      return updated;
    });

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  // Delete LKPD from history
  const handleDeleteLkpdFromHistory = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Apakah Anda yakin ingin menghapus LKPD ini dari riwayat tersimpan?")) return;

    setSavedLkpdHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveStoredData(STORAGE_KEYS.LKPD_HISTORY, updated);
      return updated;
    });

    if (activeLkpd?.id === id) {
      setActiveLkpd(null);
    }
  };

  // Export to Excel (.xlsx)
  const handleExportLkpdExcel = () => {
    if (!activeLkpd) return;

    const headers = ["No", "Tahap / Jenis", "Soal / Instruksi LKPD", "Kunci / Pedoman Jawaban", "Skor Maksimal"];
    const rows = [
      ["", "Identitas", `LKPD: ${activeLkpd.title} (${activeLkpd.subject} - ${activeLkpd.gradeClass})`, "", ""],
      ["", "Materi Pokok", activeLkpd.materiPokok, "", ""],
      ["", "CP", activeLkpd.capaianPembelajaran, "", ""],
      ["", "TP", activeLkpd.tujuanPembelajaran, "", ""],
      ...activeLkpd.questions.map((q) => [
        q.no,
        q.jenis,
        q.pertanyaan,
        q.kunciJawaban || "-",
        q.skorMaks || 25,
      ]),
    ];

    exportTableToExcelFormat(headers, rows, `LKPD_${activeLkpd.subject}_${activeLkpd.gradeClass}.xlsx`, "xlsx", "LKPD Siswa");
  };

  // Handle Print LKPD
  const handlePrintLkpd = () => {
    if (!activeLkpd || !onOpenPrintModal) return;

    const printableContent = (
      <div className="p-2 space-y-4 text-slate-900 bg-white font-sans text-xs">
        {/* Tabel Identitas Murid */}
        <div className="border border-slate-900 p-3 rounded space-y-1">
          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
            <div>Nama Siswa / Kelompok : ___________________________</div>
            <div>Kelas / Semester : {activeLkpd.gradeClass} / Ganjil</div>
            <div>Materi Pokok : {activeLkpd.materiPokok}</div>
            <div>Alokasi Waktu : {activeLkpd.alokasiWaktu}</div>
          </div>
        </div>

        {/* CP & TP */}
        <div className="space-y-1">
          <p><b>Capaian Pembelajaran (CP):</b> {activeLkpd.capaianPembelajaran}</p>
          <p><b>Tujuan Pembelajaran (TP):</b> {activeLkpd.tujuanPembelajaran}</p>
          <p><b>Pertanyaan Pemantik:</b> {activeLkpd.pertanyaanPemantik}</p>
        </div>

        {/* Petunjuk Kerja */}
        <div className="border-t border-b border-slate-300 py-2">
          <h4 className="font-bold text-xs uppercase mb-1">A. Petunjuk Kerja:</h4>
          <ol className="list-decimal list-inside space-y-0.5">
            {activeLkpd.petunjukKerja.map((p, idx) => (
              <li key={idx}>{p}</li>
            ))}
          </ol>
        </div>

        {/* Langkah Aktivitas */}
        <div>
          <h4 className="font-bold text-xs uppercase mb-1">B. Langkah-Langkah Aktivitas:</h4>
          <div className="space-y-2">
            {activeLkpd.langkahAktivitas.map((act) => (
              <div key={act.no} className="border border-slate-300 p-2.5 rounded">
                <span className="font-bold text-slate-900">Langkah {act.no} [{act.tahap}]:</span>
                <p className="mt-0.5 text-slate-800">{act.instruksi}</p>
                <div className="mt-3 border-t border-dashed border-slate-300 pt-2 text-slate-400 italic text-[10px]">
                  [Area Lembar Catatan / Hasil Pengamatan Siswa]
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Soal Latihan / Pertanyaan Analisis */}
        <div>
          <h4 className="font-bold text-xs uppercase mb-1">C. Pertanyaan Analisis & Pemahaman:</h4>
          <div className="space-y-3">
            {activeLkpd.questions.map((q) => (
              <div key={q.no} className="space-y-1">
                <p className="font-bold">{q.no}. {q.pertanyaan} <span className="text-[10px] font-normal text-slate-600">(Skor Maks: {q.skorMaks})</span></p>
                <div className="border border-slate-300 rounded p-4 h-16 bg-slate-50/50 text-slate-400 text-[10px] italic">
                  Jawaban:
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Refleksi */}
        <div className="border-t border-slate-300 pt-2">
          <h4 className="font-bold text-xs uppercase mb-1">D. Refleksi Siswa:</h4>
          <p className="italic">{activeLkpd.refleksiSiswa}</p>
        </div>
      </div>
    );

    onOpenPrintModal(
      `LEMBAR KERJA PESERTA DIDIK (LKPD) - ${activeLkpd.title}`,
      `Mata Pelajaran: ${activeLkpd.subject} | ${activeLkpd.gradeClass}`,
      printableContent
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>LKPD Berhasil Disimpan ke Riwayat Storage!</span>
        </div>
      )}

      {/* Banner Top LKPD */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-xs font-bold text-emerald-100">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Generator LKPD (Lembar Kerja Peserta Didik) AI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              📝 Generator LKPD AI Kurikulum Merdeka
            </h1>
            <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed font-medium">
              Buat Lembar Kerja Peserta Didik (LKPD) kontekstual dan interaktif secara otomatis berdasarkan Prompt AI sesuai Mata Pelajaran, Kelas, dan Materi Pokok. Siap Cetak A4 / PDF.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveTab("generator")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === "generator"
                  ? "bg-white text-emerald-950 shadow-md scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>Generator LKPD</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                activeTab === "history"
                  ? "bg-white text-emerald-950 shadow-md scale-105"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat LKPD ({savedLkpdHistory.length})</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "generator" ? (
        /* Main Grid Generator */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Parameters Form */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 text-emerald-700 dark:text-emerald-400">
              <Wand2 className="w-5 h-5" />
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                Menu Prompt LKPD AI
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Mata Pelajaran */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white"
                >
                  {subjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kelas / Fase */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kelas / Fase
                </label>
                <select
                  value={gradeClass}
                  onChange={(e) => setGradeClass(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="Kelas I SD">Kelas I SD (Fase A)</option>
                  <option value="Kelas II SD">Kelas II SD (Fase A)</option>
                  <option value="Kelas III SD">Kelas III SD (Fase B)</option>
                  <option value="Kelas IV SD">Kelas IV SD (Fase B)</option>
                  <option value="Kelas V SD">Kelas V SD (Fase C)</option>
                  <option value="Kelas VI SD">Kelas VI SD (Fase C)</option>
                </select>
              </div>

              {/* Materi Pokok / Topik */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Materi Pokok / Topik Utama
                  </label>
                  {topicSuggestions.length > 0 && (
                    <span className="text-[10px] text-emerald-600 font-bold">
                      {topicSuggestions.length} TP Terhubung
                    </span>
                  )}
                </div>

                {topicSuggestions.length > 0 && (
                  <select
                    onChange={(e) => {
                      if (e.target.value) setMateriPokok(e.target.value);
                    }}
                    className="w-full mb-2 p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-950 dark:text-emerald-200 text-xs font-semibold"
                  >
                    <option value="">-- Impor dari Tujuan Pembelajaran (TP) --</option>
                    {topicSuggestions.map((tp, idx) => (
                      <option key={idx} value={`${tp.tpCode ? tp.tpCode + ": " : ""}${tp.tpDescription}`}>
                        [{tp.subject}] {tp.tpCode || `TP-${idx + 1}`}: {(tp.tpDescription || "").slice(0, 40)}...
                      </option>
                    ))}
                  </select>
                )}

                <input
                  type="text"
                  value={materiPokok}
                  onChange={(e) => setMateriPokok(e.target.value)}
                  placeholder="Ketik materi pokok LKPD..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                />
              </div>

              {/* Jenis LKPD */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Model / Jenis Aktivitas LKPD
                </label>
                <select
                  value={jenisLkpd}
                  onChange={(e) => setJenisLkpd(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="Kelompok (Diskusi/Proyek)">Kelompok (Diskusi / Kolaboratif)</option>
                  <option value="Perorangan (Mandiri)">Perorangan (Mandiri / Latihan)</option>
                  <option value="PjBL (Project Based)">PjBL (Project Based Learning)</option>
                  <option value="PBL (Problem Based)">PBL (Problem Based Learning)</option>
                  <option value="Discovery Learning">Discovery Learning (Penemuan)</option>
                </select>
              </div>

              {/* Alokasi Waktu */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Alokasi Waktu
                </label>
                <input
                  type="text"
                  value={alokasiWaktu}
                  onChange={(e) => setAlokasiWaktu(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold"
                />
              </div>

              {/* Instruksi Tambahan */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Instruksi Khusus (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={instruksiTambahan}
                  onChange={(e) => setInstruksiTambahan(e.target.value)}
                  placeholder="Contoh: Sertakan tabel pengamatan 4 kolom dan kuis refleksi..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateLkpd}
                disabled={isGenerating}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 hover:from-emerald-700 hover:to-indigo-800 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98 disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Merancang LKPD AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-200" />
                    <span>Generate LKPD AI Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live A4 LKPD Preview & Actions */}
          <div className="lg:col-span-7 space-y-4">
            {!activeLkpd ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">
                  Pratinjau Hasil LKPD Siap Cetak
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Isi parameter LKPD di sebelah kiri, lalu klik tombol <b>Generate LKPD AI Sekarang</b> untuk melihat lembar kerja A4 interaktif.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Action Toolbar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                      {activeLkpd.jenisLkpd}
                    </span>
                    <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base mt-0.5">
                      {activeLkpd.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleSaveActiveLkpd()}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-4 h-4" />
                      <span>Simpan LKPD</span>
                    </button>

                    <button
                      onClick={handlePrintLkpd}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak / PDF</span>
                    </button>

                    <button
                      onClick={handleExportLkpdExcel}
                      className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>

                {/* Printable A4 Sheet Preview Box */}
                <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5 text-xs font-sans">
                  <KopSurat schoolIdentity={schoolIdentity} title="LEMBAR KERJA PESERTA DIDIK (LKPD)" subtitle={`Mata Pelajaran: ${activeLkpd.subject} | ${activeLkpd.gradeClass}`} />

                  {/* Identitas Siswa Box */}
                  <div className="border border-slate-300 p-3 rounded-xl bg-slate-50/70 space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold">
                      <div><b>Nama Siswa/Kelompok:</b> ___________________</div>
                      <div><b>Kelas / Semester:</b> {activeLkpd.gradeClass} / Ganjil</div>
                      <div><b>Materi Pokok:</b> {activeLkpd.materiPokok}</div>
                      <div><b>Alokasi Waktu:</b> {activeLkpd.alokasiWaktu}</div>
                    </div>
                  </div>

                  {/* CP & TP */}
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1 text-emerald-950 font-medium">
                    <p><b>🎯 Capaian Pembelajaran:</b> {activeLkpd.capaianPembelajaran}</p>
                    <p><b>📌 Tujuan Pembelajaran:</b> {activeLkpd.tujuanPembelajaran}</p>
                    <p><b>❓ Pertanyaan Pemantik:</b> {activeLkpd.pertanyaanPemantik}</p>
                  </div>

                  {/* Petunjuk Kerja */}
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-xs uppercase text-slate-900 border-b border-slate-200 pb-1">
                      A. Petunjuk Kerja:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-slate-800">
                      {activeLkpd.petunjukKerja.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Langkah Aktivitas */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xs uppercase text-slate-900 border-b border-slate-200 pb-1">
                      B. Langkah-Langkah Aktivitas Belajar:
                    </h4>
                    {activeLkpd.langkahAktivitas.map((act) => (
                      <div key={act.no} className="border border-slate-200 p-3 rounded-xl bg-slate-50 space-y-1">
                        <span className="font-bold text-emerald-800">Langkah {act.no} [{act.tahap}]:</span>
                        <p className="text-slate-800 leading-relaxed">{act.instruksi}</p>
                        <div className="mt-2 border-t border-dashed border-slate-300 pt-2 text-slate-400 italic text-[11px]">
                          [Kolom Lembar Kerja & Pengamatan Siswa]
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Questions */}
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-xs uppercase text-slate-900 border-b border-slate-200 pb-1">
                      C. Soal Latihan & Pertanyaan Analisis HOTS:
                    </h4>
                    {activeLkpd.questions.map((q) => (
                      <div key={q.no} className="space-y-1.5">
                        <p className="font-bold text-slate-900">
                          {q.no}. {q.pertanyaan}{" "}
                          <span className="text-[10px] text-slate-500 font-normal">(Skor Maks: {q.skorMaks})</span>
                        </p>
                        <div className="border border-slate-200 rounded-xl p-3 h-16 bg-slate-50 text-slate-400 italic text-[10px]">
                          Jawaban Siswa:
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rubrik & Refleksi */}
                  <div className="border-t border-slate-200 pt-3 space-y-2">
                    <h4 className="font-extrabold text-xs uppercase text-slate-900">D. Refleksi Siswa:</h4>
                    <p className="italic text-slate-700">{activeLkpd.refleksiSiswa}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Riwayat LKPD History View */
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari LKPD tersimpan berdasarkan judul atau mata pelajaran..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              Total LKPD Tersimpan: <span className="text-emerald-600 font-black">{savedLkpdHistory.length}</span>
            </div>
          </div>

          {savedLkpdHistory.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <History className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">
                Belum Ada Riwayat LKPD Tersimpan
              </h3>
              <p className="text-xs text-slate-500">
                LKPD yang Anda generate secara otomatis tersimpan di sini untuk digunakan kembali, dicetak, atau diekspor ke Excel.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedLkpdHistory
                .filter(
                  (item) =>
                    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    item.materiPokok.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase">
                          {item.subject} - {item.gradeClass}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          {item.createdAt}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 font-medium">
                        <b>Topik:</b> {item.materiPokok}
                      </p>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>⏱️ {item.alokasiWaktu}</span>
                        <span>•</span>
                        <span>📋 {item.questions?.length || 0} Soal</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setActiveLkpd(item);
                          setActiveTab("generator");
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratinjau</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDeleteLkpdFromHistory(item.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all"
                          title="Hapus dari Riwayat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
