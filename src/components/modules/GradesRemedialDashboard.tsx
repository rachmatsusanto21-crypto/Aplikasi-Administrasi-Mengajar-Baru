import React, { useState, useMemo } from "react";
import { Student, CPTPItem, GradeRecord } from "../../types";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  PieChart as PieChartIcon,
  BarChart3,
  Users,
  Award,
  BookOpen,
  Printer,
  Download,
  FileText,
  Search,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";

interface GradesRemedialDashboardProps {
  students: Student[];
  cptpItems: CPTPItem[];
  grades: GradeRecord[];
  subjects: string[];
  kkmValue: number;
  onSetKkmValue?: (val: number) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const GradesRemedialDashboard: React.FC<GradesRemedialDashboardProps> = ({
  students,
  cptpItems,
  grades,
  subjects,
  kkmValue,
  onSetKkmValue,
  onOpenPrint,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || "Bahasa Indonesia");
  const [statusFilter, setStatusFilter] = useState<"all" | "remedial" | "tuntas">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Helper to get grade record for student & subject
  const getGradeRecord = (studentId: string, subject: string): GradeRecord => {
    const existing = grades.find((g) => g.studentId === studentId && g.subject === subject);
    if (existing) return existing;
    return {
      studentId,
      subject,
      tpScores: {},
      midSummative: undefined,
      finalSummative: undefined,
    };
  };

  // Helper to calculate score for a student in a subject
  const calculateScore = (studentId: string, subject: string) => {
    const record = getGradeRecord(studentId, subject);
    const tpScoresMap = record.tpScores || {};
    const entries = Object.entries(tpScoresMap).filter(
      ([_, score]) => typeof score === "number" && !isNaN(score)
    );

    const subjectTPs = cptpItems.filter((item) => item.subject === subject);
    const tpList =
      subjectTPs.length > 0
        ? subjectTPs.map((t) => ({ code: t.codeTP, desc: t.descriptionTP }))
        : [
            { code: "TP-1", desc: "Mengenal dan memahami konsep dasar" },
            { code: "TP-2", desc: "Menganalisis dan mengaplikasikan materi" },
            { code: "TP-3", desc: "Mengevaluasi dan membuat hasil karya" },
          ];

    let tpHighestList: string[] = [];
    let tpLowestList: string[] = [];
    let maxScore = -1;
    let minScore = 101;

    if (entries.length > 0) {
      entries.forEach(([_, score]) => {
        if (score > maxScore) maxScore = score;
        if (score < minScore) minScore = score;
      });

      entries.forEach(([tpCode, score]) => {
        if (score === maxScore) tpHighestList.push(tpCode);
        if (score === minScore) tpLowestList.push(tpCode);
      });
    }

    const tpVals = entries.map(([_, score]) => score);
    const avgTP = tpVals.length > 0 ? tpVals.reduce((a, b) => a + b, 0) / tpVals.length : 0;
    const mid = record.midSummative ?? avgTP;
    const finalS = record.finalSummative ?? avgTP;

    const finalScore = Math.round(avgTP * 0.5 + mid * 0.25 + finalS * 0.25);
    const isTuntas = finalScore >= kkmValue;

    const getTPDesc = (tpCode: string) => {
      const found = tpList.find((t) => t.code === tpCode);
      return found ? `${tpCode} (${found.desc})` : tpCode;
    };

    const lowestDesc = tpLowestList.map(getTPDesc).join(", ") || "TP Dasar";

    return {
      avgTP: Math.round(avgTP),
      mid,
      finalS,
      finalScore,
      isTuntas,
      tpHighest: tpHighestList.join(", ") || "-",
      tpLowest: tpLowestList.join(", ") || "-",
      lowestDesc,
    };
  };

  // Statistics for selected subject
  const subjectStats = useMemo(() => {
    let tuntasCount = 0;
    let remedialCount = 0;
    let totalScore = 0;

    const studentAnalysis = students.map((std) => {
      const sc = calculateScore(std.id, selectedSubject);
      if (sc.isTuntas) {
        tuntasCount++;
      } else {
        remedialCount++;
      }
      totalScore += sc.finalScore;

      return {
        student: std,
        ...sc,
        diff: sc.finalScore - kkmValue,
      };
    });

    const totalStudents = students.length || 1;
    const classAvg = Math.round(totalScore / totalStudents);
    const tuntasPercent = Math.round((tuntasCount / totalStudents) * 100);
    const remedialPercent = Math.round((remedialCount / totalStudents) * 100);

    return {
      totalStudents: students.length,
      tuntasCount,
      remedialCount,
      classAvg,
      tuntasPercent,
      remedialPercent,
      studentAnalysis,
    };
  }, [students, selectedSubject, grades, cptpItems, kkmValue]);

  // Comparative data across all subjects for BarChart / Summary Cards
  const allSubjectsComparison = useMemo(() => {
    return subjects.map((sub) => {
      let tuntas = 0;
      let remedial = 0;
      let totalScore = 0;

      students.forEach((std) => {
        const sc = calculateScore(std.id, sub);
        if (sc.isTuntas) tuntas++;
        else remedial++;
        totalScore += sc.finalScore;
      });

      const total = students.length || 1;
      const tuntasPct = Math.round((tuntas / total) * 100);
      const avg = Math.round(totalScore / total);

      return {
        subject: sub,
        shortSubject: sub.length > 12 ? sub.slice(0, 10) + "..." : sub,
        Tuntas: tuntas,
        Remedial: remedial,
        tuntasPct,
        avg,
      };
    });
  }, [students, subjects, grades, cptpItems, kkmValue]);

  // Pie Chart Data for Selected Subject
  const pieData = [
    { name: "Siswa Tuntas (≥ KKM)", value: subjectStats.tuntasCount, color: "#10b981" },
    { name: "Perlu Remedial (< KKM)", value: subjectStats.remedialCount, color: "#ef4444" },
  ];

  // Filtered Remedial Students List
  const filteredStudents = useMemo(() => {
    return subjectStats.studentAnalysis.filter((item) => {
      const matchSearch = item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.student.nisn && item.student.nisn.includes(searchQuery));
      if (statusFilter === "remedial") return matchSearch && !item.isTuntas;
      if (statusFilter === "tuntas") return matchSearch && item.isTuntas;
      return matchSearch;
    });
  }, [subjectStats, searchQuery, statusFilter]);

  const handleExportCSV = () => {
    const headers = [
      "No",
      "NISN",
      "Nama Siswa",
      "Mata Pelajaran",
      "Nilai Akhir (NA)",
      "KKM",
      "Status Ketuntasan",
      "Selisih KKM",
      "Materi / TP Perlu Remedial",
    ];

    const rows = subjectStats.studentAnalysis.map((item, idx) => [
      idx + 1,
      item.student.nisn || "-",
      item.student.name,
      selectedSubject,
      item.finalScore,
      kkmValue,
      item.isTuntas ? "Tuntas" : "Perlu Remedial",
      item.diff >= 0 ? `+${item.diff}` : `${item.diff}`,
      item.isTuntas ? "-" : item.lowestDesc,
    ]);

    exportToCSV(headers, rows, `Analisis_Remedial_${selectedSubject}`);
  };

  const handleExportDoc = () => {
    const remedialList = subjectStats.studentAnalysis.filter((item) => !item.isTuntas);

    const docHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 11pt;">
        <h3 style="text-align: center; font-size: 14pt; margin-bottom: 5px;">LAPORAN ANALISIS KETUNTASAN & PROGRAM REMEDIAL</h3>
        <p style="text-align: center; margin-top: 0; font-weight: bold;">Mata Pelajaran: ${selectedSubject} | KKM Aktif: ${kkmValue}</p>
        <p style="text-align: center; font-size: 10pt; color: #555;">
          Jumlah Siswa: ${subjectStats.totalStudents} | Tuntas: ${subjectStats.tuntasCount} (${subjectStats.tuntasPercent}%) | Perlu Remedial: ${subjectStats.remedialCount} (${subjectStats.remedialPercent}%)
        </p>
        <hr style="margin: 15px 0; border: 1px solid #000;"/>

        <h4 style="margin-top: 20px; font-size: 12pt; color: #b91c1c;">1. Daftar Siswa Perlu Bimbingan Remedial (${selectedSubject})</h4>
        <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr style="background-color: #fee2e2; text-align: center; font-weight: bold; color: #991b1b;">
              <th style="border: 1px solid #333; padding: 6px; width: 35px;">No</th>
              <th style="border: 1px solid #333; padding: 6px; width: 80px;">NISN</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Nama Siswa</th>
              <th style="border: 1px solid #333; padding: 6px; width: 60px;">Nilai</th>
              <th style="border: 1px solid #333; padding: 6px; width: 60px;">Selisih</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Materi / TP Perlu Perbaikan</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Rencana Intervensi Guru</th>
            </tr>
          </thead>
          <tbody>
            ${
              remedialList.length === 0
                ? `<tr><td colSpan="7" style="text-align: center; padding: 12px; color: #059669;"><b>Selamat! Semua siswa tuntas di atas KKM (${kkmValue}). Tidak ada remedial.</b></td></tr>`
                : remedialList
                    .map(
                      (item, idx) => `
              <tr>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${item.student.nisn || "-"}</td>
                <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${item.student.name}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; color: #dc2626; background-color: #fef2f2;">${item.finalScore}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; color: #dc2626;">${item.diff}</td>
                <td style="border: 1px solid #333; padding: 6px;">${item.lowestDesc}</td>
                <td style="border: 1px solid #333; padding: 6px;">Bimbingan individu & penugasan ulang TP ${item.tpLowest}</td>
              </tr>
            `
                    )
                    .join("")
            }
          </tbody>
        </table>

        <h4 style="margin-top: 25px; font-size: 12pt;">2. Ringkasan Ketuntasan Seluruh Mata Pelajaran</h4>
        <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr style="background-color: #f3f4f6; font-weight: bold; text-align: center;">
              <th style="border: 1px solid #333; padding: 6px;">No</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Mata Pelajaran</th>
              <th style="border: 1px solid #333; padding: 6px;">Rata-Rata Kelas</th>
              <th style="border: 1px solid #333; padding: 6px;">Siswa Tuntas</th>
              <th style="border: 1px solid #333; padding: 6px;">Siswa Remedial</th>
              <th style="border: 1px solid #333; padding: 6px;">Persentase Ketuntasan</th>
            </tr>
          </thead>
          <tbody>
            ${allSubjectsComparison
              .map(
                (sc, idx) => `
              <tr>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${sc.subject}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${sc.avg}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; color: #059669;">${sc.Tuntas} Siswa</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; color: #dc2626;">${sc.Remedial} Siswa</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; background-color: ${sc.tuntasPct >= 80 ? "#ecfdf5" : "#fff1f2"};">${sc.tuntasPct}%</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    exportHtmlToDoc({
      htmlContent: docHtml,
      filename: `Laporan_Analisis_Remedial_${selectedSubject}.doc`,
      title: `LAPORAN KETUNTASAN & PROGRAM REMEDIAL`,
    });
  };

  const handlePrint = () => {
    onOpenPrint(
      `DASHBOARD ANALISIS KETUNTASAN & REMEDIAL - ${selectedSubject.toUpperCase()}`,
      `Berdasarkan KKM: ${kkmValue} | Total Siswa: ${subjectStats.totalStudents}`,
      (
        <div className="space-y-6 text-xs">
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500 block">Rata-Rata Kelas:</span>
              <span className="text-base font-bold text-slate-900">{subjectStats.classAvg}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Tuntas (≥ KKM):</span>
              <span className="text-base font-bold text-emerald-700">
                {subjectStats.tuntasCount} Siswa ({subjectStats.tuntasPercent}%)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Perlu Remedial (&lt; KKM):</span>
              <span className="text-base font-bold text-red-600">
                {subjectStats.remedialCount} Siswa ({subjectStats.remedialPercent}%)
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 uppercase mb-2">Daftar Siswa Perlu Pembimbingan / Remedial</h4>
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-red-50 font-bold text-red-900">
                  <th className="border border-slate-300 p-2 text-center w-8">No</th>
                  <th className="border border-slate-300 p-2 text-left">Nama Siswa</th>
                  <th className="border border-slate-300 p-2 text-center w-16">Nilai Akhir</th>
                  <th className="border border-slate-300 p-2 text-center w-16">Selisih</th>
                  <th className="border border-slate-300 p-2 text-left">Materi / TP Perlu Remedial</th>
                  <th className="border border-slate-300 p-2 text-left">Tindakan Remedial</th>
                </tr>
              </thead>
              <tbody>
                {subjectStats.studentAnalysis
                  .filter((i) => !i.isTuntas)
                  .map((item, idx) => (
                    <tr key={item.student.id} className="odd:bg-white even:bg-slate-50">
                      <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-bold">{item.student.name}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold text-red-600 bg-red-50">{item.finalScore}</td>
                      <td className="border border-slate-300 p-2 text-center font-bold text-red-600">{item.diff}</td>
                      <td className="border border-slate-300 p-2">{item.lowestDesc}</td>
                      <td className="border border-slate-300 p-2">Penugasan ulang TP {item.tpLowest} & bimbingan individual</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Subject Filter Chips & KKM Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Pilih Mapel:</span>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedSubject === sub
                  ? "bg-emerald-600 text-white font-bold shadow-xs scale-102"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-amber-900 font-bold text-xs">
            <span>Batas KKM:</span>
            <input
              type="number"
              value={kkmValue}
              onChange={(e) => onSetKkmValue && onSetKkmValue(parseInt(e.target.value, 10) || 75)}
              className="w-12 p-0.5 border border-amber-300 text-center rounded bg-white text-xs font-extrabold"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5"
            title="Ekspor CSV / Excel"
          >
            <Download className="w-3.5 h-3.5" />
            Excel
          </button>
          <button
            onClick={handleExportDoc}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Simpan Word (.docx)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Simpan Word
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Mata Pelajaran Aktif</p>
            <h4 className="text-base font-extrabold text-slate-900 mt-0.5">{selectedSubject}</h4>
            <p className="text-[11px] text-slate-500 mt-1">KKM Acuan: <span className="font-bold text-amber-700">{kkmValue}</span></p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Persentase Ketuntasan</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-2xl font-extrabold text-emerald-600">{subjectStats.tuntasPercent}%</h4>
              <span className="text-xs text-slate-500 font-semibold">({subjectStats.tuntasCount} Siswa)</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Siswa nilai ≥ {kkmValue}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Siswa Perlu Remedial</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <h4 className="text-2xl font-extrabold text-red-600">{subjectStats.remedialCount}</h4>
              <span className="text-xs text-slate-500 font-semibold">({subjectStats.remedialPercent}%)</span>
            </div>
            <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              Siswa nilai &lt; {kkmValue}
            </p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Rata-Rata Nilai Kelas</p>
            <h4 className="text-2xl font-extrabold text-slate-900 mt-0.5">{subjectStats.classAvg}</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              {subjectStats.classAvg >= kkmValue ? (
                <span className="text-emerald-600 font-bold">Rata-rata melampaui KKM</span>
              ) : (
                <span className="text-amber-600 font-bold">Rata-rata di bawah KKM</span>
              )}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Visuals Grid: Pie Chart & Comparative Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pie Chart Card */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-emerald-600" />
                Diagram Pie Ketuntasan ({selectedSubject})
              </h3>
              <p className="text-xs text-slate-500">
                Proporsi siswa tuntas vs perlu remedial (Batas KKM: {kkmValue})
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {subjectStats.totalStudents === 0 ? (
              <div className="text-xs text-slate-400">Belum ada data siswa.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [
                      `${value} Siswa (${Math.round(
                        (Number(value) / (subjectStats.totalStudents || 1)) * 100
                      )}%)`,
                      "Status",
                    ]}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Siswa Tuntas:
              </span>
              <span className="font-extrabold text-emerald-700">
                {subjectStats.tuntasCount} Siswa ({subjectStats.tuntasPercent}%)
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-700">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                Siswa Perlu Remedial:
              </span>
              <span className="font-extrabold text-red-600">
                {subjectStats.remedialCount} Siswa ({subjectStats.remedialPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Comparative Bar Chart across All Subjects */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Perbandingan Ketuntasan Per Mata Pelajaran
              </h3>
              <p className="text-xs text-slate-500">
                Memudahkan guru mengidentifikasi mata pelajaran dengan jumlah remedial terbanyak
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allSubjectsComparison} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="shortSubject" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} Siswa`, name]}
                  labelFormatter={(label) => `Mapel: ${label}`}
                />
                <Legend verticalAlign="top" align="right" />
                <Bar dataKey="Tuntas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Remedial" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {allSubjectsComparison.slice(0, 4).map((sc) => (
              <div
                key={sc.subject}
                onClick={() => setSelectedSubject(sc.subject)}
                className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                  selectedSubject === sc.subject
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/30"
                }`}
              >
                <div className="font-bold text-slate-800 truncate">{sc.subject}</div>
                <div className="flex justify-between items-center text-[10px] mt-1">
                  <span className="text-emerald-700 font-bold">{sc.tuntasPct}% Tuntas</span>
                  <span className="text-slate-500 font-mono">Avg: {sc.avg}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Remedial Identification & Action Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Identifikasi Siswa Memerlukan Remedial ({selectedSubject})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tabel ini memetakan nilai siswa, selisih KKM, serta Materi/TP terendah untuk intervensi guru
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama / NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border rounded-xl w-48 bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-600"
                }`}
              >
                Semua ({subjectStats.totalStudents})
              </button>
              <button
                onClick={() => setStatusFilter("remedial")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === "remedial" ? "bg-red-600 text-white font-bold" : "text-red-600 hover:bg-red-50"
                }`}
              >
                Perlu Remedial ({subjectStats.remedialCount})
              </button>
              <button
                onClick={() => setStatusFilter("tuntas")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === "tuntas" ? "bg-emerald-600 text-white font-bold" : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                Tuntas ({subjectStats.tuntasCount})
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3 py-3 text-center w-10">No</th>
                <th className="px-3 py-3">Nama Siswa</th>
                <th className="px-3 py-3 text-center w-20">Nilai (NA)</th>
                <th className="px-3 py-3 text-center w-16">KKM</th>
                <th className="px-3 py-3 text-center w-20">Selisih</th>
                <th className="px-3 py-3 text-center w-32">Status Ketuntasan</th>
                <th className="px-3 py-3">Materi / TP Perlu Perbaikan (Remedial)</th>
                <th className="px-3 py-3 text-center">Rekomendasi Intervensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Tidak ditemukan data siswa sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((item, idx) => (
                  <tr key={item.student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">
                      {item.student.name}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        NISN: {item.student.nisn || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-extrabold font-mono text-sm">
                      <span
                        className={
                          item.isTuntas ? "text-emerald-700" : "text-red-600 bg-red-50 px-2 py-0.5 rounded"
                        }
                      >
                        {item.finalScore}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-500">{kkmValue}</td>
                    <td className="px-3 py-3 text-center font-mono font-bold">
                      <span className={item.diff >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {item.diff >= 0 ? `+${item.diff}` : `${item.diff}`}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          item.isTuntas
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800 animate-pulse"
                        }`}
                      >
                        {item.isTuntas ? "✓ TUNTAS" : "⚠ PERLU REMEDIAL"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[11px]">
                      {item.isTuntas ? (
                        <span className="text-slate-400 italic">Pengayaan TP {item.tpHighest}</span>
                      ) : (
                        <span className="font-semibold text-red-900 bg-red-50/60 p-1 rounded border border-red-100 block">
                          📌 {item.lowestDesc}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {item.isTuntas ? (
                        <span className="text-emerald-700 text-[10px] font-bold">Program Pengayaan</span>
                      ) : (
                        <button
                          onClick={() => {
                            console.log(`Program Remedial untuk ${item.student.name}`);
                          }}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg shadow-2xs"
                        >
                          Lihat Program Remedial
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
