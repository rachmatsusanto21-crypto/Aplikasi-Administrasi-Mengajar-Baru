import React, { useState, useMemo, useRef } from "react";
import { Student, CPTPItem, GradeRecord, DailyGradeEntry, GradeAssessmentType } from "../../types";
import {
  GraduationCap,
  Save,
  Printer,
  Download,
  Check,
  Filter,
  FileText,
  Plus,
  Calendar,
  BookOpen,
  PieChart as PieChartIcon,
  AlertTriangle,
  Edit2,
  Trash2,
  Search,
  Zap,
  FileSpreadsheet,
  ArrowUpDown,
  Table as TableIcon,
  HelpCircle,
} from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";
import { exportGradesToExcel } from "../../lib/exportExcel";
import { GradesRemedialDashboard } from "./GradesRemedialDashboard";
import { ExcelPasteModal } from "../grades/ExcelPasteModal";
import { QuickFillModal } from "../grades/QuickFillModal";

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
  // Default to matrix_input (Tabel Input Nilai) for instant spreadsheet experience!
  const [activeTab, setActiveTab] = useState<
    "matrix_input" | "daily_input" | "rekap" | "remedial_dashboard"
  >("matrix_input");
  const [kkmValue, setKkmValue] = useState<number>(75);
  const [savedAlert, setSavedAlert] = useState(false);
  const [savedAlertMessage, setSavedAlertMessage] = useState(
    "Data Nilai berhasil disimpan dan disinkronkan ke Leger Raport!"
  );

  // Search & Filter in Table
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "remedial" | "incomplete">("all");

  // Excel paste & quick fill modals
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);

  // Daily grade input inline & modal states
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
    if (
      (selNorm.includes("kokurikuler") || selNorm.includes("p5")) &&
      (itemNorm.includes("kokurikuler") || itemNorm.includes("p5"))
    ) {
      return true;
    }
    return false;
  });

  const tpList =
    subjectTPs.length > 0
      ? subjectTPs.map((t) => ({ code: t.codeTP, desc: t.descriptionTP }))
      : [
          { code: "TP-1", desc: "Mengenal dan memahami konsep dasar materi" },
          { code: "TP-2", desc: "Menganalisis dan mengaplikasikan materi secara mandiri" },
          { code: "TP-3", desc: "Mengevaluasi dan membuat hasil karya / presentasi" },
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
    val: number | undefined
  ) => {
    const numVal =
      val === undefined || isNaN(val)
        ? undefined
        : Math.min(100, Math.max(0, val));

    const current = getGradeRecord(studentId, selectedSubject);

    let updatedRecord: GradeRecord;
    if (field === "tp" && tpCode) {
      const newTpScores = { ...current.tpScores };
      if (numVal === undefined) {
        delete newTpScores[tpCode];
      } else {
        newTpScores[tpCode] = numVal;
      }
      updatedRecord = {
        ...current,
        tpScores: newTpScores,
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
    const entries = Object.entries(tpScoresMap).filter(
      ([_, score]) => typeof score === "number" && !isNaN(score)
    );

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

    const isRemedial = finalScore < kkmValue && finalScore > 0;
    const isIncomplete = entries.length < tpList.length || record.midSummative === undefined || record.finalSummative === undefined;

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
      isRemedial,
      isIncomplete,
    };
  };

  // Filtered Students for the Table
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = student.name.toLowerCase().includes(q);
        const matchNis = (student.nis || "").toLowerCase().includes(q);
        const matchNisn = (student.nisn || "").toLowerCase().includes(q);
        if (!matchName && !matchNis && !matchNisn) return false;
      }

      // Filter status check
      if (filterStatus === "all") return true;
      const stats = calculateStudentStats(student);
      if (filterStatus === "remedial") return stats.isRemedial;
      if (filterStatus === "incomplete") return stats.isIncomplete;

      return true;
    });
  }, [students, searchQuery, filterStatus, selectedSubject, kkmValue, grades]);

  // Keyboard navigation & cell pasting for Spreadsheet Table
  // Col indices: 0..(tpList.length-1) for TPs, tpList.length for STS, tpList.length+1 for SAS
  const totalEditableCols = tpList.length + 2;

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    colIdx: number
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextRow = e.shiftKey ? rowIdx - 1 : rowIdx + 1;
      if (nextRow >= 0 && nextRow < filteredStudents.length) {
        const nextEl = document.getElementById(`cell_${nextRow}_${colIdx}`) as HTMLInputElement;
        if (nextEl) {
          nextEl.focus();
          nextEl.select();
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextRow = rowIdx + 1;
      if (nextRow < filteredStudents.length) {
        const nextEl = document.getElementById(`cell_${nextRow}_${colIdx}`) as HTMLInputElement;
        if (nextEl) {
          nextEl.focus();
          nextEl.select();
        }
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextRow = rowIdx - 1;
      if (nextRow >= 0) {
        const nextEl = document.getElementById(`cell_${nextRow}_${colIdx}`) as HTMLInputElement;
        if (nextEl) {
          nextEl.focus();
          nextEl.select();
        }
      }
    }
  };

  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startStudentIdx: number,
    startColIdx: number
  ) => {
    const pasteText = e.clipboardData.getData("text");
    if (!pasteText || (!pasteText.includes("\t") && !pasteText.includes("\n"))) {
      // Single value paste, let default input handle it
      return;
    }

    e.preventDefault();
    const lines = pasteText
      .trim()
      .split(/\r?\n/)
      .map((row) => row.split(/\t|,/).map((c) => c.trim()));

    const updatedGrades = [...grades];
    let count = 0;

    lines.forEach((rowCells, rOffset) => {
      const targetStudentIdx = startStudentIdx + rOffset;
      if (targetStudentIdx >= filteredStudents.length) return;
      const targetStudent = filteredStudents[targetStudentIdx];

      let record = updatedGrades.find(
        (g) => g.studentId === targetStudent.id && g.subject === selectedSubject
      );
      if (!record) {
        record = {
          studentId: targetStudent.id,
          subject: selectedSubject,
          tpScores: {},
        };
        updatedGrades.push(record);
      }

      rowCells.forEach((cellVal, cOffset) => {
        const targetColIdx = startColIdx + cOffset;
        if (targetColIdx >= totalEditableCols) return;

        const num = parseFloat(cellVal.replace(",", "."));
        if (isNaN(num)) return;
        const clampedScore = Math.min(100, Math.max(0, Math.round(num)));

        if (targetColIdx < tpList.length) {
          const tpCode = tpList[targetColIdx].code;
          record.tpScores = { ...record.tpScores, [tpCode]: clampedScore };
          count++;
        } else if (targetColIdx === tpList.length) {
          record.midSummative = clampedScore;
          count++;
        } else if (targetColIdx === tpList.length + 1) {
          record.finalSummative = clampedScore;
          count++;
        }
      });
    });

    if (count > 0) {
      onSaveGrades(updatedGrades);
      setSavedAlertMessage(`✅ Berhasil menempelkan ${count} nilai dari Excel ke tabel!`);
      setSavedAlert(true);
      setTimeout(() => setSavedAlert(false), 3500);
    }
  };

  // Quick fill and Excel paste handlers
  const handleApplyQuickFill = (
    columnKey: string,
    actionType: "fixed" | "kkm" | "clear",
    fixedScore = 85
  ) => {
    const updatedGrades = [...grades];
    students.forEach((s) => {
      let record = updatedGrades.find(
        (g) => g.studentId === s.id && g.subject === selectedSubject
      );
      if (!record) {
        record = { studentId: s.id, subject: selectedSubject, tpScores: {} };
        updatedGrades.push(record);
      }

      const applyValue = (currentVal: number | undefined): number | undefined => {
        if (actionType === "clear") return undefined;
        if (actionType === "kkm") {
          return currentVal === undefined || currentVal === 0 ? kkmValue : currentVal;
        }
        return fixedScore;
      };

      if (columnKey === "all_tps") {
        tpList.forEach((tp) => {
          const val = applyValue(record.tpScores[tp.code]);
          if (val === undefined) {
            delete record.tpScores[tp.code];
          } else {
            record.tpScores[tp.code] = val;
          }
        });
      } else if (columnKey === "mid") {
        record.midSummative = applyValue(record.midSummative);
      } else if (columnKey === "final") {
        record.finalSummative = applyValue(record.finalSummative);
      } else {
        const val = applyValue(record.tpScores[columnKey]);
        if (val === undefined) {
          delete record.tpScores[columnKey];
        } else {
          record.tpScores[columnKey] = val;
        }
      }
    });

    onSaveGrades(updatedGrades);
    setSavedAlertMessage("✅ Aksi cepat berhasil diterapkan ke tabel!");
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  const handleApplyExcelGrades = (
    updates: { studentId: string; tpCode?: string; field: "tp" | "mid" | "final"; score: number }[]
  ) => {
    const updatedGrades = [...grades];
    updates.forEach((u) => {
      let record = updatedGrades.find(
        (g) => g.studentId === u.studentId && g.subject === selectedSubject
      );
      if (!record) {
        record = { studentId: u.studentId, subject: selectedSubject, tpScores: {} };
        updatedGrades.push(record);
      }

      if (u.field === "tp" && u.tpCode) {
        record.tpScores = { ...record.tpScores, [u.tpCode]: u.score };
      } else if (u.field === "mid") {
        record.midSummative = u.score;
      } else if (u.field === "final") {
        record.finalSummative = u.score;
      }
    });

    onSaveGrades(updatedGrades);
    setSavedAlertMessage(`✅ Berhasil menerapkan ${updates.length} data nilai dari Excel!`);
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3500);
  };

  // Class Summary Column Stats
  const columnStats = useMemo(() => {
    const stats: Record<
      string,
      { avg: number; max: number; min: number; passCount: number; passRate: number }
    > = {};

    const calcCol = (vals: (number | undefined)[]) => {
      const valid = vals.filter((v): v is number => typeof v === "number" && !isNaN(v));
      if (valid.length === 0) return { avg: 0, max: 0, min: 0, passCount: 0, passRate: 0 };
      const avg = Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
      const max = Math.max(...valid);
      const min = Math.min(...valid);
      const passCount = valid.filter((v) => v >= kkmValue).length;
      const passRate = Math.round((passCount / valid.length) * 100);
      return { avg, max, min, passCount, passRate };
    };

    tpList.forEach((t) => {
      const vals = students.map((s) => getGradeRecord(s.id, selectedSubject).tpScores[t.code]);
      stats[t.code] = calcCol(vals);
    });

    stats["mid"] = calcCol(students.map((s) => getGradeRecord(s.id, selectedSubject).midSummative));
    stats["final"] = calcCol(students.map((s) => getGradeRecord(s.id, selectedSubject).finalSummative));
    stats["na"] = calcCol(students.map((s) => calculateStudentStats(s).finalScore));

    return stats;
  }, [students, selectedSubject, grades, kkmValue, tpList]);

  // Inline Daily Grade Handlers (Tab 2)
  const [selectedDailyTP, setSelectedDailyTP] = useState<string>(tpList[0]?.code || "TP-1");
  const [dailyAssessmentDate, setDailyAssessmentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [dailyAssessmentType, setDailyAssessmentType] = useState<GradeAssessmentType>("Formatif TP");

  // Local daily scores state for inline daily table
  const [inlineDailyScores, setInlineDailyScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    students.forEach((s) => {
      const rec = getGradeRecord(s.id, selectedSubject);
      if (rec.tpScores[selectedDailyTP] !== undefined) {
        initial[s.id] = rec.tpScores[selectedDailyTP];
      }
    });
    return initial;
  });

  const handleSelectDailyTPChange = (newTP: string) => {
    setSelectedDailyTP(newTP);
    const newScores: Record<string, number> = {};
    students.forEach((s) => {
      const rec = getGradeRecord(s.id, selectedSubject);
      if (rec.tpScores[newTP] !== undefined) {
        newScores[s.id] = rec.tpScores[newTP];
      }
    });
    setInlineDailyScores(newScores);
  };

  const handleSaveInlineDaily = () => {
    if (!selectedDailyTP) return;
    const dateObj = new Date(dailyAssessmentDate);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const formattedDate = isNaN(day) || isNaN(month) ? dailyAssessmentDate : `${day}/${month}`;
    const tpInfo = tpList.find((t) => t.code === selectedDailyTP);
    const tpDesc = tpInfo ? tpInfo.desc : "";

    const newEntries: DailyGradeEntry[] = students.map((std) => ({
      id: "dg_" + Date.now() + "_" + std.id,
      studentId: std.id,
      subject: selectedSubject,
      tpCode: selectedDailyTP,
      tpDescription: tpDesc,
      assessmentType: dailyAssessmentType,
      dateFormatted: formattedDate,
      score: inlineDailyScores[std.id] ?? 0,
      date: dailyAssessmentDate,
      formattedDate,
    }));

    if (onSaveDailyGrades) {
      const filtered = dailyGrades.filter(
        (g) =>
          !(
            g.subject === selectedSubject &&
            g.tpCode === selectedDailyTP &&
            (g.formattedDate === formattedDate || g.date === dailyAssessmentDate) &&
            g.assessmentType === dailyAssessmentType
          )
      );
      onSaveDailyGrades([...filtered, ...newEntries]);
    }

    // Sync to main grade matrix
    const updatedGrades = [...grades];
    students.forEach((std) => {
      const userVal = inlineDailyScores[std.id];
      if (userVal !== undefined) {
        const numVal = Math.min(100, Math.max(0, userVal || 0));
        let record = updatedGrades.find(
          (g) => g.studentId === std.id && g.subject === selectedSubject
        );
        if (!record) {
          record = { studentId: std.id, subject: selectedSubject, tpScores: {} };
          updatedGrades.push(record);
        }
        record.tpScores = { ...record.tpScores, [selectedDailyTP]: numVal };
      }
    });

    onSaveGrades(updatedGrades);
    setSavedAlertMessage("✅ Penilaian Harian berhasil disimpan dan disinkronkan ke Leger!");
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  const handleEditDailyGroupInline = (tpCode: string, dateStr: string, type: string) => {
    setSelectedDailyTP(tpCode);
    setDailyAssessmentType(type as GradeAssessmentType);

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

    if (groupItems[0]?.date) {
      setDailyAssessmentDate(groupItems[0].date);
    }
    setInlineDailyScores(scores);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

    setSavedAlertMessage("Entri penilaian harian berhasil dihapus.");
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
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-emerald-700">
                      {stats.tpHighest}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-red-600">
                      {stats.tpLowest}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-extrabold text-emerald-900 bg-emerald-50/50">
                      {stats.finalScore}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold">
                      {stats.predicate}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-[10px] leading-tight">
                      {stats.competencyDescription}
                    </td>
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
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-600" />
            Rekap Nilai & Leger Raport Kurikulum Merdeka
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tabel input nilai terintegrasi (Formatif TP, STS, SAS) dengan navigasi spreadsheet, otomasi nilai akhir (NA), dan predikat.
          </p>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold flex-wrap gap-1">
          <button
            onClick={() => setActiveTab("matrix_input")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "matrix_input"
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tabel Input Nilai (Formatif & Sumatif)</span>
          </button>
          <button
            onClick={() => setActiveTab("daily_input")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "daily_input"
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Input Nilai Harian (Formatif)</span>
          </button>
          <button
            onClick={() => setActiveTab("rekap")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "rekap"
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Leger & Deskripsi Raport</span>
          </button>
          <button
            onClick={() => setActiveTab("remedial_dashboard")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "remedial_dashboard"
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Ketuntasan & Remedial</span>
          </button>
        </div>
      </div>

      {/* Filter Bar, Subject Chips & KKM Controls (Shown for matrix_input, daily_input, and rekap) */}
      {activeTab !== "remedial_dashboard" && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          {/* Row 1: Subject Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                Mapel:
              </span>
              {subjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedSubject === sub
                      ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* KKM Input & Quick Actions */}
            <div className="flex items-center space-x-2 text-xs">
              <div className="flex items-center space-x-1.5 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-amber-900 font-bold">
                <span>KKM Mapel:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={kkmValue}
                  onChange={(e) => setKkmValue(parseInt(e.target.value, 10) || 75)}
                  className="w-12 p-0.5 border border-amber-300 text-center rounded-lg bg-white text-xs font-extrabold focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <button
                onClick={() => exportGradesToExcel(students, dailyGrades, grades, subjects)}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Ekspor Seluruh Nilai ke Excel (.xlsx)"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                Excel (.xlsx)
              </button>
              <button
                onClick={handleExportDoc}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Simpan Format Word (.docx)"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                Word (.docx)
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                Cetak
              </button>
            </div>
          </div>

          {/* Row 2: Search, Filter & Spreadsheet Action Tools (When in matrix_input) */}
          {activeTab === "matrix_input" && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari siswa berdasarkan nama atau NISN..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-700 outline-none"
                >
                  <option value="all">Semua Siswa ({students.length})</option>
                  <option value="remedial">Perlu Remedial (&lt; KKM)</option>
                  <option value="incomplete">Belum Lengkap</option>
                </select>
              </div>

              {/* Table Quick Tools */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExcelModalOpen(true)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  title="Salin & Tempel Nilai dari Excel / Google Sheets"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Tempel Nilai Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsQuickFillOpen(true)}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Isi Nilai Kolom Serentak atau KKM"
                >
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Isi Cepat Kolom</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alert Notification */}
      {savedAlert && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedAlertMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SPREADSHEET TABLE INPUT NILAI (FORMATIF & SUMATIF)                 */}
      {/* ========================================================================= */}
      {activeTab === "matrix_input" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Table Header Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Tabel Entri Nilai Formatif TP, STS, & SAS — {selectedSubject}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ketik langsung nilai pada tabel. Tekan <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px] font-bold">Enter</kbd> untuk pindah ke siswa berikutnya, atau gunakan panah <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px] font-bold">↑ ↓</kbd>.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>≥ KKM ({kkmValue})</span>
              </span>
              <span className="flex items-center gap-1 ml-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span>&lt; KKM (Remedial)</span>
              </span>
            </div>
          </div>

          {/* Spreadsheet Continuous Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-200">
              <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800 uppercase tracking-wider text-[11px] select-none sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="px-3 py-3 text-center w-12 border-r border-slate-300">No</th>
                  <th className="px-4 py-3 min-w-[200px] border-r border-slate-300">Nama Siswa</th>
                  {tpList.map((t, colIdx) => (
                    <th
                      key={t.code}
                      className="px-2 py-2.5 text-center min-w-[70px] border-r border-slate-300 bg-emerald-50/40 text-emerald-950 group relative"
                      title={`${t.code}: ${t.desc}`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-extrabold">{t.code}</span>
                        <span className="text-[9px] font-normal text-slate-500 lowercase truncate max-w-[65px]">
                          {t.desc.slice(0, 10)}...
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-2.5 text-center w-20 border-r border-slate-300 bg-emerald-100/50 text-emerald-900">
                    Rerata TP
                  </th>
                  <th className="px-2 py-2.5 text-center min-w-[75px] border-r border-slate-300 bg-amber-100/40 text-amber-950">
                    STS (Mid)
                  </th>
                  <th className="px-2 py-2.5 text-center min-w-[75px] border-r border-slate-300 bg-purple-100/40 text-purple-950">
                    SAS (Final)
                  </th>
                  <th className="px-3 py-2.5 text-center w-16 border-r border-slate-300 bg-emerald-600 text-white font-extrabold">
                    NA
                  </th>
                  <th className="px-3 py-2.5 text-center min-w-[100px]">Predikat & Ketuntasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tpList.length + 6}
                      className="px-4 py-10 text-center text-slate-400 text-xs"
                    >
                      Tidak ada data siswa yang cocok dengan pencarian / filter.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, rowIdx) => {
                    const stats = calculateStudentStats(student);
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-emerald-50/30 transition-colors focus-within:bg-emerald-50/50"
                      >
                        {/* No */}
                        <td className="px-2 py-2 text-center text-slate-400 font-mono border-r border-slate-200 font-semibold">
                          {rowIdx + 1}
                        </td>

                        {/* Student Name */}
                        <td className="px-4 py-2 font-bold text-slate-900 border-r border-slate-200">
                          <div>{student.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-normal">
                            NIS: {student.nis || "-"} | NISN: {student.nisn || "-"}
                          </div>
                        </td>

                        {/* TP Score Cells */}
                        {tpList.map((t, colIdx) => {
                          const val = stats.record.tpScores[t.code];
                          const hasVal = typeof val === "number" && !isNaN(val);
                          const isPass = hasVal && val >= kkmValue;
                          const isRem = hasVal && val < kkmValue;

                          return (
                            <td
                              key={t.code}
                              className={`p-0 text-center border-r border-slate-200 transition-colors ${
                                isRem ? "bg-rose-50/60" : isPass ? "bg-emerald-50/20" : ""
                              }`}
                            >
                              <input
                                id={`cell_${rowIdx}_${colIdx}`}
                                type="number"
                                min={0}
                                max={100}
                                placeholder="-"
                                value={hasVal ? val : ""}
                                onFocus={(e) => e.target.select()}
                                onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                                onPaste={(e) => handleCellPaste(e, rowIdx, colIdx)}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  handleScoreChange(
                                    student.id,
                                    "tp",
                                    t.code,
                                    raw === "" ? undefined : parseInt(raw, 10)
                                  );
                                }}
                                className={`w-full h-10 text-center font-mono font-bold text-xs bg-transparent border-0 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-emerald-100/60 transition-all ${
                                  isRem
                                    ? "text-rose-600 font-extrabold"
                                    : isPass
                                    ? "text-emerald-800 font-extrabold"
                                    : "text-slate-700"
                                }`}
                              />
                            </td>
                          );
                        })}

                        {/* Average TP (Calculated) */}
                        <td className="px-2 py-2 text-center font-mono font-bold border-r border-slate-200 bg-emerald-50/30 text-emerald-900">
                          {stats.avgTP > 0 ? stats.avgTP : "-"}
                        </td>

                        {/* STS (Mid Summative) */}
                        <td
                          className={`p-0 text-center border-r border-slate-200 transition-colors ${
                            stats.record.midSummative !== undefined &&
                            stats.record.midSummative < kkmValue
                              ? "bg-rose-50/60"
                              : "bg-amber-50/20"
                          }`}
                        >
                          <input
                            id={`cell_${rowIdx}_${tpList.length}`}
                            type="number"
                            min={0}
                            max={100}
                            placeholder="-"
                            value={
                              stats.record.midSummative !== undefined ? stats.record.midSummative : ""
                            }
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, tpList.length)}
                            onPaste={(e) => handleCellPaste(e, rowIdx, tpList.length)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              handleScoreChange(
                                student.id,
                                "mid",
                                null,
                                raw === "" ? undefined : parseInt(raw, 10)
                              );
                            }}
                            className={`w-full h-10 text-center font-mono font-bold text-xs bg-transparent border-0 outline-none focus:ring-2 focus:ring-amber-500 focus:bg-amber-100/60 transition-all ${
                              stats.record.midSummative !== undefined &&
                              stats.record.midSummative < kkmValue
                                ? "text-rose-600 font-extrabold"
                                : "text-amber-950 font-extrabold"
                            }`}
                          />
                        </td>

                        {/* SAS (Final Summative) */}
                        <td
                          className={`p-0 text-center border-r border-slate-200 transition-colors ${
                            stats.record.finalSummative !== undefined &&
                            stats.record.finalSummative < kkmValue
                              ? "bg-rose-50/60"
                              : "bg-purple-50/20"
                          }`}
                        >
                          <input
                            id={`cell_${rowIdx}_${tpList.length + 1}`}
                            type="number"
                            min={0}
                            max={100}
                            placeholder="-"
                            value={
                              stats.record.finalSummative !== undefined
                                ? stats.record.finalSummative
                                : ""
                            }
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, tpList.length + 1)}
                            onPaste={(e) => handleCellPaste(e, rowIdx, tpList.length + 1)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              handleScoreChange(
                                student.id,
                                "final",
                                null,
                                raw === "" ? undefined : parseInt(raw, 10)
                              );
                            }}
                            className={`w-full h-10 text-center font-mono font-bold text-xs bg-transparent border-0 outline-none focus:ring-2 focus:ring-purple-500 focus:bg-purple-100/60 transition-all ${
                              stats.record.finalSummative !== undefined &&
                              stats.record.finalSummative < kkmValue
                                ? "text-rose-600 font-extrabold"
                                : "text-purple-950 font-extrabold"
                            }`}
                          />
                        </td>

                        {/* Nilai Akhir (NA) */}
                        <td className="px-2 py-2 text-center font-mono font-black text-sm border-r border-slate-200 bg-emerald-100/60 text-emerald-950">
                          {stats.finalScore > 0 ? stats.finalScore : "-"}
                        </td>

                        {/* Predikat & Status */}
                        <td className="px-3 py-2 text-center">
                          {stats.finalScore > 0 ? (
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                stats.finalScore >= kkmValue
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {stats.predicate} • {stats.finalScore >= kkmValue ? "Tuntas" : "Remedial"}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer: Class Summary Stats */}
              <tfoot className="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300 text-xs select-none">
                {/* Row 1: Rata-Rata Kelas */}
                <tr>
                  <td colSpan={2} className="px-4 py-2 text-right uppercase tracking-wider text-[11px] text-slate-600 border-r border-slate-300">
                    Rata-Rata Kelas:
                  </td>
                  {tpList.map((t) => (
                    <td
                      key={t.code}
                      className="px-2 py-2 text-center font-mono font-bold border-r border-slate-300 bg-emerald-50/50 text-emerald-900"
                    >
                      {columnStats[t.code]?.avg || "-"}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-mono font-bold border-r border-slate-300 text-emerald-900">
                    {columnStats["na"]?.avg || "-"}
                  </td>
                  <td className="px-2 py-2 text-center font-mono font-bold border-r border-slate-300 bg-amber-50/60 text-amber-950">
                    {columnStats["mid"]?.avg || "-"}
                  </td>
                  <td className="px-2 py-2 text-center font-mono font-bold border-r border-slate-300 bg-purple-50/60 text-purple-950">
                    {columnStats["final"]?.avg || "-"}
                  </td>
                  <td className="px-2 py-2 text-center font-mono font-extrabold border-r border-slate-300 bg-emerald-200/60 text-emerald-950">
                    {columnStats["na"]?.avg || "-"}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-500 text-[11px]">
                    KKM: {kkmValue}
                  </td>
                </tr>

                {/* Row 2: Ketuntasan Kelas */}
                <tr className="border-t border-slate-200">
                  <td colSpan={2} className="px-4 py-1.5 text-right uppercase tracking-wider text-[10px] text-slate-500 border-r border-slate-300">
                    Ketuntasan (≥ KKM):
                  </td>
                  {tpList.map((t) => (
                    <td
                      key={t.code}
                      className="px-1 py-1.5 text-center font-mono text-[11px] border-r border-slate-300 text-emerald-700"
                    >
                      {columnStats[t.code]?.passRate ? `${columnStats[t.code].passRate}%` : "-"}
                    </td>
                  ))}
                  <td className="px-1 py-1.5 text-center font-mono text-[11px] border-r border-slate-300 text-slate-400">
                    -
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono text-[11px] border-r border-slate-300 text-amber-800">
                    {columnStats["mid"]?.passRate ? `${columnStats["mid"].passRate}%` : "-"}
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono text-[11px] border-r border-slate-300 text-purple-800">
                    {columnStats["final"]?.passRate ? `${columnStats["final"].passRate}%` : "-"}
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono text-[11px] border-r border-slate-300 font-extrabold text-emerald-900">
                    {columnStats["na"]?.passRate ? `${columnStats["na"].passRate}%` : "-"}
                  </td>
                  <td className="px-2 py-1.5 text-center text-[10px] font-normal text-slate-500">
                    {columnStats["na"]?.passCount || 0} / {students.length} Siswa Tuntas
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INLINE & MASS INPUT PENILAIAN HARIAN (FORMATIF)                     */}
      {/* ========================================================================= */}
      {activeTab === "daily_input" && (
        <div className="space-y-4">
          {/* Top Selection & Action Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Tabel Entri Penilaian Harian / Formatif ({selectedSubject})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih Tujuan Pembelajaran (TP) dan tanggal penilaian, lalu isi nilai siswa langsung pada tabel di bawah ini.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newScores: Record<string, number> = {};
                    students.forEach((s) => (newScores[s.id] = 85));
                    setInlineDailyScores(newScores);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  ⚡ Isi Semua 85
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newScores: Record<string, number> = {};
                    students.forEach((s) => (newScores[s.id] = kkmValue));
                    setInlineDailyScores(newScores);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Tandai KKM ({kkmValue}) Semua
                </button>
                <button
                  type="button"
                  onClick={handleSaveInlineDaily}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Simpan Penilaian Harian
                </button>
              </div>
            </div>

            {/* Selection Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-800 mb-1">
                  Pilih Tujuan Pembelajaran (TP):
                </label>
                <select
                  value={selectedDailyTP}
                  onChange={(e) => handleSelectDailyTPChange(e.target.value)}
                  className="w-full p-2.5 border border-emerald-300 rounded-xl bg-emerald-50/50 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {tpList.map((t) => (
                    <option key={t.code} value={t.code}>
                      [{t.code}] - {t.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Tanggal Penilaian:</label>
                <input
                  type="date"
                  value={dailyAssessmentDate}
                  onChange={(e) => setDailyAssessmentDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono font-semibold bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Inline Table of Students for Selected TP */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800">
                Daftar Nilai Siswa untuk [{selectedDailyTP}] ({dailyAssessmentDate})
              </span>
              <span className="text-xs text-slate-500">
                Total {students.length} Siswa Terdaftar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-3 py-2.5 text-center w-12 border-r border-slate-200">No</th>
                    <th className="px-4 py-2.5 w-32 border-r border-slate-200">NIS / NISN</th>
                    <th className="px-4 py-2.5 border-r border-slate-200">Nama Siswa</th>
                    <th className="px-4 py-2.5 text-center w-36 border-r border-slate-200">
                      Nilai Formatif (0 - 100)
                    </th>
                    <th className="px-4 py-2.5 text-center w-28">Status KKM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((student, idx) => {
                    const currentScore = inlineDailyScores[student.id];
                    const hasVal = typeof currentScore === "number" && !isNaN(currentScore);
                    const isPass = hasVal && currentScore >= kkmValue;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-center text-slate-400 font-mono border-r border-slate-100">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2 font-mono text-slate-500 border-r border-slate-100">
                          {student.nis || student.nisn || "-"}
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-900 border-r border-slate-100">
                          {student.name}
                        </td>
                        <td className="px-4 py-1.5 text-center border-r border-slate-100">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="0"
                            value={hasVal ? currentScore : ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const num = parseInt(e.target.value, 10);
                              setInlineDailyScores((prev) => ({
                                ...prev,
                                [student.id]: isNaN(num) ? 0 : Math.min(100, Math.max(0, num)),
                              }));
                            }}
                            className={`w-24 p-1.5 border rounded-xl text-center font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500 outline-none ${
                              isPass
                                ? "border-emerald-300 text-emerald-800 bg-emerald-50/50"
                                : hasVal
                                ? "border-rose-300 text-rose-800 bg-rose-50/50"
                                : "border-slate-300 bg-white"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          {hasVal ? (
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                isPass
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {isPass ? "Tuntas" : "Remedial"}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-mono">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={handleSaveInlineDaily}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Simpan Penilaian Harian & Sinkronkan
              </button>
            </div>
          </div>

          {/* Historical Daily Entries List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Riwayat Penilaian Harian Tersimpan ({selectedSubject})
            </h4>

            {dailyGrades.filter((g) => g.subject === selectedSubject).length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada riwayat penilaian harian khusus untuk mapel ini. Pilih TP di atas dan simpan nilai siswa!
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
                      <th className="px-3 py-2 text-center w-36">Aksi</th>
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
                          <td className="px-3 py-2 text-center font-mono font-extrabold text-emerald-700">
                            {avg}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditDailyGroupInline(tpCode, dateStr, type)}
                                className="px-2.5 py-1 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Buka & Edit Nilai di Tabel"
                              >
                                <Edit2 className="w-3 h-3 text-emerald-600" />
                                Edit di Tabel
                              </button>
                              <button
                                onClick={() => handleDeleteDailyGroup(tpCode, dateStr, type)}
                                className="px-2 py-1 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
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

      {/* ========================================================================= */}
      {/* TAB 3: REKAP LEGER & DESKRIPSI RAPORT                                     */}
      {/* ========================================================================= */}
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
                  <th className="px-3 py-3 text-center w-24 text-emerald-800 bg-emerald-50/50">
                    TP Tertinggi
                  </th>
                  <th className="px-3 py-3 text-center w-24 text-red-800 bg-red-50/50">
                    TP Terendah
                  </th>
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

      {/* ========================================================================= */}
      {/* TAB 4: DASHBOARD KETUNTASAN & REMEDIAL                                     */}
      {/* ========================================================================= */}
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

      {/* MODAL: TEMPEL DARI EXCEL */}
      <ExcelPasteModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        students={filteredStudents}
        tpList={tpList}
        onApplyGrades={handleApplyExcelGrades}
      />

      {/* MODAL: ISI CEPAT KOLOM */}
      <QuickFillModal
        isOpen={isQuickFillOpen}
        onClose={() => setIsQuickFillOpen(false)}
        tpList={tpList}
        kkmValue={kkmValue}
        onApplyFill={handleApplyQuickFill}
      />
    </div>
  );
};
