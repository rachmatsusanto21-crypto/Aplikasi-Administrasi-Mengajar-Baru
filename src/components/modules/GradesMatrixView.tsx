import React, { useState } from "react";
import { Student, CPTPItem, GradeRecord, DailyGradeEntry, GradeAssessmentType } from "../../types";
import { GraduationCap, Save, Printer, Download, Calculator, Check, Sparkles, Filter, FileText, Plus, Calendar, BookOpen, PieChart as PieChartIcon, AlertTriangle, Edit2, Trash2 } from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";
import { exportGradesToExcel } from "../../lib/exportExcel";
import { GradesRemedialDashboard } from "./GradesRemedialDashboard";

interface GradesMatrixViewProps {
  students: Student[];
  cptpItems: CPTPItem[];
  grades: GradeRecord[];
  dailyGrades?: DailyGradeEntry[];
  subjects?: string[];
  onAddSubject?: (sub: string) => void;
  onSaveGrades: (updatedGrades: GradeRecord[]) => void;
  onSaveDailyGrades?: (updatedDaily: DailyGradeEntry[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const GradesMatrixView: React.FC<GradesMatrixViewProps> = ({
  students,
  cptpItems,
  grades,
  dailyGrades = [],
  subjects = [
    "Bahasa Indonesia",
    "Matematika",
    "IPAS",
    "Pancasila",
    "Seni Budaya",
    "PJOK",
    "Bahasa Jawa",
    "Koding & Kecerdasan Artifisial",
    "Kokurikuler (P5)",
    "Kokurikuler",
  ],
  onAddSubject,
  onSaveGrades,
  onSaveDailyGrades,
  onOpenPrint,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || "Bahasa Indonesia");
  const [activeTab, setActiveTab] = useState<"remedial_dashboard" | "rekap" | "daily_input" | "matrix_input">("remedial_dashboard");
  const [kkmValue, setKkmValue] = useState<number>(75);
  const [savedAlert, setSavedAlert] = useState(false);

  // Daily grade input modal states
  const [editingDailyGroupKey, setEditingDailyGroupKey] = useState<string | null>(null);
  const [dailyForm, setDailyForm] = useState<{
    date: string;
    tpCode: string;
    assessmentType: GradeAssessmentType;
    scores: Record<string, number>;
  }>({
    date: new Date().toISOString().slice(0, 10),
    tpCode: "",
    assessmentType: "Formatif TP",
    scores: {},
  });
  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);

  // Relevant TPs for selected subject
  const subjectTPs = cptpItems.filter((item) => {
    if (item.subject === selectedSubject) return true;
    const selNorm = selectedSubject.toLowerCase();
    const itemNorm = (item.subject || "").toLowerCase();
    if ((selNorm.includes("kokurikuler") || selNorm.includes("p5")) && (itemNorm.includes("kokurikuler") || itemNorm.includes("p5"))) {
      return true;
    }
    return false;
  });
  const tpList = subjectTPs.length > 0
    ? subjectTPs.map((t) => ({ code: t.codeTP, desc: t.descriptionTP }))
    : [
        { code: "TP-1", desc: "Mengenal dan memahami konsep dasar" },
        { code: "TP-2", desc: "Menganalisis dan mengaplikasikan materi" },
        { code: "TP-3", desc: "Mengevaluasi dan membuat hasil karya" },
      ];

  // Helper to get grade record
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

  const handleScoreChange = (
    studentId: string,
    field: "tp" | "mid" | "final",
    tpCode: string | null,
    val: number
  ) => {
    const numVal = Math.min(100, Math.max(0, val || 0));
    const current = getGradeRecord(studentId, selectedSubject);

    let updatedRecord: GradeRecord;
    if (field === "tp" && tpCode) {
      updatedRecord = {
        ...current,
        tpScores: { ...current.tpScores, [tpCode]: numVal },
      };
    } else if (field === "mid") {
      updatedRecord = { ...current, midSummative: numVal };
    } else {
      updatedRecord = { ...current, finalSummative: numVal };
    }

    const otherGrades = grades.filter(
      (g) => !(g.studentId === studentId && g.subject === selectedSubject)
    );
    onSaveGrades([...otherGrades, updatedRecord]);
  };

  // Helper to calculate student statistics & competency descriptions
  const calculateStudentStats = (student: Student) => {
    const record = getGradeRecord(student.id, selectedSubject);
    const tpScoresMap = record.tpScores || {};
    const entries = Object.entries(tpScoresMap).filter(([_, score]) => typeof score === "number" && !isNaN(score));

    let tpHighestList: string[] = [];
    let tpLowestList: string[] = [];
    let maxScore = -1;
    let minScore = 101;

    if (entries.length > 0) {
      entries.forEach(([tpCode, score]) => {
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

    // Grading Scale: A (90-100), B (80-89), C (75-79), D (<75)
    let predicate = "D";
    let predicateLabel = "Kurang";
    if (finalScore >= 90) {
      predicate = "A";
      predicateLabel = "Sangat Baik";
    } else if (finalScore >= 80) {
      predicate = "B";
      predicateLabel = "Baik";
    } else if (finalScore >= 75) {
      predicate = "C";
      predicateLabel = "Cukup";
    }

    // Generate Competency Description based on User Template
    // "Ananda (nama) sudah menunjukkan penguasaan yang (sangat baik/baik/cukup baik) dalam (deskripsi TP di atas KKM), dan perlu bimbingan dalam (deskripsi TP di bawah KKM)."
    const getTPDesc = (tpCode: string) => {
      const found = tpList.find((t) => t.code === tpCode);
      return found ? `${tpCode} (${found.desc})` : tpCode;
    };

    const highDescs = tpHighestList.map(getTPDesc).join(", ");
    const lowDescs = tpLowestList.map(getTPDesc).join(", ");

    let competencyDescription = "";
    if (entries.length === 0) {
      competencyDescription = `Ananda ${student.name} belum memiliki catatan nilai TP formatif pada mata pelajaran ${selectedSubject}.`;
    } else if (maxScore >= kkmValue && minScore >= kkmValue) {
      competencyDescription = `Ananda ${student.name} sudah menunjukkan penguasaan yang ${predicateLabel.toLowerCase()} dalam ${highDescs}. Secara umum telah mencapai KKM (${kkmValue}).`;
    } else if (maxScore >= kkmValue && minScore < kkmValue) {
      competencyDescription = `Ananda ${student.name} sudah menunjukkan penguasaan yang ${predicateLabel.toLowerCase()} dalam ${highDescs}, dan perlu bimbingan dalam ${lowDescs}.`;
    } else {
      competencyDescription = `Ananda ${student.name} masih memerlukan bimbingan dan intervensi khusus dalam ${lowDescs} untuk mencapai KKM (${kkmValue}).`;
    }

    return {
      record,
      avgTP: Math.round(avgTP),
      mid,
      finalS,
      finalScore,
      predicate,
      predicateLabel,
      tpHighest: tpHighestList.join(", ") || "-",
      tpLowest: tpLowestList.join(", ") || "-",
      competencyDescription,
    };
  };

  const handleOpenNewDailyModal = () => {
    setEditingDailyGroupKey(null);
    setDailyForm({
      date: new Date().toISOString().slice(0, 10),
      tpCode: "",
      assessmentType: "Formatif TP",
      scores: {},
    });
    setIsDailyModalOpen(true);
  };

  const handleOpenEditDailyGroup = (tpCode: string, dateStr: string, type: string) => {
    const groupItems = dailyGrades.filter(
      (g) =>
        g.subject === selectedSubject &&
        g.tpCode === tpCode &&
        (g.formattedDate === dateStr || g.date === dateStr) &&
        g.assessmentType === type
    );

    const scores: Record<string, number> = {};
    groupItems.forEach((g) => {
      scores[g.studentId] = g.score;
    });

    const rawDate = groupItems[0]?.date || new Date().toISOString().slice(0, 10);

    setEditingDailyGroupKey(`${tpCode}_${dateStr}_${type}`);
    setDailyForm({
      date: rawDate,
      tpCode: tpCode,
      assessmentType: type as GradeAssessmentType,
      scores,
    });
    setIsDailyModalOpen(true);
  };

  const handleDeleteDailyGroup = (tpCode: string, dateStr: string, type: string) => {
    const updatedDaily = dailyGrades.filter(
        (g) =>
          !(
            g.subject === selectedSubject &&
            g.tpCode === tpCode &&
            (g.formattedDate === dateStr || g.date === dateStr) &&
            g.assessmentType === type
          )
      );

      if (onSaveDailyGrades) {
        onSaveDailyGrades(updatedDaily);
      }

      setSavedAlert(true);
      setTimeout(() => setSavedAlert(false), 3000);
  };

  // Handle saving Daily Grades Entry
  const handleSaveDailyForm = () => {
    if (!dailyForm.tpCode) return;

    // Convert date string YYYY-MM-DD to dd/m format
    const dateObj = new Date(dailyForm.date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const formattedDate = isNaN(day) || isNaN(month) ? dailyForm.date : `${day}/${month}`;

    const tpInfo = tpList.find((t) => t.code === dailyForm.tpCode);
    const tpDesc = tpInfo ? tpInfo.desc : "";

    const newEntries: DailyGradeEntry[] = students.map((std) => ({
      id: "dg_" + Date.now() + "_" + std.id,
      studentId: std.id,
      subject: selectedSubject,
      tpCode: dailyForm.tpCode,
      tpDescription: tpDesc,
      assessmentType: dailyForm.assessmentType,
      score: dailyForm.scores[std.id] ?? 0,
      date: dailyForm.date,
      formattedDate,
    }));

    if (onSaveDailyGrades) {
      if (editingDailyGroupKey) {
        const [oldTp, oldDate, oldType] = editingDailyGroupKey.split("_");
        const filtered = dailyGrades.filter(
          (g) =>
            !(
              g.subject === selectedSubject &&
              g.tpCode === oldTp &&
              (g.formattedDate === oldDate || g.date === oldDate) &&
              g.assessmentType === oldType
            )
        );
        onSaveDailyGrades([...filtered, ...newEntries]);
      } else {
        onSaveDailyGrades([...dailyGrades, ...newEntries]);
      }
    }

    // Also update main TP grade records for instant sync across all students!
    let updatedGrades = [...grades];
    students.forEach((std) => {
      const userVal = dailyForm.scores[std.id];
      if (userVal !== undefined) {
        const numVal = Math.min(100, Math.max(0, userVal || 0));
        const existingIdx = updatedGrades.findIndex(
          (g) => g.studentId === std.id && g.subject === selectedSubject
        );

        if (existingIdx >= 0) {
          const existing = updatedGrades[existingIdx];
          updatedGrades[existingIdx] = {
            ...existing,
            tpScores: { ...existing.tpScores, [dailyForm.tpCode]: numVal },
          };
        } else {
          updatedGrades.push({
            studentId: std.id,
            subject: selectedSubject,
            tpScores: { [dailyForm.tpCode]: numVal },
          });
        }
      }
    });

    onSaveGrades(updatedGrades);

    setIsDailyModalOpen(false);
    setEditingDailyGroupKey(null);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  const handleExportCSV = () => {
    const headers = [
      "No",
      "NISN",
      "Nama Siswa",
      ...tpList.map((t) => t.code),
      "Rata Formatif (TP)",
      "TP Tertinggi",
      "TP Terendah",
      "STS / UTS",
      "SAS / UAS",
      "NA Raport",
      "KKM",
      "Predikat",
      "Deskripsi Capaian Kompetensi",
    ];

    const rows = students.map((s, idx) => {
      const stats = calculateStudentStats(s);
      return [
        idx + 1,
        s.nisn || "-",
        s.name,
        ...tpList.map((t) => stats.record.tpScores[t.code] ?? "-"),
        stats.avgTP,
        stats.tpHighest,
        stats.tpLowest,
        stats.mid,
        stats.finalS,
        stats.finalScore,
        kkmValue,
        `${stats.predicate} (${stats.predicateLabel})`,
        stats.competencyDescription,
      ];
    });

    exportToCSV(headers, rows, `Rekap_Nilai_Leger_${selectedSubject}`);
  };

  const handleExportDoc = () => {
    const tableHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 10pt;">
        <h3 style="text-align: center; font-size: 13pt; margin-bottom: 5px;">REKAPITULASI NILAI LEGER & DESKRIPSI RAPORT</h3>
        <p style="text-align: center; margin-top: 0; font-weight: bold;">Mata Pelajaran: ${selectedSubject} | KKM: ${kkmValue}</p>
        <p style="text-align: center; font-size: 9pt; color: #555;">Rentang Nilai: A (90-100/Sangat Baik), B (80-89/Baik), C (75-79/Cukup), D (&lt;75/Kurang)</p>
        <hr style="margin: 15px 0; border: 1px solid #000;"/>

        <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 9pt;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: center; font-weight: bold;">
              <th style="border: 1px solid #333; padding: 5px; width: 30px;">No</th>
              <th style="border: 1px solid #333; padding: 5px; width: 80px;">NISN</th>
              <th style="border: 1px solid #333; padding: 5px; text-align: left; width: 140px;">Nama Siswa</th>
              ${tpList.map((t) => `<th style="border: 1px solid #333; padding: 5px; width: 45px;">${t.code}</th>`).join("")}
              <th style="border: 1px solid #333; padding: 5px; width: 70px;">TP Tertinggi</th>
              <th style="border: 1px solid #333; padding: 5px; width: 70px;">TP Terendah</th>
              <th style="border: 1px solid #333; padding: 5px; width: 45px;">NA Raport</th>
              <th style="border: 1px solid #333; padding: 5px; width: 60px;">Predikat</th>
              <th style="border: 1px solid #333; padding: 5px; text-align: left;">Deskripsi Capaian Kompetensi</th>
            </tr>
          </thead>
          <tbody>
            ${students
              .map((s, idx) => {
                const stats = calculateStudentStats(s);
                return `
                <tr>
                  <td style="border: 1px solid #333; padding: 5px; text-align: center;">${idx + 1}</td>
                  <td style="border: 1px solid #333; padding: 5px; text-align: center;">${s.nisn || "-"}</td>
                  <td style="border: 1px solid #333; padding: 5px; font-weight: bold;">${s.name}</td>
                  ${tpList.map((t) => `<td style="border: 1px solid #333; padding: 5px; text-align: center;">${stats.record.tpScores[t.code] ?? "-"}</td>`).join("")}
                  <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold; color: #059669;">${stats.tpHighest}</td>
                  <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold; color: #dc2626;">${stats.tpLowest}</td>
                  <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold; background-color: #ecfdf5;">${stats.finalScore}</td>
                  <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold;">${stats.predicate} (${stats.predicateLabel})</td>
                  <td style="border: 1px solid #333; padding: 5px; font-size: 8.5pt;">${stats.competencyDescription}</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    exportHtmlToDoc({
      htmlContent: tableHtml,
      filename: `Rekap_Nilai_Leger_${selectedSubject}.doc`,
      title: `REKAPITULASI NILAI LEGER & RAPORT`,
    });
  };

  const handlePrint = () => {
    onOpenPrint(
      `REKAPITULASI LEGER & DESKRIPSI RAPORT - ${selectedSubject.toUpperCase()}`,
      `KKM Acuan: ${kkmValue} | Rentang: A (90-100), B (80-89), C (75-79), D (<75)`,
      (
        <div className="space-y-4 text-xs">
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <th className="border border-slate-300 p-1.5 text-center w-8">No</th>
                <th className="border border-slate-300 p-1.5 text-left w-36">Nama Siswa</th>
                {tpList.map((t) => (
                  <th key={t.code} className="border border-slate-300 p-1.5 text-center w-10">
                    {t.code}
                  </th>
                ))}
                <th className="border border-slate-300 p-1.5 text-center w-16">TP Tinggi</th>
                <th className="border border-slate-300 p-1.5 text-center w-16">TP Rendah</th>
                <th className="border border-slate-300 p-1.5 text-center w-12 bg-emerald-50">NA</th>
                <th className="border border-slate-300 p-1.5 text-center w-12">Pred</th>
                <th className="border border-slate-300 p-1.5 text-left">Deskripsi Capaian Kompetensi</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const stats = calculateStudentStats(s);
                return (
                  <tr key={s.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border border-slate-300 p-1.5 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 p-1.5 font-bold">{s.name}</td>
                    {tpList.map((t) => (
                      <td key={t.code} className="border border-slate-300 p-1.5 text-center">
                        {stats.record.tpScores[t.code] ?? "-"}
                      </td>
                    ))}
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-emerald-700">{stats.tpHighest}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-red-600">{stats.tpLowest}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-extrabold text-emerald-900 bg-emerald-50/50">{stats.finalScore}</td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold">{stats.predicate}</td>
                    <td className="border border-slate-300 p-1.5 text-[10px] leading-tight">{stats.competencyDescription}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-600" />
            Rekap Nilai & Leger Raport Kurikulum Merdeka
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengolahan nilai TP tertinggi & terendah, KKM, predikat A/B/C/D, serta otomasi Deskripsi Capaian Kompetensi
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("remedial_dashboard")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "remedial_dashboard"
                ? "bg-emerald-700 text-white shadow-xs font-bold"
                : "text-slate-700 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5 text-emerald-300" />
            Dashboard Ketuntasan & Remedial
          </button>
          <button
            onClick={() => setActiveTab("rekap")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "rekap"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Leger & Deskripsi Raport
          </button>
          <button
            onClick={() => setActiveTab("daily_input")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "daily_input"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Input Nilai Harian (Formatif)
          </button>
          <button
            onClick={() => setActiveTab("matrix_input")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "matrix_input"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Input Matrix Nilai TP & Sumatif
          </button>
        </div>
      </div>

      {/* Filter Bar & KKM Controls (Shown for rekap, daily_input, matrix_input) */}
      {activeTab !== "remedial_dashboard" && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedSubject === sub
                    ? "bg-emerald-600 text-white font-bold shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-900 font-bold">
              <span>KKM Mapel:</span>
              <input
                type="number"
                value={kkmValue}
                onChange={(e) => setKkmValue(parseInt(e.target.value, 10) || 75)}
                className="w-12 p-0.5 border border-amber-300 text-center rounded bg-white text-xs font-extrabold"
              />
            </div>

            <button
              onClick={() => exportGradesToExcel(students, dailyGrades, grades, subjects)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              title="Ekspor ke Excel (.xlsx)"
            >
              <Download className="w-4 h-4 text-emerald-100" />
              Ekspor Excel (.xlsx)
            </button>
            <button
              onClick={handleExportDoc}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              title="Simpan Word (.docx)"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              Simpan Word (.docx)
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              Cetak
            </button>
          </div>
        </div>
      )}

      {/* TAB 0: DASHBOARD KETUNTASAN & REMEDIAL */}
      {activeTab === "remedial_dashboard" && (
        <GradesRemedialDashboard
          students={students}
          cptpItems={cptpItems}
          grades={grades}
          subjects={subjects}
          kkmValue={kkmValue}
          onSetKkmValue={setKkmValue}
          onOpenPrint={onOpenPrint}
        />
      )}

      {savedAlert && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          Data Nilai Harian berhasil disimpan dan disinkronkan ke Leger Raport!
        </div>
      )}

      {/* TAB 1: REKAP LEGER & DESKRIPSI RAPORT */}
      {activeTab === "rekap" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-2">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              Leger & Deskripsi Capaian Kompetensi Raport ({selectedSubject})
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Skala Predikat: A (90-100), B (80-89), C (75-79), D (&lt;75)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-3 text-center w-10">No</th>
                  <th className="px-3 py-3">Nama Siswa</th>
                  <th className="px-3 py-3 text-center w-16">TP Rerata</th>
                  <th className="px-3 py-3 text-center w-24 text-emerald-800 bg-emerald-50/50">TP Tertinggi</th>
                  <th className="px-3 py-3 text-center w-24 text-red-800 bg-red-50/50">TP Terendah</th>
                  <th className="px-3 py-3 text-center w-16">STS</th>
                  <th className="px-3 py-3 text-center w-16">SAS</th>
                  <th className="px-3 py-3 text-center w-16 bg-emerald-100 font-extrabold">NA</th>
                  <th className="px-3 py-3 text-center w-24">Predikat</th>
                  <th className="px-3 py-3 min-w-[280px]">Deskripsi Capaian Kompetensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student, idx) => {
                  const stats = calculateStudentStats(student);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-3 py-3 font-bold text-slate-900">{student.name}</td>
                      <td className="px-3 py-3 text-center font-mono font-semibold">{stats.avgTP}</td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                        {stats.tpHighest}
                      </td>
                      <td className="px-3 py-3 text-center font-mono font-bold text-red-600 bg-red-50/30">
                        {stats.tpLowest}
                      </td>
                      <td className="px-3 py-3 text-center font-mono">{stats.mid}</td>
                      <td className="px-3 py-3 text-center font-mono">{stats.finalS}</td>
                      <td className="px-3 py-3 text-center font-extrabold text-emerald-950 bg-emerald-100/70 font-mono text-sm">
                        {stats.finalScore}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-extrabold text-xs ${
                            stats.predicate === "A"
                              ? "bg-emerald-100 text-emerald-900"
                              : stats.predicate === "B"
                              ? "bg-blue-100 text-blue-900"
                              : stats.predicate === "C"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-red-100 text-red-900"
                          }`}
                        >
                          {stats.predicate} ({stats.predicateLabel})
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[11px] text-slate-700 leading-relaxed">
                        {stats.competencyDescription}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: INPUT NILAI HARIAN / FORMATIF */}
      {activeTab === "daily_input" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Entri Massal Nilai Harian Siswa</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Input nilai per Kode & Deskripsi TP. Setelah disimpan, sistem menampilkan Kode TP, Jenis Asesmen, dan Tanggal (dd/m).
              </p>
            </div>
            <button
              onClick={handleOpenNewDailyModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Input Penilaian Harian Baru
            </button>
          </div>

          {/* Historical Daily Entries List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Riwayat Penilaian Harian Tersimpan ({selectedSubject})
            </h4>

            {dailyGrades.filter((g) => g.subject === selectedSubject).length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada entri penilaian harian khusus untuk mapel ini. Klik <b>Input Penilaian Harian Baru</b> di atas!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-center">Tgl (dd/m)</th>
                      <th className="px-3 py-2">Kode TP</th>
                      <th className="px-3 py-2">Jenis Asesmen</th>
                      <th className="px-3 py-2 text-center">Rata-Rata Kelas</th>
                      <th className="px-3 py-2 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.from(
                      new Set(
                        dailyGrades
                          .filter((g) => g.subject === selectedSubject)
                          .map((g) => `${g.tpCode}_${g.formattedDate || g.date}_${g.assessmentType}`)
                      )
                    ).map((groupKey) => {
                      const [tpCode, dateStr, type] = groupKey.split("_");
                      const groupItems = dailyGrades.filter(
                        (g) =>
                          g.subject === selectedSubject &&
                          g.tpCode === tpCode &&
                          (g.formattedDate === dateStr || g.date === dateStr) &&
                          g.assessmentType === type
                      );
                      const avg =
                        groupItems.length > 0
                          ? Math.round(groupItems.reduce((a, b) => a + b.score, 0) / groupItems.length)
                          : 0;

                      return (
                        <tr key={groupKey} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 text-center font-mono font-bold text-emerald-800 bg-emerald-50/40">
                            {dateStr}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-slate-900">{tpCode}</td>
                          <td className="px-3 py-2 font-semibold text-slate-600">{type}</td>
                          <td className="px-3 py-2 text-center font-mono font-extrabold text-emerald-700">{avg}</td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditDailyGroup(tpCode, dateStr, type)}
                                className="px-2 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                                title="Edit Entri Nilai Harian"
                              >
                                <Edit2 className="w-3 h-3 text-emerald-600" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteDailyGroup(tpCode, dateStr, type)}
                                className="px-2 py-1 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                                title="Hapus Entri Nilai Harian"
                              >
                                <Trash2 className="w-3 h-3 text-red-600" />
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MATRIX INPUT NILAI TP & SUMATIF */}
      {activeTab === "matrix_input" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              Matrix Input Nilai Formatif TP, STS, & SAS ({selectedSubject})
            </h3>
            <p className="text-xs text-slate-500">Perubahan nilai langsung tersimpan ke sistem</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-3 py-3 text-center w-10">No</th>
                  <th className="px-3 py-3">Nama Siswa</th>
                  {tpList.map((t) => (
                    <th key={t.code} className="px-3 py-3 text-center w-20">
                      {t.code}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center w-20 bg-amber-50 text-amber-900">STS</th>
                  <th className="px-3 py-3 text-center w-20 bg-purple-50 text-purple-900">SAS</th>
                  <th className="px-3 py-3 text-center w-20 bg-emerald-100 font-extrabold text-emerald-950">
                    NA
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student, idx) => {
                  const stats = calculateStudentStats(student);
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-3 py-2 font-bold text-slate-900">{student.name}</td>
                      {tpList.map((t) => (
                        <td key={t.code} className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={stats.record.tpScores[t.code] ?? ""}
                            onChange={(e) =>
                              handleScoreChange(student.id, "tp", t.code, parseInt(e.target.value, 10))
                            }
                            className="w-14 p-1 border rounded text-center font-mono font-semibold"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center bg-amber-50/40">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={stats.record.midSummative ?? ""}
                          onChange={(e) =>
                            handleScoreChange(student.id, "mid", null, parseInt(e.target.value, 10))
                          }
                          className="w-14 p-1 border border-amber-300 rounded text-center font-mono font-bold"
                        />
                      </td>
                      <td className="px-2 py-2 text-center bg-purple-50/40">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={stats.record.finalSummative ?? ""}
                          onChange={(e) =>
                            handleScoreChange(student.id, "final", null, parseInt(e.target.value, 10))
                          }
                          className="w-14 p-1 border border-purple-300 rounded text-center font-mono font-bold"
                        />
                      </td>
                      <td className="px-3 py-2 text-center font-extrabold text-emerald-950 bg-emerald-100/80 font-mono text-sm">
                        {stats.finalScore}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Input Nilai Harian Massal */}
      {isDailyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              {editingDailyGroupKey ? (
                <>
                  <Edit2 className="w-5 h-5 text-emerald-600" />
                  Edit Penilaian Harian / Formatif Siswa ({selectedSubject})
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Input Penilaian Harian Baru ({selectedSubject})
                </>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  disabled
                  value={selectedSubject}
                  className="w-full p-2 border rounded-lg bg-slate-100 font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tanggal Input</label>
                <input
                  type="date"
                  value={dailyForm.date}
                  onChange={(e) => setDailyForm((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2 border rounded-lg font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Jenis Asesmen</label>
                <select
                  value={dailyForm.assessmentType}
                  onChange={(e) =>
                    setDailyForm((prev) => ({ ...prev, assessmentType: e.target.value as GradeAssessmentType }))
                  }
                  className="w-full p-2 border rounded-lg bg-white font-semibold"
                >
                  <option value="Formatif TP">Formatif TP</option>
                  <option value="Sumatif Lingkup Materi">Sumatif Lingkup Materi</option>
                  <option value="Sumatif Tengah Semester">Sumatif Tengah Semester (STS)</option>
                  <option value="Sumatif Akhir Semester">Sumatif Akhir Semester (SAS)</option>
                </select>
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold mb-1 text-emerald-900">
                Pilih Tujuan Pembelajaran (TP)
              </label>
              <select
                value={dailyForm.tpCode}
                onChange={(e) => setDailyForm((prev) => ({ ...prev, tpCode: e.target.value }))}
                className="w-full p-2.5 border border-emerald-300 rounded-lg bg-emerald-50/60 font-bold text-slate-900"
              >
                <option value="">-- Pilih Kode & Deskripsi TP --</option>
                {tpList.map((t) => (
                  <option key={t.code} value={t.code}>
                    [{t.code}] - {t.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Scores Table */}
            {dailyForm.tpCode && (
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-center w-10">No</th>
                      <th className="px-3 py-2">Nama Siswa</th>
                      <th className="px-3 py-2 text-center w-28">Nilai (0 - 100)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student, idx) => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{student.name}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="0"
                            value={dailyForm.scores[student.id] ?? ""}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              setDailyForm((prev) => ({
                                ...prev,
                                scores: { ...prev.scores, [student.id]: isNaN(val) ? 0 : val },
                              }));
                            }}
                            className="w-20 p-1 border border-slate-300 rounded text-center font-mono font-bold text-emerald-800"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDailyModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!dailyForm.tpCode}
                onClick={handleSaveDailyForm}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg"
              >
                Simpan Penilaian Harian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
