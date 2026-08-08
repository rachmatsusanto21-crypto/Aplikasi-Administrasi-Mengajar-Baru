import React, { useState, useMemo } from "react";
import { DailyTeachingLog, CPTPItem, SchoolIdentity, AttendanceRecord, Student } from "../../types";
import { BookOpen, Plus, Trash2, Edit2, Printer, Download, Search, Calendar, FileText, UserCheck, RefreshCw, Check, Layers, CheckSquare, Square } from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";
import { exportTeachingLogsToExcel } from "../../lib/exportExcel";
import { KOKURIKULER_BASE_SUBJECTS } from "../../constants/subjects";

interface DailyTeachingLogViewProps {
  logs: DailyTeachingLog[];
  cptpItems?: CPTPItem[];
  subjects?: string[];
  schoolIdentity?: SchoolIdentity;
  attendanceRecords?: AttendanceRecord[];
  students?: Student[];
  onSaveLogs: (updated: DailyTeachingLog[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const DailyTeachingLogView: React.FC<DailyTeachingLogViewProps> = ({
  logs,
  cptpItems = [],
  subjects = [
    "Bahasa Indonesia",
    "Matematika",
    "IPAS",
    "Pancasila",
    "Seni Budaya",
    "PJOK",
    "Kokurikuler (P5)",
  ],
  schoolIdentity,
  attendanceRecords = [],
  students = [],
  onSaveLogs,
  onOpenPrint,
}) => {
  const [search, setSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Semua");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTpCode, setSelectedTpCode] = useState<string>("");

  // Kokurikuler multi-subject selection state
  const [isKokurikulerMode, setIsKokurikulerMode] = useState<boolean>(false);
  const [selectedKokurikulerSubjects, setSelectedKokurikulerSubjects] = useState<string[]>([
    "Bahasa Indonesia",
    "IPAS",
  ]);
  const [customKokurikulerInput, setCustomKokurikulerInput] = useState<string>("");

  const defaultClassGrade = schoolIdentity
    ? `Kelas ${schoolIdentity.gradeClass} (Fase ${schoolIdentity.phase})`
    : "Kelas IV (Fase B)";

  // Helper to compute attendance summary from Bulk Attendance records for a given date
  const computeAttendanceSummary = (dateStr: string) => {
    if (!students || students.length === 0) {
      return {
        text: "Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0",
        hadir: 0,
        sakit: 0,
        izin: 0,
        alpa: 0,
        total: 0,
        hasBulkData: false,
      };
    }

    const recsOnDate = attendanceRecords.filter((r) => r.date === dateStr);
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    students.forEach((s) => {
      const rec = recsOnDate.find((r) => r.studentId === s.id);
      const status = rec ? rec.status : "H";
      if (status === "H") hadir++;
      else if (status === "S") sakit++;
      else if (status === "I") izin++;
      else if (status === "A") alpa++;
    });

    return {
      text: `Hadir: ${hadir}, Sakit: ${sakit}, Izin: ${izin}, Alpa: ${alpa}`,
      hadir,
      sakit,
      izin,
      alpa,
      total: students.length,
      hasBulkData: recsOnDate.length > 0,
    };
  };

  const initialTodayDate = new Date().toISOString().slice(0, 10);
  const initialTodaySummary = computeAttendanceSummary(initialTodayDate).text;

  const [form, setForm] = useState<Partial<DailyTeachingLog>>({
    date: initialTodayDate,
    subject: subjects[0] || "Bahasa Indonesia",
    classGrade: defaultClassGrade,
    attendanceSummary: initialTodaySummary,
  });

  // Filter available TP items based on chosen subject(s) & class/fase
  const availableTPs = useMemo(() => {
    if (!cptpItems || cptpItems.length === 0) return [];

    if (isKokurikulerMode && selectedKokurikulerSubjects.length > 0) {
      const targets = selectedKokurikulerSubjects.map((s) => s.toLowerCase().trim());
      return cptpItems.filter((item) => {
        const itemSubj = (item.subject || "").toLowerCase().trim();
        return (
          targets.some((t) => itemSubj.includes(t) || t.includes(itemSubj)) ||
          itemSubj.includes("kokurikuler") ||
          itemSubj.includes("p5")
        );
      });
    }

    const currentSubj = (form.subject || "").toLowerCase().trim();
    return cptpItems.filter((item) => {
      const itemSubj = (item.subject || "").toLowerCase().trim();
      return itemSubj === currentSubj || currentSubj.includes(itemSubj);
    });
  }, [cptpItems, form.subject, isKokurikulerMode, selectedKokurikulerSubjects]);

  const currentAttendanceRecap = useMemo(() => {
    return computeAttendanceSummary(form.date || initialTodayDate);
  }, [attendanceRecords, students, form.date]);

  const filteredLogs = logs.filter((l) => {
    let matchSubject = false;
    if (selectedSubject === "Semua") {
      matchSubject = true;
    } else if (
      selectedSubject.toLowerCase().includes("kokurikuler") ||
      selectedSubject.toLowerCase().includes("p5")
    ) {
      matchSubject =
        l.subject.toLowerCase().includes("kokurikuler") ||
        l.subject.toLowerCase().includes("p5");
    } else {
      matchSubject =
        l.subject === selectedSubject ||
        l.subject.toLowerCase().includes(selectedSubject.toLowerCase());
    }

    const s = (search || "").toLowerCase();
    const matchSearch =
      (l.subject || "").toLowerCase().includes(s) ||
      (l.material || "").toLowerCase().includes(s) ||
      (l.tpDescription || "").toLowerCase().includes(s) ||
      (l.notes || "").toLowerCase().includes(s);
    return matchSubject && matchSearch;
  });

  const handleToggleKokurikulerSubject = (sub: string) => {
    let nextList: string[];
    if (selectedKokurikulerSubjects.includes(sub)) {
      nextList = selectedKokurikulerSubjects.filter((s) => s !== sub);
    } else {
      nextList = [...selectedKokurikulerSubjects, sub];
    }
    setSelectedKokurikulerSubjects(nextList);
    const combinedStr =
      nextList.length > 0
        ? `Kokurikuler (${nextList.join(", ")})`
        : "Kokurikuler (P5)";
    setForm((prev) => ({ ...prev, subject: combinedStr }));
  };

  const handleAddCustomKokurikulerSubject = () => {
    const trimmed = customKokurikulerInput.trim();
    if (!trimmed) return;
    if (!selectedKokurikulerSubjects.includes(trimmed)) {
      const nextList = [...selectedKokurikulerSubjects, trimmed];
      setSelectedKokurikulerSubjects(nextList);
      setForm((prev) => ({
        ...prev,
        subject: `Kokurikuler (${nextList.join(", ")})`,
      }));
    }
    setCustomKokurikulerInput("");
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setSelectedTpCode("");
    setIsKokurikulerMode(false);
    setSelectedKokurikulerSubjects(["Bahasa Indonesia", "IPAS"]);
    const today = new Date().toISOString().slice(0, 10);
    const todayRecap = computeAttendanceSummary(today);

    setForm({
      date: today,
      subject: subjects[0] || "Bahasa Indonesia",
      classGrade: defaultClassGrade,
      material: "",
      tpDescription: "",
      attendanceSummary: todayRecap.text,
      notes: "",
      reflection: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (log: DailyTeachingLog) => {
    setEditingId(log.id);
    setSelectedTpCode("");

    const isKoku =
      log.subject.toLowerCase().includes("kokurikuler") ||
      log.subject.toLowerCase().includes("p5");
    setIsKokurikulerMode(isKoku);

    if (isKoku) {
      // Try extracting subjects inside parentheses e.g. Kokurikuler (Bahasa Indonesia, IPAS)
      const match = log.subject.match(/\(([^)]+)\)/);
      if (match && match[1]) {
        const extracted = match[1].split(",").map((s) => s.trim()).filter(Boolean);
        if (extracted.length > 0) {
          setSelectedKokurikulerSubjects(extracted);
        }
      }
    }

    setForm(log);
    setIsModalOpen(true);
  };

  const handleDateChangeInForm = (newDate: string) => {
    const recap = computeAttendanceSummary(newDate);
    setForm((prev) => ({
      ...prev,
      date: newDate,
      attendanceSummary: recap.text,
    }));
  };

  const handleApplyBulkAttendance = () => {
    const recap = computeAttendanceSummary(form.date || initialTodayDate);
    setForm((prev) => ({
      ...prev,
      attendanceSummary: recap.text,
    }));
  };

  const handleDelete = (id: string) => {
    onSaveLogs(logs.filter((l) => l.id !== id));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.material || !form.tpDescription) return;

    let finalSubject = form.subject || subjects[0] || "Bahasa Indonesia";
    if (isKokurikulerMode) {
      if (selectedKokurikulerSubjects.length > 0) {
        finalSubject = `Kokurikuler (${selectedKokurikulerSubjects.join(", ")})`;
      } else {
        finalSubject = "Kokurikuler (P5)";
      }
    }

    if (editingId) {
      onSaveLogs(
        logs.map((l) =>
          l.id === editingId
            ? ({ ...l, ...form, subject: finalSubject } as DailyTeachingLog)
            : l
        )
      );
    } else {
      const newLog: DailyTeachingLog = {
        id: "dtl_" + Date.now(),
        date: form.date || new Date().toISOString().slice(0, 10),
        subject: finalSubject,
        classGrade: form.classGrade || defaultClassGrade,
        material: form.material || "",
        tpDescription: form.tpDescription || "",
        attendanceSummary: form.attendanceSummary || currentAttendanceRecap.text,
        notes: form.notes || "",
        reflection: form.reflection || "",
      };
      onSaveLogs([...logs, newLog]);
    }
    setIsModalOpen(false);
  };

  const handleExportCSV = () => {
    const headers = ["No", "Tanggal", "Mata Pelajaran", "Kelas", "Materi / Topik", "Tujuan Pembelajaran (TP)", "Kehadiran", "Catatan & Kendala", "Refleksi Guru"];
    const rows = filteredLogs.map((l, idx) => [
      idx + 1,
      l.date,
      l.subject,
      l.classGrade,
      l.material,
      l.tpDescription,
      l.attendanceSummary,
      l.notes,
      l.reflection,
    ]);
    exportToCSV(headers, rows, "Jurnal_Mengajar_Harian");
  };

  const handleExportDoc = () => {
    const tableHtml = `
      <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:10pt;">
        <thead>
          <tr style="background-color:#f3f4f6; font-weight:bold;">
            <th style="border:1px solid #333; padding:5px; text-align:center;">No</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">Tanggal</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Mata Pelajaran & Materi</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Tujuan Pembelajaran (TP)</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Kehadiran</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Catatan & Refleksi</th>
          </tr>
        </thead>
        <tbody>
          ${filteredLogs
            .map(
              (l, idx) => `
            <tr>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${idx + 1}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${l.date}</td>
              <td style="border:1px solid #333; padding:5px;"><b>${l.subject}</b><br/>${l.material}</td>
              <td style="border:1px solid #333; padding:5px;">${l.tpDescription}</td>
              <td style="border:1px solid #333; padding:5px;">${l.attendanceSummary}</td>
              <td style="border:1px solid #333; padding:5px;">${l.notes}<br/><i>Refleksi: ${l.reflection}</i></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    exportHtmlToDoc({
      htmlContent: tableHtml,
      filename: "Jurnal_Mengajar_Harian.doc",
      title: "JURNAL MENGAJAR HARIAN GURU KELAS",
    });
  };

  // State for Print Options Dialog
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDateFilterMode, setPrintDateFilterMode] = useState<"ALL" | "SINGLE" | "RANGE">("ALL");
  const [printSingleDate, setPrintSingleDate] = useState<string>(initialTodayDate);
  const [printStartDate, setPrintStartDate] = useState<string>(initialTodayDate);
  const [printEndDate, setPrintEndDate] = useState<string>(initialTodayDate);
  const [printLayoutFormat, setPrintLayoutFormat] = useState<"TABLE" | "SHEET">("SHEET");

  const handleOpenPrintOptions = () => {
    setIsPrintModalOpen(true);
  };

  const handleExecutePrint = () => {
    // Filter logs based on print options
    let targetLogs = [...filteredLogs];

    if (printDateFilterMode === "SINGLE") {
      targetLogs = targetLogs.filter((l) => l.date === printSingleDate);
    } else if (printDateFilterMode === "RANGE") {
      targetLogs = targetLogs.filter((l) => l.date >= printStartDate && l.date <= printEndDate);
    }

    if (targetLogs.length === 0) {
      return;
    }

    // Sort target logs chronologically by date
    targetLogs.sort((a, b) => a.date.localeCompare(b.date));

    // Format date string for Indonesian display
    const formatIndonesianDate = (dStr: string) => {
      try {
        const parts = dStr.split("-").map(Number);
        if (parts.length === 3) {
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        }
      } catch (e) {
        // fallback
      }
      return dStr;
    };

    setIsPrintModalOpen(false);

    if (printLayoutFormat === "SHEET") {
      // 1 Page per Date sheet format
      onOpenPrint(
        "JURNAL MENGAJAR HARIAN GURU KELAS",
        `Dokumen Harian (${targetLogs.length} Halaman)`,
        (
          <div className="space-y-8">
            {targetLogs.map((l, idx) => (
              <div key={l.id} className={`space-y-4 p-2 ${idx < targetLogs.length - 1 ? "page-break-after border-b border-slate-300 pb-8" : ""}`}>
                <div className="border-b-2 border-slate-900 pb-2 text-center">
                  <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-900">
                    JURNAL MENGAJAR HARIAN GURU
                  </h3>
                  <p className="text-xs text-slate-700 font-semibold mt-1">
                    Hari / Tanggal: <span className="font-mono underline">{formatIndonesianDate(l.date)}</span> | Satuan Pendidikan: {schoolIdentity?.schoolName || "-"}
                  </p>
                </div>

                <table className="w-full border-collapse border border-slate-400 text-xs">
                  <tbody>
                    <tr>
                      <td className="border border-slate-400 p-2.5 font-bold w-40 bg-slate-100 text-slate-900">Mata Pelajaran</td>
                      <td className="border border-slate-400 p-2.5 font-extrabold text-emerald-900 text-sm">{l.subject}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2.5 font-bold bg-slate-100 text-slate-900">Kelas / Fase</td>
                      <td className="border border-slate-400 p-2.5 font-semibold text-slate-800">{l.classGrade}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2.5 font-bold bg-slate-100 text-slate-900">Materi / Sub-Materi Pokok</td>
                      <td className="border border-slate-400 p-2.5 font-bold text-slate-900">{l.material}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2.5 font-bold bg-slate-100 text-slate-900">Tujuan Pembelajaran (TP)</td>
                      <td className="border border-slate-400 p-2.5 leading-relaxed text-slate-800">{l.tpDescription}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2.5 font-bold bg-slate-100 text-slate-900">Ringkasan Kehadiran Murid</td>
                      <td className="border border-slate-400 p-2.5 font-mono font-semibold text-slate-800">{l.attendanceSummary}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2.5 font-bold bg-slate-100 text-slate-900">Catatan Kegiatan & Kendala</td>
                      <td className="border border-slate-400 p-2.5 text-slate-800">{l.notes || "-"}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-400 p-2.5 font-bold bg-slate-100 text-slate-900">Refleksi Guru (Perbaikan)</td>
                      <td className="border border-slate-400 p-2.5 italic text-emerald-800 font-medium">{l.reflection || "-"}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Signature aligned to the exact log date */}
                <div className="pt-8 grid grid-cols-2 text-xs text-center text-slate-900 leading-normal break-inside-avoid">
                  <div>
                    <p>Mengetahui,</p>
                    <p className="font-bold mb-14">Kepala {schoolIdentity?.schoolName || "Sekolah"}</p>
                    <p className="font-bold underline uppercase">{schoolIdentity?.headmasterName || "..................................."}</p>
                    <p>NIP. {schoolIdentity?.headmasterNip || "..................................."}</p>
                  </div>
                  <div>
                    <p>
                      {schoolIdentity?.regency || schoolIdentity?.district || "Kota"},{" "}
                      <span className="font-semibold">{formatIndonesianDate(l.date)}</span>
                    </p>
                    <p className="font-bold mb-14">Guru Kelas / Mata Pelajaran</p>
                    <p className="font-bold underline uppercase">{schoolIdentity?.teacherName || "..................................."}</p>
                    <p>NIP. {schoolIdentity?.teacherNip || schoolIdentity?.nip || "..................................."}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      );
    } else {
      // Summary table format
      onOpenPrint(
        "REKAPITULASI JURNAL MENGAJAR HARIAN",
        `Periode Cetak: ${printDateFilterMode === "SINGLE" ? printSingleDate : printDateFilterMode === "RANGE" ? `${printStartDate} s.d. ${printEndDate}` : "Keseluruhan"}`,
        (
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <th className="border border-slate-300 p-2 w-8 text-center">No</th>
                <th className="border border-slate-300 p-2 text-center w-24">Tanggal</th>
                <th className="border border-slate-300 p-2 text-left w-28">Materi & Mapel</th>
                <th className="border border-slate-300 p-2 text-left">Tujuan Pembelajaran (TP)</th>
                <th className="border border-slate-300 p-2 text-left w-32">Ringkasan Kehadiran</th>
                <th className="border border-slate-300 p-2 text-left">Catatan & Refleksi Guru</th>
              </tr>
            </thead>
            <tbody>
              {targetLogs.map((l, idx) => (
                <tr key={l.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono font-bold">{l.date}</td>
                  <td className="border border-slate-300 p-2">
                    <span className="font-bold text-slate-900 block">{l.subject}</span>
                    <span className="text-[10px] text-slate-500 block">{l.material}</span>
                  </td>
                  <td className="border border-slate-300 p-2">{l.tpDescription}</td>
                  <td className="border border-slate-300 p-2 text-slate-700 font-mono text-[10px]">{l.attendanceSummary}</td>
                  <td className="border border-slate-300 p-2">
                    <p className="font-medium text-slate-800">{l.notes}</p>
                    <p className="italic text-emerald-800 text-[10px] mt-0.5">Refleksi: {l.reflection}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Jurnal Mengajar Harian Guru
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan realisasi pelaksanaan pembelajaran harian, ketercapaian TP, dan refleksi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Jurnal Harian
          </button>
          <button
            onClick={() => exportTeachingLogsToExcel(logs, schoolIdentity)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            title="Ekspor ke Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-100" />
            Ekspor Excel (.xlsx)
          </button>
          <button
            onClick={handleExportDoc}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Simpan dalam bentuk Word (.docx / .doc)"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Simpan Word (.docx)
          </button>
          <button
            onClick={handleOpenPrintOptions}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            title="Cetak Laporan / PDF dengan Pilihan Tanggal & Layout"
          >
            <Printer className="w-4 h-4" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          <button
            onClick={() => setSelectedSubject("Semua")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedSubject === "Semua"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Semua Mapel
          </button>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSubject === sub
                  ? "bg-emerald-600 text-white font-bold shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari materi / refleksi..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Log Cards List */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-400 text-xs rounded-2xl border border-slate-200">
            Belum ada jurnal mengajar harian. Klik tombol <b>Tambah Jurnal Harian</b> di atas!
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-3">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                    {log.subject}
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-500">
                    {log.date}
                  </span>
                  <span className="text-xs text-slate-400">• {log.classGrade}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(log)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Materi & Tujuan Pembelajaran (TP)
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{log.material}</p>
                  <p className="text-slate-600 leading-relaxed">{log.tpDescription}</p>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded font-bold inline-block">
                    {log.attendanceSummary}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 block">Catatan Kegiatan & Kendala:</span>
                    <p className="text-slate-600">{log.notes || "-"}</p>
                  </div>
                  <div>
                    <span className="font-bold text-emerald-900 block">Refleksi Guru:</span>
                    <p className="text-emerald-800 italic">{log.reflection || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900">
              {editingId ? "Edit Jurnal Mengajar Harian" : "Tambah Jurnal Mengajar Harian Baru"}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-3.5 text-xs">
              {/* Type Category Selector: Single Subject vs Kokurikuler Multi-Subject */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs">
                    Kategori & Jenis Pembelajaran
                  </label>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {isKokurikulerMode ? "Mode Multi-Mapel Kokurikuler / P5" : "Mode Single Mapel Intrakurikuler"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsKokurikulerMode(false);
                      const defaultSub = subjects[0] || "Bahasa Indonesia";
                      setForm((prev) => ({ ...prev, subject: defaultSub }));
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      !isKokurikulerMode
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Intrakurikuler (1 Mapel)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsKokurikulerMode(true);
                      const initialList = selectedKokurikulerSubjects.length > 0 ? selectedKokurikulerSubjects : ["Bahasa Indonesia", "IPAS"];
                      setSelectedKokurikulerSubjects(initialList);
                      setForm((prev) => ({
                        ...prev,
                        subject: `Kokurikuler (${initialList.join(", ")})`,
                      }));
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                      isKokurikulerMode
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Kokurikuler (Multi-Mapel)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={form.date || ""}
                    onChange={(e) => handleDateChangeInForm(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                {!isKokurikulerMode ? (
                  <div>
                    <label className="block font-semibold mb-1">Mata Pelajaran</label>
                    <select
                      value={form.subject || subjects[0] || "Bahasa Indonesia"}
                      onChange={(e) => {
                        const newSubj = e.target.value;
                        setForm((prev) => ({ ...prev, subject: newSubj }));
                        setSelectedTpCode("");
                      }}
                      className="w-full p-2 border rounded-lg bg-white font-semibold focus:ring-2 focus:ring-emerald-500"
                    >
                      {subjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold mb-1">Identifikasi Jurnal</label>
                    <input
                      type="text"
                      readOnly
                      value={
                        selectedKokurikulerSubjects.length > 0
                          ? `Kokurikuler (${selectedKokurikulerSubjects.join(", ")})`
                          : "Kokurikuler (P5)"
                      }
                      className="w-full p-2 border rounded-lg bg-indigo-50/70 text-indigo-900 font-bold text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Multi-subject selector box for Kokurikuler */}
              {isKokurikulerMode && (
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Pilih Mata Pelajaran Terintegrasi Kokurikuler
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-200 text-indigo-900 rounded-md">
                      {selectedKokurikulerSubjects.length} Mapel Terpilih
                    </span>
                  </div>

                  <p className="text-[11px] text-indigo-800">
                    Sistem mendukung pemilihan <b>lebih dari 1 mata pelajaran</b> untuk pembelajaran berbasis proyek, P5, atau integrasi lintas mapel.
                  </p>

                  <div className="flex flex-wrap gap-1.5 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        const mainSubs = ["Bahasa Indonesia", "Matematika", "IPAS", "Pendidikan Pancasila"];
                        setSelectedKokurikulerSubjects(mainSubs);
                        setForm((prev) => ({
                          ...prev,
                          subject: `Kokurikuler (${mainSubs.join(", ")})`,
                        }));
                      }}
                      className="px-2 py-1 bg-white border border-indigo-300 text-indigo-800 hover:bg-indigo-100 rounded-lg text-[10px] font-bold"
                    >
                      + Mapel Utama (B.Indo, Math, IPAS, Pancasila)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedKokurikulerSubjects([...KOKURIKULER_BASE_SUBJECTS]);
                        setForm((prev) => ({
                          ...prev,
                          subject: `Kokurikuler (${KOKURIKULER_BASE_SUBJECTS.join(", ")})`,
                        }));
                      }}
                      className="px-2 py-1 bg-white border border-indigo-300 text-indigo-800 hover:bg-indigo-100 rounded-lg text-[10px] font-bold"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedKokurikulerSubjects([]);
                        setForm((prev) => ({ ...prev, subject: "Kokurikuler (P5)" }));
                      }}
                      className="px-2 py-1 bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 rounded-lg text-[10px] font-medium"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Grid Checkboxes */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-2 bg-white rounded-xl border border-indigo-200">
                    {KOKURIKULER_BASE_SUBJECTS.map((sub) => {
                      const isSelected = selectedKokurikulerSubjects.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => handleToggleKokurikulerSubject(sub)}
                          className={`p-1.5 rounded-lg text-[11px] text-left font-medium flex items-center gap-1.5 transition-all border ${
                            isSelected
                              ? "bg-indigo-100 text-indigo-950 border-indigo-400 font-bold"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span className="truncate">{sub}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Subject Adder */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={customKokurikulerInput}
                      onChange={(e) => setCustomKokurikulerInput(e.target.value)}
                      placeholder="Tambah mapel/tema kokurikuler lain..."
                      className="flex-1 p-1.5 text-xs border border-indigo-300 rounded-lg bg-white"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomKokurikulerSubject();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomKokurikulerSubject}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-2xs"
                    >
                      + Tambah
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold">Kelas / Fase</label>
                    {schoolIdentity && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Identitas Sekolah
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={form.classGrade || defaultClassGrade}
                    onChange={(e) => setForm((prev) => ({ ...prev, classGrade: e.target.value }))}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold">Ringkasan Kehadiran</label>
                    <button
                      type="button"
                      onClick={handleApplyBulkAttendance}
                      className="text-[10px] text-emerald-800 font-bold hover:underline flex items-center gap-0.5"
                      title="Ambil rekap terbaru dari Absensi Bulk"
                    >
                      <RefreshCw className="w-3 h-3 text-emerald-600" />
                      Sync Absen
                    </button>
                  </div>
                  <input
                    type="text"
                    value={form.attendanceSummary || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, attendanceSummary: e.target.value }))}
                    placeholder="Contoh: Hadir: 26, Sakit: 1, Izin: 0, Alpa: 0"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* Attendance Bulk Recap Auto-Banner */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">
                      Rekap Absensi Bulk ({form.date}):
                    </span>
                    <span className="text-slate-600 font-mono">
                      Hadir: <b>{currentAttendanceRecap.hadir}</b>, Sakit: <b>{currentAttendanceRecap.sakit}</b>, Izin: <b>{currentAttendanceRecap.izin}</b>, Alpa: <b>{currentAttendanceRecap.alpa}</b> ({currentAttendanceRecap.total} murid)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyBulkAttendance}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <Check className="w-3 h-3" />
                  Gunakan Rekap
                </button>
              </div>

              {/* Dropdown Tujuan Pembelajaran (TP) */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-700" />
                    Pilih Tujuan Pembelajaran (TP)
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200/80 text-emerald-950 rounded-md">
                    {form.subject} • {availableTPs.length} TP Tersedia
                  </span>
                </div>

                <select
                  value={selectedTpCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setSelectedTpCode(code);
                    if (code) {
                      const found = availableTPs.find((t) => t.codeTP === code);
                      if (found) {
                        setForm((prev) => ({
                          ...prev,
                          tpDescription: `[${found.codeTP}] ${found.descriptionTP}`,
                          material: prev.material || found.element || found.descriptionCP || "",
                        }));
                      }
                    }
                  }}
                  className="w-full p-2 border border-emerald-300 rounded-lg bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 text-xs shadow-2xs"
                >
                  <option value="">-- Dropdown Pilih TP dari Kurikulum / CP-TP --</option>
                  {availableTPs.map((tp) => (
                    <option key={tp.id} value={tp.codeTP}>
                      [{tp.codeTP}] {tp.descriptionTP} ({tp.element || tp.targetClass || "CP-TP"})
                    </option>
                  ))}
                </select>

                {availableTPs.length === 0 && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    💡 Belum ada data TP khusus untuk mata pelajaran <b>{form.subject}</b> pada Kurikulum / CP-TP. Anda tetap dapat mengetik deskripsi TP secara manual di bawah ini.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold mb-1">Materi / Sub-Materi Pokok</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Menyimak Cerita Rakyat & Amanat"
                  value={form.material || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, material: e.target.value }))}
                  className="w-full p-2 border rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Deskripsi Tujuan Pembelajaran (TP)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Deskripsi TP yang diajarkan (otomatis terisi dari dropdown atau dapat diketik manual)..."
                  value={form.tpDescription || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, tpDescription: e.target.value }))}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Catatan Kegiatan & Kendala Pembelajaran</label>
                <textarea
                  rows={2}
                  placeholder="Proses belajar, respon murid, atau kendala..."
                  value={form.notes || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Refleksi Guru (Perbaikan Selanjutnya)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tindak lanjut perbaikan pengajaran..."
                  value={form.reflection || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, reflection: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg"
                >
                  Simpan Jurnal Mengajar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Print Options */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              Opsi Cetak Jurnal Mengajar Harian
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700">Pilih Periode / Tanggal Cetak:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintDateFilterMode("ALL")}
                    className={`py-2 px-1 text-center rounded-lg font-bold border transition-all ${
                      printDateFilterMode === "ALL"
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Keseluruhan
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintDateFilterMode("SINGLE")}
                    className={`py-2 px-1 text-center rounded-lg font-bold border transition-all ${
                      printDateFilterMode === "SINGLE"
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Tanggal Tertentu
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintDateFilterMode("RANGE")}
                    className={`py-2 px-1 text-center rounded-lg font-bold border transition-all ${
                      printDateFilterMode === "RANGE"
                        ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Rentang Tanggal
                  </button>
                </div>
              </div>

              {printDateFilterMode === "SINGLE" && (
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Pilih Tanggal Penulisan Jurnal:</label>
                  <input
                    type="date"
                    value={printSingleDate}
                    onChange={(e) => setPrintSingleDate(e.target.value)}
                    className="w-full p-2 border rounded-lg font-mono font-bold"
                  />
                </div>
              )}

              {printDateFilterMode === "RANGE" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700">Mulai Tanggal:</label>
                    <input
                      type="date"
                      value={printStartDate}
                      onChange={(e) => setPrintStartDate(e.target.value)}
                      className="w-full p-2 border rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700">Sampai Tanggal:</label>
                    <input
                      type="date"
                      value={printEndDate}
                      onChange={(e) => setPrintEndDate(e.target.value)}
                      className="w-full p-2 border rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200">
                <label className="block font-bold mb-1 text-slate-700">Format Tampilan Dokumen Cetak:</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100">
                    <input
                      type="radio"
                      name="printFormat"
                      checked={printLayoutFormat === "SHEET"}
                      onChange={() => setPrintLayoutFormat("SHEET")}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Dokumen Harian (1 Halaman Per Tanggal)</span>
                      <span className="text-[11px] text-slate-500 block">
                        Cetak format lembaran resmi dengan tanggal tanda tangan yang otomatis menyesuaikan tanggal jurnal harian.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100">
                    <input
                      type="radio"
                      name="printFormat"
                      checked={printLayoutFormat === "TABLE"}
                      onChange={() => setPrintLayoutFormat("TABLE")}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">Tabel Rekapitulasi Ringkasan</span>
                      <span className="text-[11px] text-slate-500 block">
                        Tampilan matriks tabel rekap ringkas seluruh jurnal dalam 1 daftar.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecutePrint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Buka Pratinjau Cetak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
