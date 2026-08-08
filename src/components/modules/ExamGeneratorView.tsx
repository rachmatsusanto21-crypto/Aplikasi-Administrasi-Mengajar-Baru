import React, { useState, useMemo } from "react";
import { generateAIContent } from "../../lib/aiHelper";
import {
  SchoolIdentity,
  CPTPItem,
  ProtaItem,
  ExamPackage,
  ExamType,
  ExamKisiKisi,
  ExamQuestion,
  AISettings,
} from "../../types";
import { KopSurat } from "../KopSurat";
import { ExportActionBar } from "../ExportActionBar";
import {
  Sparkles,
  FileText,
  Printer,
  Table,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  HelpCircle,
  FileCheck,
  BookOpen,
  Layers,
  ListChecks,
  AlertCircle,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ExamGeneratorViewProps {
  schoolIdentity: SchoolIdentity;
  cptpItems: CPTPItem[];
  subjects: string[];
  protaList: ProtaItem[];
  savedExams: ExamPackage[];
  onSaveExam: (exam: ExamPackage) => void;
  onDeleteExam: (id: string) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
  aiSettings: AISettings;
}

export const ExamGeneratorView: React.FC<ExamGeneratorViewProps> = ({
  schoolIdentity,
  cptpItems,
  subjects,
  protaList,
  savedExams,
  onSaveExam,
  onDeleteExam,
  onOpenPrint,
  aiSettings,
}) => {
  // Form States
  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || "Matematika");
  const [examType, setExamType] = useState<ExamType>("STS (Sumatif Tengah Semester)");
  const [timeAllocation, setTimeAllocation] = useState<string>("90 Menit");
  const [examDate, setExamDate] = useState<string>(new Date().toISOString().split("T")[0]);
  
  // Multiple Materials state
  const [materiInput, setMateriInput] = useState<string>("");
  const [materiList, setMateriList] = useState<string[]>([
    "Pancasila dan Fondasi Berbangsa",
    "Hak dan Kewajiban Warga Negara",
  ]);

  // Selected TPs state
  const [selectedTPCodes, setSelectedTPCodes] = useState<string[]>([]);
  const [customTPInput, setCustomTPInput] = useState<string>("");

  // AI Loading & Result state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"kisi" | "soal" | "history">("kisi");
  
  // Current Generated Exam
  const [currentExam, setCurrentExam] = useState<ExamPackage | null>(null);

  // Available TPs for selected subject
  const availableTPs = useMemo(() => {
    const list: { code: string; desc: string }[] = [];
    
    // 1. From CPTP Items
    cptpItems.forEach((item) => {
      if (item.subject.toLowerCase().trim() === selectedSubject.toLowerCase().trim()) {
        const code = item.codeTP || item.id;
        const desc = item.descriptionTP;
        if (code && desc && !list.some((x) => x.code === code)) {
          list.push({ code, desc });
        }
      }
    });

    // 2. From Prota Items
    protaList.forEach((p) => {
      if (p.subject.toLowerCase().trim() === selectedSubject.toLowerCase().trim()) {
        const code = p.codeTP || p.tpCode || p.id;
        const desc = p.tpDescription;
        if (code && desc && !list.some((x) => x.code === code)) {
          list.push({ code, desc });
        }
      }
    });

    // Fallback default if empty
    if (list.length === 0) {
      list.push(
        { code: "TP 1", desc: `Memahami konsep dasar materi ${selectedSubject}` },
        { code: "TP 2", desc: `Menganalisis dan menerapkan prosedur penyelesaian masalah ${selectedSubject}` },
        { code: "TP 3", desc: `Mengevaluasi dan merefleksikan penerapan ${selectedSubject} dalam kehidupan harian` }
      );
    }

    return list;
  }, [cptpItems, protaList, selectedSubject]);

  // Handle Add Materi
  const handleAddMateri = () => {
    const trimmed = materiInput.trim();
    if (!trimmed) return;
    if (!materiList.includes(trimmed)) {
      setMateriList([...materiList, trimmed]);
    }
    setMateriInput("");
  };

  const handleRemoveMateri = (index: number) => {
    setMateriList(materiList.filter((_, i) => i !== index));
  };

  // Handle Add Custom TP
  const handleAddCustomTP = () => {
    const trimmed = customTPInput.trim();
    if (!trimmed) return;
    const newCode = `TP-${Date.now().toString().slice(-3)}`;
    availableTPs.push({ code: newCode, desc: trimmed });
    setSelectedTPCodes([...selectedTPCodes, newCode]);
    setCustomTPInput("");
  };

  // Toggle TP selection
  const handleToggleTP = (code: string) => {
    if (selectedTPCodes.includes(code)) {
      setSelectedTPCodes(selectedTPCodes.filter((c) => c !== code));
    } else {
      setSelectedTPCodes([...selectedTPCodes, code]);
    }
  };

  const handleSelectAllTPs = () => {
    if (selectedTPCodes.length === availableTPs.length) {
      setSelectedTPCodes([]);
    } else {
      setSelectedTPCodes(availableTPs.map((t) => t.code));
    }
  };

  // Question specs based on exam type
  const getQuestionCountSpec = (type: ExamType) => {
    if (type === "Ulangan Akhir Bab") {
      return { total: 10, pg: 5, isian: 3, uraian: 2 };
    }
    // STS or SAS
    return { total: 35, pg: 20, isian: 10, uraian: 5 };
  };

  // Generate Exam with AI Gemini
  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setAiError(null);

    const specs = getQuestionCountSpec(examType);
    const selectedTPObjs = availableTPs.filter((t) => selectedTPCodes.includes(t.code));
    const activeTPs = selectedTPObjs.length > 0 ? selectedTPObjs : availableTPs.slice(0, 3);
    const activeMateri = materiList.length > 0 ? materiList : [`Materi Pokok Utama ${selectedSubject}`];

    const prompt = `
Anda adalah seorang Pakar Penyusun Soal Asesmen Sekolah Dasar (SD) Kurikulum Merdeka berstandar Nasional.
Buatkan Paket Naskah Soal dan Kisi-Kisi Asesmen dengan spesifikasi ketat berikut:

SPESIFIKASI DOKUMEN:
- Mata Pelajaran: ${selectedSubject}
- Jenis Evaluasi: ${examType}
- Kelas/Fase: ${schoolIdentity.gradeClass || "Kelas IV"} / ${schoolIdentity.phase || "Fase B"}
- Alokasi Waktu: ${timeAllocation}
- Tanggal Pelaksanaan: ${examDate}
- Materi Pokok (${activeMateri.length} Materi): ${activeMateri.join(", ")}
- Tujuan Pembelajaran / TP (${activeTPs.length} TP):
${activeTPs.map((t) => `  * [${t.code}] ${t.desc}`).join("\n")}

KETENTUAN JUMLAH DAN BENTUK SOAL (MUST BE EXACT):
Total Soal = ${specs.total} Soal
1. Pilihan Ganda (PG) = EXACTLY ${specs.pg} Soal (Nomor 1 sampai ${specs.pg})
2. Isian Pendek = EXACTLY ${specs.isian} Soal (Nomor ${specs.pg + 1} sampai ${specs.pg + specs.isian})
3. Uraian / Essay = EXACTLY ${specs.uraian} Soal (Nomor ${specs.pg + specs.isian + 1} sampai ${specs.total})

PETUNJUK OUTPUT JSON:
Kembalikan HANYA format JSON murni tanpa markdown triple backticks (tanpa \`\`\`json) dengan skema persis sebagai berikut:

{
  "title": "NASKAH SOAL ${examType.toUpperCase()} ${selectedSubject.toUpperCase()}",
  "kisiKisi": [
    {
      "no": 1,
      "tpCode": "${activeTPs[0]?.code || "TP 1"}",
      "tpDescription": "${activeTPs[0]?.desc || "Memahami materi"}",
      "materiPokok": "${activeMateri[0] || "Materi Utama"}",
      "indikatorSoal": "Disajikan ilustrasi, siswa dapat menentukan...",
      "bentukSoal": "Pilihan Ganda",
      "nomorSoal": "1",
      "tingkatKesulitan": "L1 (Mudah)"
    }
  ],
  "questions": [
    {
      "no": 1,
      "jenis": "PG",
      "pertanyaan": "Pertanyaan Pilihan Ganda nomor 1...",
      "pilihan": ["A. Opsi A", "B. Opsi B", "C. Opsi C", "D. Opsi D"],
      "kunciJawaban": "A. Opsi A"
    },
    {
      "no": ${specs.pg + 1},
      "jenis": "ISIAN",
      "pertanyaan": "Pertanyaan Isian nomor ${specs.pg + 1}...",
      "kunciJawaban": "Jawaban Isian Singkat"
    },
    {
      "no": ${specs.pg + specs.isian + 1},
      "jenis": "URAIAN",
      "pertanyaan": "Pertanyaan Uraian nomor ${specs.pg + specs.isian + 1}...",
      "kunciJawaban": "Penjelasan Uraian Lengkap..."
    }
  ]
}

CATATAN PENTING:
- Pastikan jumlah kisiKisi persis ${specs.total} item sesuai nomor 1 sampai ${specs.total}.
- Pastikan jumlah questions persis ${specs.total} item.
- Pilihan ganda harus memiliki 4 opsi (A, B, C, D).
- Bahasa Indonesia yang digunakan harus baku, santun, jelas, dan sesuai tingkat kognitif SD Kurikulum Merdeka.
`;

    try {
      const resultText = await generateAIContent({
        prompt,
        model: aiSettings.selectedAgent || "gemini-3.6-flash",
        manualApiKey: aiSettings.manualApiKey || undefined,
      });

      let rawText = (resultText || "").trim();
      if (rawText.startsWith("```")) {
        rawText = rawText.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      }

      const firstBrace = rawText.indexOf("{");
      const lastBrace = rawText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        rawText = rawText.slice(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(rawText);

      const newExam: ExamPackage = {
        id: `EXAM-${Date.now()}`,
        title: parsed.title || `NASKAH SOAL ${examType} ${selectedSubject}`,
        examType,
        subject: selectedSubject,
        gradeClass: `${schoolIdentity.gradeClass || "Kelas IV"} / ${schoolIdentity.phase || "Fase B"}`,
        materiList: activeMateri,
        selectedTPs: activeTPs,
        timeAllocation,
        examDate,
        kisiKisi: parsed.kisiKisi || [],
        questions: parsed.questions || [],
        createdAt: new Date().toISOString(),
      };

      setCurrentExam(newExam);
      onSaveExam(newExam);
      setActiveTab("soal");
    } catch (err: any) {
      console.error("AI Exam Generation error:", err);
      setAiError(
        err.message ||
          "Terjadi kesalahan saat membuat soal AI. Menampilkan contoh paket soal standar sebagai cadangan."
      );

      // Fallback Mock Exam Package if API encounters error
      const mockQuestions: ExamQuestion[] = [];
      const mockKisi: ExamKisiKisi[] = [];

      for (let i = 1; i <= specs.total; i++) {
        let jenis: "PG" | "ISIAN" | "URAIAN" = "PG";
        let bentukStr: "Pilihan Ganda" | "Isian Pendek" | "Uraian" = "Pilihan Ganda";

        if (i > specs.pg && i <= specs.pg + specs.isian) {
          jenis = "ISIAN";
          bentukStr = "Isian Pendek";
        } else if (i > specs.pg + specs.isian) {
          jenis = "URAIAN";
          bentukStr = "Uraian";
        }

        const tpObj = activeTPs[(i - 1) % activeTPs.length];
        const mat = activeMateri[(i - 1) % activeMateri.length];

        mockKisi.push({
          no: i,
          tpCode: tpObj.code,
          tpDescription: tpObj.desc,
          materiPokok: mat,
          indikatorSoal: `Disajikan masalah seputar ${mat}, siswa dapat menjawab soal nomor ${i} dengan tepat.`,
          bentukSoal: bentukStr,
          nomorSoal: `${i}`,
          tingkatKesulitan: i % 3 === 0 ? "L3 (HOTS)" : i % 2 === 0 ? "L2 (Sedang)" : "L1 (Mudah)",
        });

        if (jenis === "PG") {
          mockQuestions.push({
            no: i,
            jenis: "PG",
            pertanyaan: `Soal Pilihan Ganda No. ${i}: Di bawah ini yang merupakan penerapan dari materi ${mat} adalah...`,
            pilihan: [
              `A. Pilihan jawaban A mengenai ${mat}`,
              `B. Pilihan jawaban B mengenai ${mat}`,
              `C. Pilihan jawaban C mengenai ${mat}`,
              `D. Pilihan jawaban D mengenai ${mat}`,
            ],
            kunciJawaban: "A. Pilihan jawaban A",
          });
        } else if (jenis === "ISIAN") {
          mockQuestions.push({
            no: i,
            jenis: "ISIAN",
            pertanyaan: `Soal Isian No. ${i}: Sebutkan salah satu contoh penting pelaksanaan ${mat} di lingkungan sekitar!`,
            kunciJawaban: `Jawaban isian singkat mengenai ${mat}`,
          });
        } else {
          mockQuestions.push({
            no: i,
            jenis: "URAIAN",
            pertanyaan: `Soal Uraian No. ${i}: Jelaskan secara rinci mengapa materi ${mat} sangat penting diterapkan dalam kehidupan sehari-hari!`,
            kunciJawaban: `Penjelasan uraian terstruktur mengenai manfaat dan penerapan ${mat}`,
          });
        }
      }

      const fallbackExam: ExamPackage = {
        id: `EXAM-${Date.now()}`,
        title: `NASKAH SOAL ${examType} ${selectedSubject}`,
        examType,
        subject: selectedSubject,
        gradeClass: `${schoolIdentity.gradeClass || "Kelas IV"} / ${schoolIdentity.phase || "Fase B"}`,
        materiList: activeMateri,
        selectedTPs: activeTPs,
        timeAllocation,
        examDate,
        kisiKisi: mockKisi,
        questions: mockQuestions,
        createdAt: new Date().toISOString(),
      };

      setCurrentExam(fallbackExam);
      onSaveExam(fallbackExam);
      setActiveTab("soal");
    } finally {
      setIsGenerating(false);
    }
  };

  // Group questions by type for rendering
  const pgQuestions = useMemo(() => {
    return currentExam?.questions.filter((q) => q.jenis === "PG") || [];
  }, [currentExam]);

  const isianQuestions = useMemo(() => {
    return currentExam?.questions.filter((q) => q.jenis === "ISIAN") || [];
  }, [currentExam]);

  const uraianQuestions = useMemo(() => {
    return currentExam?.questions.filter((q) => q.jenis === "URAIAN") || [];
  }, [currentExam]);

  // Handle Print Action
  const handlePrintExam = () => {
    if (!currentExam) return;
    onOpenPrint(
      currentExam.title,
      `Mata Pelajaran: ${currentExam.subject} | ${currentExam.gradeClass}`,
      <div className="space-y-6 text-slate-900 font-sans p-2">
        <KopSurat schoolIdentity={schoolIdentity} />

        <div className="text-center font-bold uppercase space-y-1 my-4 border-b pb-3 border-slate-400">
          <h2 className="text-base sm:text-lg underline tracking-wide">
            {currentExam.title}
          </h2>
          <p className="text-xs text-slate-700">
            TAHUN PELAJARAN {schoolIdentity.academicYear || "2026/2027"} - SEMESTER {schoolIdentity.semester || "GANJIL"}
          </p>
        </div>

        {/* Identity Table Header for Exam Sheet */}
        <table className="w-full text-xs border-collapse border border-slate-400 my-4">
          <tbody>
            <tr>
              <td className="p-2 border border-slate-400 font-bold bg-slate-100 w-1/6">Mata Pelajaran</td>
              <td className="p-2 border border-slate-400 w-2/6">{currentExam.subject}</td>
              <td className="p-2 border border-slate-400 font-bold bg-slate-100 w-1/6">Nama Siswa</td>
              <td className="p-2 border border-slate-400 w-2/6">..............................................</td>
            </tr>
            <tr>
              <td className="p-2 border border-slate-400 font-bold bg-slate-100">Kelas / Fase</td>
              <td className="p-2 border border-slate-400">{currentExam.gradeClass}</td>
              <td className="p-2 border border-slate-400 font-bold bg-slate-100">No. Absen</td>
              <td className="p-2 border border-slate-400">..............................................</td>
            </tr>
            <tr>
              <td className="p-2 border border-slate-400 font-bold bg-slate-100">Hari / Tanggal</td>
              <td className="p-2 border border-slate-400">{currentExam.examDate}</td>
              <td className="p-2 border border-slate-400 font-bold bg-slate-100">Nilai / Paraf Guru</td>
              <td className="p-2 border border-slate-400">
                <div className="h-8 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 italic">
                  [ KOTAK NILAI ]
                </div>
              </td>
            </tr>
            <tr>
              <td className="p-2 border border-slate-400 font-bold bg-slate-100">Alokasi Waktu</td>
              <td className="p-2 border border-slate-400" colSpan={3}>{currentExam.timeAllocation}</td>
            </tr>
          </tbody>
        </table>

        {/* Petunjuk Umum */}
        <div className="p-3 border border-slate-300 bg-slate-50 text-xs rounded space-y-1">
          <p className="font-bold">PETUNJUK UMUM:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-800">
            <li>Berdoalah terlebih dahulu sebelum mulai mengerjakan soal.</li>
            <li>Tuliskan nama dan nomor absen Anda pada kolom identitas yang telah disediakan.</li>
            <li>Bacalah setiap pertanyaan dengan teliti dan cermat.</li>
            <li>Kerjakan terlebih dahulu soal-soal yang Anda anggap lebih mudah.</li>
            <li>Periksalah kembali seluruh lembar jawaban Anda sebelum diserahkan kepada pengawas.</li>
          </ol>
        </div>

        {/* Section A: PG */}
        {pgQuestions.length > 0 && (
          <div className="space-y-3 pt-3">
            <h3 className="font-bold text-xs uppercase bg-slate-200 p-2 border-l-4 border-slate-800">
              I. PILIHAN GANDA (Berilah tanda silang (X) pada huruf A, B, C, atau D di depan jawaban yang paling tepat!)
            </h3>
            <div className="space-y-3 pl-2 text-xs">
              {pgQuestions.map((q) => (
                <div key={q.no} className="space-y-1.5">
                  <p className="font-semibold">{q.no}. {q.pertanyaan}</p>
                  {q.pilihan && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4 font-normal text-slate-800">
                      {q.pilihan.map((pil, idx) => (
                        <div key={idx}>{pil}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section B: ISIAN */}
        {isianQuestions.length > 0 && (
          <div className="space-y-3 pt-3">
            <h3 className="font-bold text-xs uppercase bg-slate-200 p-2 border-l-4 border-slate-800">
              II. ISIAN PENDEK (Isilah titik-titik di bawah ini dengan jawaban yang singkat dan tepat!)
            </h3>
            <div className="space-y-3 pl-2 text-xs">
              {isianQuestions.map((q) => (
                <div key={q.no} className="space-y-1">
                  <p className="font-semibold">{q.no}. {q.pertanyaan}</p>
                  <div className="h-6 border-b border-dotted border-slate-400 my-1"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section C: URAIAN */}
        {uraianQuestions.length > 0 && (
          <div className="space-y-3 pt-3">
            <h3 className="font-bold text-xs uppercase bg-slate-200 p-2 border-l-4 border-slate-800">
              III. URAIAN (Jawablah pertanyaan-pertanyaan di bawah ini dengan jelas, komprehensif, dan tepat!)
            </h3>
            <div className="space-y-4 pl-2 text-xs">
              {uraianQuestions.map((q) => (
                <div key={q.no} className="space-y-1.5">
                  <p className="font-semibold">{q.no}. {q.pertanyaan}</p>
                  <div className="space-y-2 pt-1">
                    <div className="h-4 border-b border-dashed border-slate-300"></div>
                    <div className="h-4 border-b border-dashed border-slate-300"></div>
                    <div className="h-4 border-b border-dashed border-slate-300"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kunci Jawaban Section */}
        <div className="page-break-before pt-6 border-t-2 border-dashed border-slate-400 space-y-3">
          <h3 className="font-bold text-xs sm:text-sm uppercase text-center bg-slate-800 text-white p-2">
            LEMBAR KUNCI JAWABAN & PEDOMAN PENSKORAN
          </h3>
          <table className="w-full border-collapse border border-slate-400 text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold">
                <th className="border border-slate-400 p-2 w-12 text-center">No</th>
                <th className="border border-slate-400 p-2 w-24 text-center">Bentuk</th>
                <th className="border border-slate-400 p-2 text-left">Kunci Jawaban / Pedoman</th>
              </tr>
            </thead>
            <tbody>
              {currentExam.questions.map((q) => (
                <tr key={q.no}>
                  <td className="border border-slate-400 p-1.5 text-center font-bold">{q.no}</td>
                  <td className="border border-slate-400 p-1.5 text-center font-semibold">
                    {q.jenis === "PG" ? "PG" : q.jenis === "ISIAN" ? "Isian" : "Uraian"}
                  </td>
                  <td className="border border-slate-400 p-1.5">{q.kunciJawaban}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-amber-700 via-orange-800 to-slate-900 p-4 sm:p-6 rounded-2xl text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-black rounded-md uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Generasi AI
            </span>
            <span className="text-xs font-bold text-amber-200">
              {schoolIdentity.schoolName}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white">
            Generator Soal & Kisi-Kisi AI (Ulangan Bab / STS / SAS)
          </h1>
          <p className="text-xs text-amber-100/90 max-w-3xl">
            Buat Naskah Soal lengkap dengan Kisi-Kisi, Lembar Kop Sekolah, Pilihan Ganda, Isian Pendek, Uraian, dan Kunci Jawaban otomatis menggunakan Gemini AI sesuai Kurikulum Merdeka.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === "history"
                ? "bg-white text-slate-900 shadow-md font-extrabold"
                : "bg-slate-800/80 hover:bg-slate-800 text-amber-100 border border-amber-500/30"
            }`}
          >
            <ListChecks className="w-4 h-4 text-amber-300" />
            Riwayat Soal ({savedExams.length})
          </button>
        </div>
      </div>

      {/* Main Grid: Left Form Controls | Right Preview / Output Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Input Form */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold text-sm">
              <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Konfigurasi & Parameter Soal</span>
            </div>

            {/* 1. Mata Pelajaran */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>Mata Pelajaran</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedTPCodes([]);
                }}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
              >
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Jenis Evaluasi */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>Jenis Evaluasi Asesmen</span>
                <span className="text-red-500">*</span>
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 focus:ring-2 focus:ring-amber-500"
              >
                <option value="Ulangan Akhir Bab">
                  Ulangan Akhir Bab (10 Soal: 5 PG, 3 Isian, 2 Uraian)
                </option>
                <option value="STS (Sumatif Tengah Semester)">
                  STS (Sumatif Tengah Semester) (35 Soal: 20 PG, 10 Isian, 5 Uraian)
                </option>
                <option value="SAS (Sumatif Akhir Semester)">
                  SAS (Sumatif Akhir Semester) (35 Soal: 20 PG, 10 Isian, 5 Uraian)
                </option>
              </select>
            </div>

            {/* Question Spec Notice Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
              <div className="font-black text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>Aturan Jumlah Soal ({examType}):</span>
                <span className="text-amber-600 dark:text-amber-400 font-mono">
                  Total {getQuestionCountSpec(examType).total} Soal
                </span>
              </div>
              <ul className="grid grid-cols-3 gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-700">
                <li className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-center">
                  <span className="block text-slate-400 text-[10px]">Pilihan Ganda</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {getQuestionCountSpec(examType).pg} Soal
                  </span>
                </li>
                <li className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-center">
                  <span className="block text-slate-400 text-[10px]">Isian Pendek</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {getQuestionCountSpec(examType).isian} Soal
                  </span>
                </li>
                <li className="bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-center">
                  <span className="block text-slate-400 text-[10px]">Uraian/Essay</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">
                    {getQuestionCountSpec(examType).uraian} Soal
                  </span>
                </li>
              </ul>
            </div>

            {/* 3. Materi Pokok (Bisa Lebih Dari 1) */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Materi Pokok (Bisa lebih dari 1)</span>
                <span className="text-[10px] text-amber-600 font-normal">
                  {materiList.length} Materi Ditambahkan
                </span>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={materiInput}
                  onChange={(e) => setMateriInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddMateri())}
                  placeholder="Ketik nama materi pokok lalu tekan Enter..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddMateri}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah
                </button>
              </div>

              {/* Chips List of Materials */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {materiList.map((materi, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-lg"
                  >
                    <span>{materi}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMateri(idx)}
                      className="text-amber-700 hover:text-red-600 dark:text-amber-400 dark:hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {materiList.length === 0 && (
                  <p className="text-[11px] text-slate-400 italic">
                    Belum ada materi ditambahkan. AI akan menggunakan materi standar mata pelajaran.
                  </p>
                )}
              </div>
            </div>

            {/* 4. Dropdown / Checkboxes TP (Bisa Lebih Dari 1) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  Pilih Tujuan Pembelajaran / TP (Bisa lebih dari 1):
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllTPs}
                  className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                >
                  {selectedTPCodes.length === availableTPs.length ? "Batal Pilih Semua" : "Pilih Semua TP"}
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                {availableTPs.map((tp) => {
                  const isChecked = selectedTPCodes.includes(tp.code);
                  return (
                    <label
                      key={tp.code}
                      className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors border ${
                        isChecked
                          ? "bg-amber-100/80 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTP(tp.code)}
                        className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 block text-[10px]">
                          [{tp.code}]
                        </span>
                        <p className="text-[11px] leading-snug">{tp.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Add Custom TP inline */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={customTPInput}
                  onChange={(e) => setCustomTPInput(e.target.value)}
                  placeholder="Atau ketik TP baru jika tidak ada di daftar..."
                  className="flex-1 px-3 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTP}
                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg hover:bg-slate-300"
                >
                  + TP
                </button>
              </div>
            </div>

            {/* 5. Alokasi Waktu & Tanggal Pelaksanaan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Alokasi Waktu
                </label>
                <input
                  type="text"
                  value={timeAllocation}
                  onChange={(e) => setTimeAllocation(e.target.value)}
                  placeholder="e.g. 90 Menit"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  Tanggal Pelaksanaan
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            {/* Submit Generate Button */}
            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="w-full py-3 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-amber-200" />
                  <span>Proses Pembuatan Soal & Kisi-Kisi oleh Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
                  <span>GENERATE SOAL & KISI-KISI SEKARANG</span>
                </>
              )}
            </button>

            {aiError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Output Tabs (Kisi-Kisi vs Cetak Soal vs History) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Output Navigation Header Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("kisi")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === "kisi"
                    ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Table className="w-4 h-4" />
                <span>1. Kisi-Kisi Soal</span>
              </button>

              <button
                onClick={() => setActiveTab("soal")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === "soal"
                    ? "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-xs font-extrabold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>2. Cetak Naskah Soal & Kunci (Berkop)</span>
              </button>
            </div>

            {currentExam && (
              <button
                onClick={handlePrintExam}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / PDF</span>
              </button>
            )}
          </div>

          {/* TAB CONTENT 1: KISI-KISI SOAL */}
          {activeTab === "kisi" && (
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              {!currentExam ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/80 rounded-2xl flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                    <Table className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                    Belum Ada Naskah Soal Digenerate
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Silakan isi materi pokok dan pilih TP di formulir sebelah kiri, lalu klik tombol{" "}
                    <strong>Generate Soal dengan AI</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Export Action Bar */}
                  <ExportActionBar
                    title={`KISI-KISI SOAL ${currentExam.examType.toUpperCase()} ${currentExam.subject.toUpperCase()}`}
                    filename={`Kisi_Kisi_${currentExam.examType.replace(/[^a-zA-Z0-9]/g, "_")}_${currentExam.subject}`}
                    schoolIdentity={schoolIdentity}
                    headers={["No", "Tujuan Pembelajaran (TP)", "Materi Pokok", "Indikator Soal", "Bentuk Soal", "No. Soal", "Tingkat Kesulitan"]}
                    rows={currentExam.kisiKisi.map((k) => [
                      k.no,
                      `[${k.tpCode}] ${k.tpDescription}`,
                      k.materiPokok,
                      k.indikatorSoal,
                      k.bentukSoal,
                      k.nomorSoal,
                      k.tingkatKesulitan,
                    ])}
                    onOpenPrintModal={handlePrintExam}
                    showUpload={false}
                  />

                  {/* Header Box Info */}
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs space-y-1 text-slate-800 dark:text-slate-200">
                    <div className="font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                      KISI-KISI PENULISAN SOAL {currentExam.examType}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 pt-1">
                      <div>Mata Pelajaran: <span className="font-bold text-slate-900 dark:text-slate-100">{currentExam.subject}</span></div>
                      <div>Kelas/Fase: <span className="font-bold text-slate-900 dark:text-slate-100">{currentExam.gradeClass}</span></div>
                      <div>Alokasi Waktu: <span className="font-bold text-slate-900 dark:text-slate-100">{currentExam.timeAllocation}</span></div>
                      <div>Total Soal: <span className="font-bold text-slate-900 dark:text-slate-100">{currentExam.kisiKisi.length} Soal</span></div>
                    </div>
                  </div>

                  {/* Kisi-Kisi Table */}
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-10">No</th>
                          <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 min-w-[180px]">Tujuan Pembelajaran (TP)</th>
                          <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 min-w-[130px]">Materi Pokok</th>
                          <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 min-w-[200px]">Indikator Soal</th>
                          <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-28">Bentuk</th>
                          <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-center w-14">No.</th>
                          <th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center w-24">Tingkat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                        {currentExam.kisiKisi.map((k) => (
                          <tr key={k.no} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center font-bold">{k.no}</td>
                            <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-medium">
                              <span className="font-mono text-amber-700 dark:text-amber-400 font-bold block text-[10px]">{k.tpCode}</span>
                              {k.tpDescription}
                            </td>
                            <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300">{k.materiPokok}</td>
                            <td className="p-2 border-r border-slate-200 dark:border-slate-800 italic">{k.indikatorSoal}</td>
                            <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center font-semibold">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  k.bentukSoal === "Pilihan Ganda"
                                    ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                                    : k.bentukSoal === "Isian Pendek"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                              >
                                {k.bentukSoal}
                              </span>
                            </td>
                            <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center font-mono font-extrabold">{k.nomorSoal}</td>
                            <td className="p-2 text-center text-[10px] font-bold text-slate-600 dark:text-slate-400">{k.tingkatKesulitan}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 2: CETAK NASKAH SOAL BERKOP SEKOLAH */}
          {activeTab === "soal" && (
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              {!currentExam ? (
                <div className="text-center py-16 space-y-3">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/80 rounded-2xl flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">
                    Belum Ada Naskah Soal Digenerate
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Silakan klik tombol <strong>Generate Soal dengan AI</strong> di panel sebelah kiri.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 text-slate-900 dark:text-slate-100">
                  {/* Export Action Bar */}
                  <ExportActionBar
                    title={currentExam.title}
                    filename={currentExam.title.replace(/[^a-zA-Z0-9]/g, "_")}
                    schoolIdentity={schoolIdentity}
                    onOpenPrintModal={handlePrintExam}
                    showUpload={false}
                  />

                  {/* PAPER SIMULATION CONTAINER */}
                  <div className="p-4 sm:p-8 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl shadow-inner space-y-6">
                    {/* Kop Surat Header */}
                    <KopSurat schoolIdentity={schoolIdentity} />

                    {/* Document Title Banner */}
                    <div className="text-center font-bold uppercase space-y-1 border-b pb-3 border-slate-300 dark:border-slate-700">
                      <h2 className="text-sm sm:text-base font-extrabold underline tracking-wide text-slate-900 dark:text-slate-100">
                        {currentExam.title}
                      </h2>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                        TAHUN PELAJARAN {schoolIdentity.academicYear || "2026/2027"} - SEMESTER {schoolIdentity.semester || "GANJIL"}
                      </p>
                    </div>

                    {/* Identity Table Header */}
                    <table className="w-full text-xs border-collapse border border-slate-300 dark:border-slate-700">
                      <tbody>
                        <tr>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-800 w-1/6">Mata Pelajaran</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-semibold w-2/6">{currentExam.subject}</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-800 w-1/6">Nama Siswa</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 w-2/6 text-slate-400 font-mono">..............................................</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-800">Kelas / Fase</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-semibold">{currentExam.gradeClass}</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-800">No. Absen</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 text-slate-400 font-mono">..............................................</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-800">Hari / Tanggal</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-semibold">{currentExam.examDate}</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-800">Nilai / Paraf</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-bold text-slate-400 italic">[ KOTAK NILAI ]</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Petunjuk Umum */}
                    <div className="p-3 border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs rounded-lg space-y-1">
                      <p className="font-extrabold text-slate-800 dark:text-slate-200">PETUNJUK UMUM:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                        <li>Berdoalah terlebih dahulu sebelum mulai mengerjakan soal.</li>
                        <li>Tuliskan nama dan nomor absen Anda pada lembar identitas yang disediakan.</li>
                        <li>Bacalah setiap pertanyaan dengan cermat dan teliti.</li>
                        <li>Kerjakan soal yang Anda anggap lebih mudah terlebih dahulu.</li>
                      </ol>
                    </div>

                    {/* SECTION A: PG */}
                    {pgQuestions.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-bold text-xs uppercase bg-slate-200 dark:bg-slate-800 p-2 border-l-4 border-slate-800 dark:border-slate-200 text-slate-900 dark:text-slate-100">
                          I. PILIHAN GANDA (Berilah tanda silang (X) pada huruf A, B, C, atau D di depan jawaban yang paling tepat!)
                        </h3>
                        <div className="space-y-3 pl-1 text-xs">
                          {pgQuestions.map((q) => (
                            <div key={q.no} className="space-y-1.5">
                              <p className="font-bold text-slate-900 dark:text-slate-100">
                                {q.no}. {q.pertanyaan}
                              </p>
                              {q.pilihan && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-4 font-normal text-slate-800 dark:text-slate-200">
                                  {q.pilihan.map((pil, idx) => (
                                    <div key={idx}>{pil}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECTION B: ISIAN */}
                    {isianQuestions.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h3 className="font-bold text-xs uppercase bg-slate-200 dark:bg-slate-800 p-2 border-l-4 border-slate-800 dark:border-slate-200 text-slate-900 dark:text-slate-100">
                          II. ISIAN PENDEK (Isilah titik-titik di bawah ini dengan jawaban yang singkat dan tepat!)
                        </h3>
                        <div className="space-y-3 pl-1 text-xs">
                          {isianQuestions.map((q) => (
                            <div key={q.no} className="space-y-1">
                              <p className="font-bold text-slate-900 dark:text-slate-100">
                                {q.no}. {q.pertanyaan}
                              </p>
                              <div className="h-5 border-b border-dotted border-slate-400"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECTION C: URAIAN */}
                    {uraianQuestions.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h3 className="font-bold text-xs uppercase bg-slate-200 dark:bg-slate-800 p-2 border-l-4 border-slate-800 dark:border-slate-200 text-slate-900 dark:text-slate-100">
                          III. URAIAN (Jawablah pertanyaan-pertanyaan di bawah ini dengan uraian yang jelas dan tepat!)
                        </h3>
                        <div className="space-y-4 pl-1 text-xs">
                          {uraianQuestions.map((q) => (
                            <div key={q.no} className="space-y-2">
                              <p className="font-bold text-slate-900 dark:text-slate-100">
                                {q.no}. {q.pertanyaan}
                              </p>
                              <div className="space-y-2 pt-1">
                                <div className="h-4 border-b border-dashed border-slate-300 dark:border-slate-700"></div>
                                <div className="h-4 border-b border-dashed border-slate-300 dark:border-slate-700"></div>
                                <div className="h-4 border-b border-dashed border-slate-300 dark:border-slate-700"></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* KUNCI JAWABAN */}
                    <div className="pt-6 border-t-2 border-dashed border-slate-400 space-y-3">
                      <div className="bg-slate-900 text-white font-black text-xs uppercase p-2 text-center rounded">
                        LEMBAR KUNCI JAWABAN & PEDOMAN PENSKORAN
                      </div>
                      <table className="w-full text-xs border-collapse border border-slate-300 dark:border-slate-700">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                            <th className="border border-slate-300 dark:border-slate-700 p-2 text-center w-12">No</th>
                            <th className="border border-slate-300 dark:border-slate-700 p-2 text-center w-28">Bentuk</th>
                            <th className="border border-slate-300 dark:border-slate-700 p-2 text-left">Kunci Jawaban</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentExam.questions.map((q) => (
                            <tr key={q.no}>
                              <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-center font-bold">{q.no}</td>
                              <td className="border border-slate-300 dark:border-slate-700 p-1.5 text-center font-semibold">
                                {q.jenis === "PG" ? "Pilihan Ganda" : q.jenis === "ISIAN" ? "Isian Pendek" : "Uraian"}
                              </td>
                              <td className="border border-slate-300 dark:border-slate-700 p-1.5">{q.kunciJawaban}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT 3: HISTORY OF SAVED EXAMS */}
          {activeTab === "history" && (
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-amber-600" />
                  <span>Daftar Naskah Soal & Kisi-Kisi Tersimpan</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">{savedExams.length} Paket</span>
              </div>

              {savedExams.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">Belum ada paket soal yang tersimpan di memori.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedExams.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] rounded uppercase">
                          {ex.examType}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          {ex.title}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Mapel: {ex.subject} | {ex.gradeClass} | Total: {ex.questions.length} Soal
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCurrentExam(ex);
                            setActiveTab("soal");
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs"
                        >
                          Buka Soal
                        </button>
                        <button
                          onClick={() => onDeleteExam(ex.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950 rounded-lg"
                          title="Hapus Paket Soal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
