import React, { useState } from "react";
import { Student, AttendanceRecord, AttendanceStatus, SchoolIdentity } from "../../types";
import {
  UserCheck,
  Calendar,
  CheckCircle2,
  Save,
  Printer,
  Download,
  Filter,
  Search,
  FileText,
  Edit3,
  Trash2,
  Plus,
  AlertCircle,
  Table,
  History,
  X,
  Check,
} from "lucide-react";
import { exportToCSV } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";
import {
  exportAttendanceToExcel,
  exportMonthlyMatrixToExcel,
} from "../../lib/exportExcel";

interface BulkAttendanceViewProps {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  onSaveAttendance: (updatedRecords: AttendanceRecord[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
  schoolIdentity?: SchoolIdentity;
}

export const BulkAttendanceView: React.FC<BulkAttendanceViewProps> = ({
  students,
  attendanceRecords,
  onSaveAttendance,
  onOpenPrint,
  schoolIdentity,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  // Derive Academic Year from school identity
  const academicYear = schoolIdentity?.academicYear || "2025/2026";
  const startYear = parseInt(academicYear.split(/[\/\-]/)[0] || "2025", 10);
  const endYear = startYear + 1;

  // Local state for bulk entry on selected date
  const [dailyStatusMap, setDailyStatusMap] = useState<
    Record<string, { status: AttendanceStatus; reason: string }>
  >(() => {
    const map: Record<string, { status: AttendanceStatus; reason: string }> = {};
    const existing = attendanceRecords.filter((r) => r.date === selectedDate);
    students.forEach((s) => {
      const rec = existing.find((r) => r.studentId === s.id);
      map[s.id] = {
        status: rec ? rec.status : "H",
        reason: rec ? rec.reason || "" : "",
      };
    });
    return map;
  });

  const [activeTab, setActiveTab] = useState<"input" | "history" | "matrix" | "rekap">("input");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("all");
  const [selectedMatrixMonth, setSelectedMatrixMonth] = useState<string>(
    `${startYear}-07`
  );
  const [savedAlert, setSavedAlert] = useState<string | boolean>(false);

  // Search & Filters for History tab
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("all");
  const [historyDateFilter, setHistoryDateFilter] = useState<string>("all");

  // Editing single record inline state in History Tab
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>("H");
  const [editReason, setEditReason] = useState<string>("");

  // Cell edit popover for Monthly Matrix
  const [matrixCellEdit, setMatrixCellEdit] = useState<{
    studentId: string;
    studentName: string;
    dateStr: string;
    dayNum: number;
    currentStatus: AttendanceStatus | "-";
    currentReason: string;
  } | null>(null);

  // Month options dropdown helper dynamically derived from academic year
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
    if (found) return found.label;
    const [yyyy, mm] = val.split("-");
    return `Bulan ${mm}/${yyyy}`;
  };

  // Handle date change for daily input
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    const map: Record<string, { status: AttendanceStatus; reason: string }> = {};
    const existing = attendanceRecords.filter((r) => r.date === newDate);
    students.forEach((s) => {
      const rec = existing.find((r) => r.studentId === s.id);
      map[s.id] = {
        status: rec ? rec.status : "H",
        reason: rec ? rec.reason || "" : "",
      };
    });
    setDailyStatusMap(map);
  };

  const handleMarkAllHadir = () => {
    const updatedMap: Record<string, { status: AttendanceStatus; reason: string }> = {};
    students.forEach((id) => {
      updatedMap[id.id] = { status: "H", reason: "" };
    });
    setDailyStatusMap(updatedMap);

    // Auto-save to parent attendanceRecords immediately!
    const otherRecords = attendanceRecords.filter((r) => r.date !== selectedDate);
    const newRecordsForDate: AttendanceRecord[] = students.map((s) => ({
      id: `att_${selectedDate}_${s.id}`,
      date: selectedDate,
      studentId: s.id,
      status: "H" as AttendanceStatus,
      reason: "",
    }));
    onSaveAttendance([...otherRecords, ...newRecordsForDate]);
    setSavedAlert(`Semua siswa berhasil ditandai HADIR & tersimpan otomatis!`);
    setTimeout(() => setSavedAlert(false), 2000);
  };

  const handleStatusChange = (
    studentId: string,
    status: AttendanceStatus,
    reason: string = ""
  ) => {
    const updatedMap = {
      ...dailyStatusMap,
      [studentId]: { status, reason },
    };
    setDailyStatusMap(updatedMap);

    // Auto-save to parent attendanceRecords immediately!
    const otherRecords = attendanceRecords.filter((r) => r.date !== selectedDate);
    const newRecordsForDate: AttendanceRecord[] = [];
    Object.entries(updatedMap).forEach(([sId, data]: [string, { status: AttendanceStatus; reason: string }]) => {
      newRecordsForDate.push({
        id: `att_${selectedDate}_${sId}`,
        date: selectedDate,
        studentId: sId,
        status: data.status,
        reason: data.reason,
      });
    });
    onSaveAttendance([...otherRecords, ...newRecordsForDate]);
  };

  const handleSaveDailyAttendance = () => {
    const otherRecords = attendanceRecords.filter((r) => r.date !== selectedDate);
    const newRecordsForDate: AttendanceRecord[] = [];

    Object.entries(dailyStatusMap).forEach(([studentId, data]: [string, { status: AttendanceStatus; reason: string }]) => {
      newRecordsForDate.push({
        id: `att_${selectedDate}_${studentId}`,
        date: selectedDate,
        studentId,
        status: data.status,
        reason: data.reason,
      });
    });

    onSaveAttendance([...otherRecords, ...newRecordsForDate]);
    setSavedAlert(`Data presensi tanggal ${selectedDate} berhasil disimpan!`);
    setTimeout(() => setSavedAlert(false), 2500);
  };

  // History & Edit Actions
  const handleStartInlineEdit = (rec: AttendanceRecord) => {
    setEditingRecordId(rec.id);
    setEditStatus(rec.status);
    setEditReason(rec.reason || "");
  };

  const handleSaveInlineEdit = (recId: string) => {
    const updatedRecords = attendanceRecords.map((r) => {
      if (r.id === recId) {
        return { ...r, status: editStatus, reason: editReason };
      }
      return r;
    });
    onSaveAttendance(updatedRecords);
    setEditingRecordId(null);
    setSavedAlert("Catatan presensi berhasil diperbarui!");
    setTimeout(() => setSavedAlert(false), 2500);
  };

  const handleDeleteRecord = (recId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus catatan presensi ini?")) {
      const updated = attendanceRecords.filter((r) => r.id !== recId);
      onSaveAttendance(updated);
      setSavedAlert("Catatan presensi berhasil dihapus.");
      setTimeout(() => setSavedAlert(false), 2500);
    }
  };

  const handleDeleteDateRecords = (dateStr: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus SELURUH data presensi tanggal ${dateStr}?`)) {
      const updated = attendanceRecords.filter((r) => r.date !== dateStr);
      onSaveAttendance(updated);
      setSavedAlert(`Seluruh presensi tanggal ${dateStr} berhasil dihapus.`);
      setTimeout(() => setSavedAlert(false), 2500);
    }
  };

  const handleLoadDateToEditor = (dateStr: string) => {
    handleDateChange(dateStr);
    setActiveTab("input");
  };

  // Matrix cell quick edit save
  const handleSaveMatrixCell = (
    studentId: string,
    dateStr: string,
    status: AttendanceStatus,
    reason: string
  ) => {
    const existingIdx = attendanceRecords.findIndex(
      (r) => r.studentId === studentId && r.date === dateStr
    );

    let updatedRecords = [...attendanceRecords];
    if (existingIdx >= 0) {
      updatedRecords[existingIdx] = {
        ...updatedRecords[existingIdx],
        status,
        reason,
      };
    } else {
      updatedRecords.push({
        id: `att_${dateStr}_${studentId}`,
        date: dateStr,
        studentId,
        status,
        reason,
      });
    }

    onSaveAttendance(updatedRecords);
    setMatrixCellEdit(null);
    setSavedAlert(`Presensi tanggal ${dateStr} diperbarui!`);
    setTimeout(() => setSavedAlert(false), 2500);
  };

  // List of unique recorded dates
  const uniqueRecordedDates: string[] = (
    Array.from(new Set(attendanceRecords.map((r) => r.date))) as string[]
  ).sort((a, b) => (b || "").localeCompare(a || ""));

  // Helper stats for student in Rekap Log tab
  const getFormattedDateReasonLog = (studentId: string): string[] => {
    return attendanceRecords
      .filter((r) => {
        if (r.studentId !== studentId) return false;
        if (r.status === "H") return false;
        if (selectedMonthFilter !== "all") {
          return (r.date || "").startsWith(selectedMonthFilter);
        }
        return true;
      })
      .map((r) => {
        const [yyyy, mm, dd] = (r.date || "").split("-");
        const dayFormatted = parseInt(dd || "0", 10);
        const monthFormatted = parseInt(mm || "0", 10);
        const code = r.status;
        const reasonStr = r.reason ? ` (${r.reason})` : "";
        return `${dayFormatted}/${monthFormatted} -- ${code}${reasonStr}`;
      });
  };

  const getStudentStats = (studentId: string) => {
    const filtered = attendanceRecords.filter((r) => {
      if (r.studentId !== studentId) return false;
      if (selectedMonthFilter !== "all") return (r.date || "").startsWith(selectedMonthFilter);
      return true;
    });
    return {
      H: filtered.filter((r) => r.status === "H").length,
      S: filtered.filter((r) => r.status === "S").length,
      I: filtered.filter((r) => r.status === "I").length,
      A: filtered.filter((r) => r.status === "A").length,
    };
  };

  // Exports for Rekap Log tab
  const handleExportRekapCSV = () => {
    const headers = ["No", "NIS", "Nama Siswa", "Sakit (S)", "Izin (I)", "Alpa (A)", "Log Tanggal & Penyebab Absen"];
    const rows = students.map((s, idx) => {
      const stats = getStudentStats(s.id);
      const logs = getFormattedDateReasonLog(s.id).join(" ; ");
      return [idx + 1, s.nis, s.name, stats.S, stats.I, stats.A, logs || "Hadir Penuh"];
    });
    exportToCSV(headers, rows, "Rekap_Presensi_Murid");
  };

  const handleExportRekapDoc = () => {
    const tableHtml = `
      <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:10pt;">
        <thead>
          <tr style="background-color:#f3f4f6; font-weight:bold;">
            <th style="border:1px solid #333; padding:5px; text-align:center;">No</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Nama Siswa</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">S</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">I</th>
            <th style="border:1px solid #333; padding:5px; text-align:center;">A</th>
            <th style="border:1px solid #333; padding:5px; text-align:left;">Tanggal & Penyebab Absen</th>
          </tr>
        </thead>
        <tbody>
          ${students
            .map((s, idx) => {
              const stats = getStudentStats(s.id);
              const logs = getFormattedDateReasonLog(s.id).join(", ");
              return `
            <tr>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${idx + 1}</td>
              <td style="border:1px solid #333; padding:5px;">${s.name}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${stats.S || "-"}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${stats.I || "-"}</td>
              <td style="border:1px solid #333; padding:5px; text-align:center;">${stats.A || "-"}</td>
              <td style="border:1px solid #333; padding:5px;">${logs || "Hadir Penuh"}</td>
            </tr>
          `;
            })
            .join("")}
        </tbody>
      </table>
    `;

    exportHtmlToDoc({
      htmlContent: tableHtml,
      filename: "Rekap_Presensi_Murid.doc",
      title: "REKAPITULASI PRESENSI KEHADIRAN SISWA",
    });
  };

  const handlePrintRekap = () => {
    onOpenPrint(
      "REKAPITULASI PRESENSI KEHADIRAN SISWA",
      `Format Keterangan: Tanggal (dd/m -- S/I/A) & Cause Log`,
      (
        <table className="w-full border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100 font-bold text-slate-800">
              <th className="border border-slate-300 p-2 text-center w-10">No</th>
              <th className="border border-slate-300 p-2 text-left">Nama Siswa</th>
              <th className="border border-slate-300 p-2 text-center w-12">S</th>
              <th className="border border-slate-300 p-2 text-center w-12">I</th>
              <th className="border border-slate-300 p-2 text-center w-12">A</th>
              <th className="border border-slate-300 p-2 text-left">Tanggal & Penyebab Absen</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, idx) => {
              const stats = getStudentStats(s.id);
              const logs = getFormattedDateReasonLog(s.id);
              return (
                <tr key={s.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                  <td className="border border-slate-300 p-2 font-medium">{s.name}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-amber-700">{stats.S || "-"}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-blue-700">{stats.I || "-"}</td>
                  <td className="border border-slate-300 p-2 text-center font-bold text-red-700">{stats.A || "-"}</td>
                  <td className="border border-slate-300 p-2 font-mono text-[11px]">
                    {logs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {logs.map((log, i) => (
                          <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {log}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Hadir Penuh</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )
    );
  };

  // Matrix Export & Print Handlers
  const handleExportMatrixExcel = () => {
    exportMonthlyMatrixToExcel(
      students,
      attendanceRecords,
      selectedMatrixMonth,
      getMonthLabel(selectedMatrixMonth)
    );
  };

  const handleExportMatrixDoc = () => {
    const [yStr, mStr] = selectedMatrixMonth.split("-");
    const year = parseInt(yStr || "2025", 10);
    const month = parseInt(mStr || "7", 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const label = getMonthLabel(selectedMatrixMonth);

    const tableHtml = `
      <h3 style="text-align:center; font-size:12pt; font-weight:bold; margin-bottom:10px;">
        REKAPITULASI PRESENSI SISWA BULAN ${label.toUpperCase()}
      </h3>
      <table border="1" cellpadding="3" cellspacing="0" style="width:100%; border-collapse:collapse; font-size:8pt; text-align:center;">
        <thead>
          <tr style="background-color:#f1f5f9; font-weight:bold;">
            <th rowspan="2" style="border:1px solid #333; padding:4px;">No</th>
            <th rowspan="2" style="border:1px solid #333; padding:4px;">NIS</th>
            <th rowspan="2" style="border:1px solid #333; padding:4px; text-align:left;">Nama Siswa</th>
            <th colspan="31" style="border:1px solid #333; padding:4px;">Tanggal (1 - 31)</th>
            <th colspan="3" style="border:1px solid #333; padding:4px;">Total</th>
          </tr>
          <tr style="background-color:#e2e8f0; font-weight:bold;">
            ${Array.from({ length: 31 }, (_, i) => i + 1)
              .map((d) => `<th style="border:1px solid #333; width:18px;">${d}</th>`)
              .join("")}
            <th style="border:1px solid #333; width:22px; color:#b45309;">S</th>
            <th style="border:1px solid #333; width:22px; color:#1d4ed8;">I</th>
            <th style="border:1px solid #333; width:22px; color:#b91c1c;">A</th>
          </tr>
        </thead>
        <tbody>
          ${students
            .map((s, idx) => {
              let sCount = 0, iCount = 0, aCount = 0;
              const cells = Array.from({ length: 31 }, (_, i) => {
                const day = i + 1;
                if (day > daysInMonth) return `<td style="border:1px solid #333; background-color:#f8fafc; color:#cbd5e1;">-</td>`;
                const dayPad = day < 10 ? `0${day}` : `${day}`;
                const dateKey = `${selectedMatrixMonth}-${dayPad}`;
                const rec = attendanceRecords.find((r) => r.studentId === s.id && r.date === dateKey);
                if (!rec) return `<td style="border:1px solid #333;">-</td>`;
                if (rec.status === "S") sCount++;
                if (rec.status === "I") iCount++;
                if (rec.status === "A") aCount++;
                const color = rec.status === "S" ? "color:#b45309;font-weight:bold;" : rec.status === "I" ? "color:#1d4ed8;font-weight:bold;" : rec.status === "A" ? "color:#b91c1c;font-weight:bold;" : "color:#166534;";
                return `<td style="border:1px solid #333; ${color}">${rec.status}</td>`;
              }).join("");

              return `
                <tr>
                  <td style="border:1px solid #333; text-align:center;">${idx + 1}</td>
                  <td style="border:1px solid #333; text-align:center;">${s.nis || "-"}</td>
                  <td style="border:1px solid #333; text-align:left; font-weight:bold;">${s.name}</td>
                  ${cells}
                  <td style="border:1px solid #333; font-weight:bold; color:#b45309;">${sCount || "-"}</td>
                  <td style="border:1px solid #333; font-weight:bold; color:#1d4ed8;">${iCount || "-"}</td>
                  <td style="border:1px solid #333; font-weight:bold; color:#b91c1c;">${aCount || "-"}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;

    exportHtmlToDoc({
      htmlContent: tableHtml,
      filename: `Rekap_Presensi_Matriks_${label.replace(/\s+/g, "_")}.doc`,
      title: `REKAPITULASI PRESENSI SISWA - BULAN ${label.toUpperCase()}`,
    });
  };

  const handlePrintMatrix = () => {
    const [yStr, mStr] = selectedMatrixMonth.split("-");
    const year = parseInt(yStr || "2025", 10);
    const month = parseInt(mStr || "7", 10);
    const daysInMonth = new Date(year, month, 0).getDate();
    const label = getMonthLabel(selectedMatrixMonth);

    onOpenPrint(
      `REKAPITULASI PRESENSI MATRIKS BULAN ${label.toUpperCase()}`,
      `Daftar Kehadiran Murid Tanggal 1 s.d. 31 (Sakit / Izin / Alpa / Hadir)`,
      (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-400 text-[10px] text-center">
            <thead>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <th rowSpan={2} className="border border-slate-400 p-1 w-8">No</th>
                <th rowSpan={2} className="border border-slate-400 p-1 w-16">NIS</th>
                <th rowSpan={2} className="border border-slate-400 p-1 text-left">Nama Siswa</th>
                <th colSpan={31} className="border border-slate-400 p-1">Tanggal (1 - 31)</th>
                <th colSpan={3} className="border border-slate-400 p-1">Total</th>
              </tr>
              <tr className="bg-slate-200 font-bold text-slate-900">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <th key={d} className="border border-slate-400 p-0.5 w-5 text-[9px]">{d}</th>
                ))}
                <th className="border border-slate-400 p-1 w-6 text-amber-800">S</th>
                <th className="border border-slate-400 p-1 w-6 text-blue-800">I</th>
                <th className="border border-slate-400 p-1 w-6 text-red-800">A</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                let sCount = 0, iCount = 0, aCount = 0;
                return (
                  <tr key={s.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border border-slate-400 p-1">{idx + 1}</td>
                    <td className="border border-slate-400 p-1 font-mono">{s.nis}</td>
                    <td className="border border-slate-400 p-1 text-left font-semibold">{s.name}</td>
                    {Array.from({ length: 31 }, (_, i) => {
                      const day = i + 1;
                      if (day > daysInMonth) return <td key={day} className="border border-slate-400 p-0.5 bg-slate-100 text-slate-300">-</td>;
                      const dayPad = day < 10 ? `0${day}` : `${day}`;
                      const dateKey = `${selectedMatrixMonth}-${dayPad}`;
                      const rec = attendanceRecords.find((r) => r.studentId === s.id && r.date === dateKey);

                      if (!rec) return <td key={day} className="border border-slate-400 p-0.5 text-slate-300">-</td>;
                      if (rec.status === "S") sCount++;
                      if (rec.status === "I") iCount++;
                      if (rec.status === "A") aCount++;

                      return (
                        <td
                          key={day}
                          className={`border border-slate-400 p-0.5 font-bold ${
                            rec.status === "S" ? "text-amber-700 bg-amber-50" : rec.status === "I" ? "text-blue-700 bg-blue-50" : rec.status === "A" ? "text-red-700 bg-red-50" : "text-emerald-700"
                          }`}
                        >
                          {rec.status}
                        </td>
                      );
                    })}
                    <td className="border border-slate-400 p-1 font-bold text-amber-800">{sCount || "-"}</td>
                    <td className="border border-slate-400 p-1 font-bold text-blue-800">{iCount || "-"}</td>
                    <td className="border border-slate-400 p-1 font-bold text-red-800">{aCount || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )
    );
  };

  // Filtered history records
  const filteredHistoryRecords = attendanceRecords.filter((r) => {
    const student = students.find((s) => s.id === r.studentId);
    const searchMatch =
      !historySearchQuery ||
      (student?.name || "").toLowerCase().includes(historySearchQuery.toLowerCase()) ||
      (student?.nis || "").includes(historySearchQuery) ||
      (r.date || "").includes(historySearchQuery);

    const statusMatch =
      historyStatusFilter === "all" || r.status === historyStatusFilter;

    const dateMatch =
      historyDateFilter === "all" || r.date === historyDateFilter;

    return searchMatch && statusMatch && dateMatch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Tabs Navigation */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600" />
            Sistem Absensi & Rekap Kehadiran Murid
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Input presensi massal, kelola riwayat & edit data absen, serta rekapitulasi matriks bulanan tanggal 1-31.
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("input")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "input"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            Input Absen Bulk
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "history"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            Riwayat & Edit Absen
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "matrix"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Table className="w-3.5 h-3.5 text-indigo-600" />
            Rekap Matriks Bulanan (1-31)
          </button>

          <button
            onClick={() => setActiveTab("rekap")}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "rekap"
                ? "bg-white text-emerald-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            Rekap Detail & Log
          </button>
        </div>
      </div>

      {savedAlert && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{savedAlert}</span>
        </div>
      )}

      {/* TAB 1: INPUT ABSEN BULK */}
      {activeTab === "input" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <div>
                <label className="block text-xs font-bold text-slate-700">Tanggal Presensi</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleMarkAllHadir}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-colors"
              >
                ⚡ Tandai Hadir Semua
              </button>
              <button
                type="button"
                onClick={handleSaveDailyAttendance}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Simpan Presensi Hari Ini
              </button>
            </div>
          </div>

          {/* Bulk Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">Nama Lengkap Murid</th>
                    <th className="px-4 py-3 text-center">Status Kehadiran</th>
                    <th className="px-4 py-3">Penyebab / Alasan Absen (Jika S/I/A)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s, idx) => {
                    const current = dailyStatusMap[s.id] || { status: "H", reason: "" };
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{s.nis}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center space-x-1.5">
                            {[
                              { code: "H" as AttendanceStatus, label: "Hadir", color: "bg-emerald-600 text-white" },
                              { code: "S" as AttendanceStatus, label: "Sakit", color: "bg-amber-600 text-white" },
                              { code: "I" as AttendanceStatus, label: "Izin", color: "bg-blue-600 text-white" },
                              { code: "A" as AttendanceStatus, label: "Alpa", color: "bg-red-600 text-white" },
                            ].map((item) => {
                              const selected = current.status === item.code;
                              return (
                                <button
                                  key={item.code}
                                  type="button"
                                  onClick={() => handleStatusChange(s.id, item.code, current.reason)}
                                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                                    selected
                                      ? `${item.color} ring-2 ring-slate-400/40 shadow-xs`
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  }`}
                                >
                                  {item.code}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={current.reason}
                            disabled={current.status === "H"}
                            onChange={(e) => handleStatusChange(s.id, current.status, e.target.value)}
                            placeholder={
                              current.status === "H"
                                ? "Siswa hadir"
                                : "Contoh: Demam, Acara keluarga..."
                            }
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RIWAYAT & EDIT ABSEN */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama murid, NIS, atau tanggal..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl w-60 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <span>Filter Status:</span>
                <select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="all">Semua Status (H/S/I/A)</option>
                  <option value="H">Hadir (H)</option>
                  <option value="S">Sakit (S)</option>
                  <option value="I">Izin (I)</option>
                  <option value="A">Alpa (A)</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span>Filter Tanggal:</span>
                <select
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-xl bg-white max-w-[180px]"
                >
                  <option value="all">Semua Tanggal</option>
                  {uniqueRecordedDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">
                Total Entri: <b>{filteredHistoryRecords.length}</b>
              </span>
            </div>
          </div>

          {/* Section: Distinct Date Folders / Quick Date Loaders */}
          {uniqueRecordedDates.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Daftar Tanggal Presensi Tersimpan ({uniqueRecordedDates.length} Hari)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {uniqueRecordedDates.map((dateStr: string) => {
                  const dateRecs = attendanceRecords.filter((r) => r.date === dateStr);
                  const hCount = dateRecs.filter((r) => r.status === "H").length;
                  const sCount = dateRecs.filter((r) => r.status === "S").length;
                  const iCount = dateRecs.filter((r) => r.status === "I").length;
                  const aCount = dateRecs.filter((r) => r.status === "A").length;

                  return (
                    <div
                      key={dateStr}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between space-y-2 hover:border-emerald-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-extrabold text-xs text-slate-900">
                          {dateStr}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          {dateRecs.length} murid
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          H: {hCount}
                        </span>
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">
                          S: {sCount}
                        </span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                          I: {iCount}
                        </span>
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-800 rounded">
                          A: {aCount}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                        <button
                          onClick={() => handleLoadDateToEditor(dateStr)}
                          className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          title="Buka seluruh presensi hari ini di editor"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit Tanggal Ini
                        </button>
                        <button
                          onClick={() => handleDeleteDateRecords(dateStr)}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-800 p-1"
                          title="Hapus presensi tanggal ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table: Detailed History Records with Edit & Delete */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                Rincian Riwayat Absensi Siswa & Edit Langsung
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">Nama Lengkap Murid</th>
                    <th className="px-4 py-3 text-center">Status Kehadiran</th>
                    <th className="px-4 py-3">Alasan / Keterangan</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistoryRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 italic text-xs">
                        Tidak ada riwayat presensi yang sesuai dengan kriteria pencarian/filter.
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryRecords.map((r, idx) => {
                      const student = students.find((s) => s.id === r.studentId);
                      const isEditing = editingRecordId === r.id;

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800">{r.date}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{student?.nis || "-"}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{student?.name || `ID: ${r.studentId}`}</td>
                          <td className="px-4 py-3 text-center">
                            {isEditing ? (
                              <div className="flex justify-center space-x-1">
                                {(["H", "S", "I", "A"] as AttendanceStatus[]).map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => setEditStatus(st)}
                                    className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                      editStatus === st
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {st}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] inline-block ${
                                  r.status === "H"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : r.status === "S"
                                    ? "bg-amber-100 text-amber-800"
                                    : r.status === "I"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {r.status === "H"
                                  ? "Hadir (H)"
                                  : r.status === "S"
                                  ? "Sakit (S)"
                                  : r.status === "I"
                                  ? "Izin (I)"
                                  : "Alpa (A)"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                placeholder="Keterangan..."
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                              />
                            ) : (
                              <span className="text-slate-600">{r.reason || "-"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={() => handleSaveInlineEdit(r.id)}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[11px] hover:bg-emerald-700"
                                >
                                  Simpan
                                </button>
                                <button
                                  onClick={() => setEditingRecordId(null)}
                                  className="px-2 py-1 bg-slate-200 text-slate-700 rounded font-bold text-[11px]"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleStartInlineEdit(r)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit entri absen ini"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(r.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Hapus entri ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REKAP MATRIKS BULANAN (TANGGAL 1 - 31) */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          {/* Controls Bar for Matrix */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Table className="w-5 h-5 text-indigo-600" />
              <div>
                <label className="block text-xs font-bold text-slate-700">Pilih Bulan & Tahun Presensi:</label>
                <select
                  value={selectedMatrixMonth}
                  onChange={(e) => setSelectedMatrixMonth(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {availableMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportMatrixExcel}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                title="Ekspor Matriks Bulanan ke Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-100" />
                Ekspor Excel (.xlsx)
              </button>
              <button
                onClick={handleExportMatrixDoc}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                title="Simpan Matriks ke Word (.doc)"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Simpan Word (.doc)
              </button>
              <button
                onClick={handlePrintMatrix}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                title="Cetak Laporan Matriks Bulanan"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak / PDF
              </button>
            </div>
          </div>

          {/* Quick Legend & Help */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
            <span className="font-bold text-slate-700">
              Keterangan Kode Absen Matriks Tanggal 1 s.d. 31 ({getMonthLabel(selectedMatrixMonth)}):
            </span>
            <div className="flex flex-wrap items-center gap-2 font-semibold">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded">
                <b>H</b> = Hadir
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded">
                <b>S</b> = Sakit
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded">
                <b>I</b> = Izin
              </span>
              <span className="px-2 py-0.5 bg-red-100 text-red-900 border border-red-300 rounded">
                <b>A</b> = Alpa
              </span>
              <span className="text-slate-400 italic">
                * Klik sel mana saja untuk mengubah status/alasan presensi secara cepat.
              </span>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs text-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800 text-[11px]">
                    <th rowSpan={2} className="px-2 py-2 border-r border-slate-200 w-10">No</th>
                    <th rowSpan={2} className="px-2 py-2 border-r border-slate-200 w-16">NIS</th>
                    <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-left min-w-[150px]">Nama Siswa</th>
                    <th colSpan={31} className="px-2 py-1 border-b border-r border-slate-200 bg-slate-200/80 uppercase tracking-wider text-[10px]">
                      Rekapitulasi Kehadiran Tanggal 1 s.d. 31 ({getMonthLabel(selectedMatrixMonth)})
                    </th>
                    <th colSpan={3} className="px-2 py-1 border-b border-slate-200 bg-slate-200/80 text-[10px]">Total</th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <th key={d} className="p-1 border-r border-slate-200 w-6 min-w-[22px]">
                        {d}
                      </th>
                    ))}
                    <th className="p-1 border-r border-slate-200 w-7 text-amber-800 bg-amber-50">S</th>
                    <th className="p-1 border-r border-slate-200 w-7 text-blue-800 bg-blue-50">I</th>
                    <th className="p-1 w-7 text-red-800 bg-red-50">A</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const [yStr, mStr] = selectedMatrixMonth.split("-");
                    const year = parseInt(yStr || "2025", 10);
                    const month = parseInt(mStr || "7", 10);
                    const daysInMonth = new Date(year, month, 0).getDate();

                    return students.map((s, idx) => {
                      let sCount = 0, iCount = 0, aCount = 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-1.5 border-r border-slate-200 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="p-1.5 border-r border-slate-200 font-mono text-slate-600 text-[11px]">{s.nis}</td>
                          <td className="px-3 py-1.5 border-r border-slate-200 font-semibold text-slate-900 text-left truncate max-w-[180px]">
                            {s.name}
                          </td>

                          {Array.from({ length: 31 }, (_, i) => {
                            const day = i + 1;

                            if (day > daysInMonth) {
                              return (
                                <td key={day} className="p-1 border-r border-slate-200 bg-slate-100 text-slate-300 font-mono text-[10px]">
                                  /
                                </td>
                              );
                            }

                            const dayPad = day < 10 ? `0${day}` : `${day}`;
                            const dateKey = `${selectedMatrixMonth}-${dayPad}`;
                            const rec = attendanceRecords.find((r) => r.studentId === s.id && r.date === dateKey);

                            if (rec?.status === "S") sCount++;
                            if (rec?.status === "I") iCount++;
                            if (rec?.status === "A") aCount++;

                            const statusVal = rec ? rec.status : "-";

                            return (
                              <td
                                key={day}
                                onClick={() =>
                                  setMatrixCellEdit({
                                    studentId: s.id,
                                    studentName: s.name,
                                    dateStr: dateKey,
                                    dayNum: day,
                                    currentStatus: statusVal,
                                    currentReason: rec?.reason || "",
                                  })
                                }
                                className={`p-1 border-r border-slate-200 cursor-pointer font-bold text-[11px] hover:opacity-80 transition-all ${
                                  statusVal === "S"
                                    ? "bg-amber-100 text-amber-900 font-black"
                                    : statusVal === "I"
                                    ? "bg-blue-100 text-blue-900 font-black"
                                    : statusVal === "A"
                                    ? "bg-red-100 text-red-900 font-black"
                                    : statusVal === "H"
                                    ? "text-emerald-700 bg-emerald-50/50"
                                    : "text-slate-300 hover:bg-slate-100"
                                }`}
                                title={rec?.reason ? `Tgl ${day}: ${statusVal} (${rec.reason})` : `Tgl ${day}: ${statusVal}`}
                              >
                                {statusVal}
                              </td>
                            );
                          })}

                          <td className="p-1.5 border-r border-slate-200 font-bold text-amber-800 bg-amber-50/60">
                            {sCount || "-"}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 font-bold text-blue-800 bg-blue-50/60">
                            {iCount || "-"}
                          </td>
                          <td className="p-1.5 font-bold text-red-800 bg-red-50/60">
                            {aCount || "-"}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal / Popover Quick Cell Edit */}
          {matrixCellEdit && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 max-w-sm w-full space-y-4 animate-scaleUp">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-bold text-sm text-slate-900">
                    Edit Presensi Tanggal {matrixCellEdit.dayNum}
                  </h4>
                  <button
                    onClick={() => setMatrixCellEdit(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Siswa: <b>{matrixCellEdit.studentName}</b>
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Tanggal: {matrixCellEdit.dateStr}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilih Status Kehadiran:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { code: "H" as AttendanceStatus, label: "Hadir", color: "bg-emerald-600 text-white" },
                      { code: "S" as AttendanceStatus, label: "Sakit", color: "bg-amber-600 text-white" },
                      { code: "I" as AttendanceStatus, label: "Izin", color: "bg-blue-600 text-white" },
                      { code: "A" as AttendanceStatus, label: "Alpa", color: "bg-red-600 text-white" },
                    ].map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() =>
                          handleSaveMatrixCell(
                            matrixCellEdit.studentId,
                            matrixCellEdit.dateStr,
                            item.code,
                            matrixCellEdit.currentReason
                          )
                        }
                        className={`py-2 rounded-xl font-bold text-xs shadow-xs transition-all ${
                          matrixCellEdit.currentStatus === item.code
                            ? `${item.color} ring-2 ring-slate-400`
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {item.code}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alasan / Keterangan Absen:
                  </label>
                  <input
                    type="text"
                    value={matrixCellEdit.currentReason}
                    onChange={(e) =>
                      setMatrixCellEdit({
                        ...matrixCellEdit,
                        currentReason: e.target.value,
                      })
                    }
                    placeholder="Contoh: Sakit Flu, Acara Keluarga..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setMatrixCellEdit(null)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSaveMatrixCell(
                        matrixCellEdit.studentId,
                        matrixCellEdit.dateStr,
                        matrixCellEdit.currentStatus === "-" ? "H" : matrixCellEdit.currentStatus,
                        matrixCellEdit.currentReason
                      )
                    }
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                  >
                    Simpan Presensi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REKAP DETAIL & LOG PENYEBAB */}
      {activeTab === "rekap" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">Filter Bulan:</span>
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">Semua Bulan Semester Ini</option>
                {availableMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportAttendanceToExcel(students, attendanceRecords, selectedMonthFilter, schoolIdentity)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                title="Ekspor ke Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-100" />
                Ekspor Excel (.xlsx)
              </button>
              <button
                onClick={handleExportRekapDoc}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                title="Simpan dalam bentuk Word (.doc)"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Simpan Word (.doc)
              </button>
              <button
                onClick={handlePrintRekap}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                title="Cetak Laporan / PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak / PDF
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">No</th>
                    <th className="px-4 py-3">NIS</th>
                    <th className="px-4 py-3">Nama Murid</th>
                    <th className="px-3 py-3 text-center text-amber-700 w-12">S</th>
                    <th className="px-3 py-3 text-center text-blue-700 w-12">I</th>
                    <th className="px-3 py-3 text-center text-red-700 w-12">A</th>
                    <th className="px-4 py-3">Detail Tanggal & Penyebab Absen (Format: dd/m -- S/I/A)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s, idx) => {
                    const stats = getStudentStats(s.id);
                    const logs = getFormattedDateReasonLog(s.id);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{s.nis}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="px-3 py-3 text-center font-bold text-amber-700 bg-amber-50/50">
                          {stats.S || "-"}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-blue-700 bg-blue-50/50">
                          {stats.I || "-"}
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-red-700 bg-red-50/50">
                          {stats.A || "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">
                          {logs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {logs.map((logStr, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-[11px]"
                                >
                                  {logStr}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Tidak ada catatan absen (Nir-Absen)</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
