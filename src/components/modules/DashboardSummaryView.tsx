import React, { useState } from "react";
import {
  SchoolIdentity,
  Student,
  DailyTeachingLog,
  TeachingModule,
  AttendanceRecord,
  GradeRecord,
  DailyGradeEntry,
  CPTPItem,
  ProtaItem,
  PromesItem,
  TimetableSlot,
  GuestBookEntry,
  IncidentalJournalEntry,
  AcademicCalendarEvent,
  NavModule,
} from "../../types";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Sparkles,
  BookOpen,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  Building2,
  BookMarked,
  Layers,
  GraduationCap,
} from "lucide-react";
import {
  exportStudentsToExcel,
  exportGradesToExcel,
  exportAttendanceToExcel,
  exportTeachingLogsToExcel,
  exportProtaToExcel,
  exportPromesToExcel,
  exportCurriculumToExcel,
  exportTimetableToExcel,
} from "../../lib/exportExcel";
import { exportTeachingModuleToDocx, exportGuestBookToDocx } from "../../lib/exportDocx";
import { ExportActionBar } from "../ExportActionBar";

interface DashboardSummaryViewProps {
  schoolIdentity: SchoolIdentity;
  students: Student[];
  dailyLogs: DailyTeachingLog[];
  teachingModules: TeachingModule[];
  attendanceRecords: AttendanceRecord[];
  grades: GradeRecord[];
  dailyGrades: DailyGradeEntry[];
  cptpItems: CPTPItem[];
  protaList: ProtaItem[];
  promesList: PromesItem[];
  timetable: TimetableSlot[];
  guestBook: GuestBookEntry[];
  incidentalJournals: IncidentalJournalEntry[];
  calendarEvents: AcademicCalendarEvent[];
  subjects: string[];
  onSelectModule: (module: NavModule) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const DashboardSummaryView: React.FC<DashboardSummaryViewProps> = ({
  schoolIdentity,
  students,
  dailyLogs,
  teachingModules,
  attendanceRecords,
  grades,
  dailyGrades,
  cptpItems,
  protaList,
  promesList,
  timetable,
  guestBook,
  incidentalJournals,
  calendarEvents,
  subjects,
  onSelectModule,
  onOpenPrint,
}) => {
  // Calculated Statistics
  const totalStudents = students.length;
  const maleStudents = students.filter((s) => s.gender === "L").length;
  const femaleStudents = students.filter((s) => s.gender === "P").length;
  const nisnCompleteCount = students.filter((s) => s.nisn && s.nisn.trim().length > 0).length;

  // Logs count
  const totalLogs = dailyLogs.length;
  const recentLogs = [...dailyLogs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  // Teaching Modules count
  const totalModules = teachingModules.length;
  const recentModules = [...teachingModules].slice(0, 4);

  // CP / TP items count
  const totalCPTP = cptpItems.length;

  // Attendance Statistics
  const totalAttEntries = attendanceRecords.length;
  const hadirCount = attendanceRecords.filter((r) => r.status === "H").length;
  const attPercentage =
    totalAttEntries > 0 ? Math.round((hadirCount / totalAttEntries) * 100) : 100;

  // Recent calendar events
  const upcomingEvents = [...calendarEvents].slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <LayoutDashboard className="w-64 h-64 text-indigo-400" />
        </div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
              <Building2 className="w-4 h-4" />
              {schoolIdentity.schoolName || "SD NEGERI DEMO"} • Kelas {schoolIdentity.gradeClass} ({schoolIdentity.phase})
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Selamat Datang, {schoolIdentity.teacherName || "Bapak/Ibu Guru"}!
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Ringkasan pusat administrasi mengajar Kurikulum Merdeka. Pantau data siswa, jurnal harian, dan modul ajar dengan cepat.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectModule("teaching_module")}
              className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-transform hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              Buat Modul Ajar AI
            </button>
            <button
              onClick={() => onSelectModule("daily_log")}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-transform hover:scale-[1.02]"
            >
              <ClipboardList className="w-4 h-4" />
              Isi Jurnal Harian
            </button>
          </div>
        </div>
      </div>

      {/* Global Export & Sync Bar */}
      <ExportActionBar
        title="RINGKASAN DASHBOARD UTAMA ADM GURU"
        filename="Ringkasan_Dashboard_Utama"
        schoolIdentity={schoolIdentity}
        headers={["Kategori", "Jumlah / Status"]}
        rows={[
          ["Total Murid/Siswa", `${totalStudents} Siswa`],
          ["Total Catatan Jurnal Mengajar", `${totalLogs} Entri`],
          ["Total Modul Ajar", `${totalModules} Modul`],
          ["Tingkat Kehadiran", `${attPercentage}%`],
        ]}
        onOpenPrintModal={() =>
          onOpenPrint(
            "RINGKASAN DASHBOARD UTAMA ADM GURU",
            "Ringkasan Kinerja & Data Administrasi Mengajar",
            <div className="space-y-4">
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800">
                    <th className="border border-slate-300 p-2 text-left">Indikator</th>
                    <th className="border border-slate-300 p-2 text-left">Nilai / Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">Total Siswa Terdaftar</td>
                    <td className="border border-slate-300 p-2">{totalStudents} Siswa (L: {maleStudents}, P: {femaleStudents})</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">Total Catatan Jurnal Mengajar</td>
                    <td className="border border-slate-300 p-2">{totalLogs} Log Hari Ini</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">Modul Ajar Deep Learning</td>
                    <td className="border border-slate-300 p-2">{totalModules} Modul Tersimpan</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">Rata-rata Presensi Kelas</td>
                    <td className="border border-slate-300 p-2">{attPercentage}% Kehadiran</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        }
      />

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Siswa */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-sky-300 transition-all group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Total Murid / Siswa
              </span>
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {totalStudents}
              </span>
              <span className="text-xs text-slate-500 font-medium">Siswa Terdaftar</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
              <span className="text-slate-600 dark:text-slate-400">👦 Laki-laki: <b>{maleStudents}</b></span>
              <span className="text-slate-600 dark:text-slate-400">👧 Perempuan: <b>{femaleStudents}</b></span>
            </div>
          </div>
          <button
            onClick={() => onSelectModule("students")}
            className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 flex items-center justify-between w-full"
          >
            <span>Kelola Database Siswa</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Card 2: Jurnal Mengajar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-all group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Jurnal Mengajar
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {totalLogs}
              </span>
              <span className="text-xs text-slate-500 font-medium">Total Catatan Log</span>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              {recentLogs[0] ? `Terakhir: ${recentLogs[0].date} (${recentLogs[0].subject})` : "Belum ada entri jurnal minggu ini."}
            </p>
          </div>
          <button
            onClick={() => onSelectModule("daily_log")}
            className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center justify-between w-full"
          >
            <span>Buka Jurnal Harian</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Card 3: Modul Ajar Terbaru */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-fuchsia-300 transition-all group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Modul Ajar Deep Learning
              </span>
              <div className="w-9 h-9 rounded-xl bg-fuchsia-50 dark:bg-fuchsia-950/50 border border-fuchsia-200 dark:border-fuchsia-800 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {totalModules}
              </span>
              <span className="text-xs text-slate-500 font-medium">Modul Tersimpan</span>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
              {recentModules[0] ? `Terbaru: ${recentModules[0].title}` : "Belum ada modul ajar yang dibuat."}
            </p>
          </div>
          <button
            onClick={() => onSelectModule("teaching_module")}
            className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 hover:text-fuchsia-700 flex items-center justify-between w-full"
          >
            <span>Generator Modul Ajar</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Card 4: Presensi & Kurikulum */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-amber-300 transition-all group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Tingkat Kehadiran
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {attPercentage}%
              </span>
              <span className="text-xs text-slate-500 font-medium">Kehadiran Rata-rata</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Capaian TP Aktif: <b>{totalCPTP} TP</b>
            </div>
          </div>
          <button
            onClick={() => onSelectModule("attendance")}
            className="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center justify-between w-full"
          >
            <span>Buka Presensi Kelas</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Detailed Widgets Row: Jurnal Harian Terbaru & Modul Ajar Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Widget: Modul Ajar Terbaru */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-fuchsia-600" />
              Modul Ajar Deep Learning Terbaru
            </h3>
            <button
              onClick={() => onSelectModule("teaching_module")}
              className="text-xs font-bold text-fuchsia-600 hover:underline"
            >
              Lihat Semua ({totalModules})
            </button>
          </div>

          {recentModules.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada modul ajar yang tersimpan. Klik "Buat Modul Ajar AI" untuk memulai.
            </div>
          ) : (
            <div className="space-y-3">
              {recentModules.map((m) => (
                <div
                  key={m.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {m.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {m.subject} • Kelas {m.targetClass} • Alokasi {m.allocationJP || "2 JP"}
                    </p>
                  </div>
                  <button
                    onClick={() => exportTeachingModuleToDocx(m, schoolIdentity)}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 shrink-0 transition-colors"
                    title="Ekspor langsung ke Word (.docx)"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    .docx
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Widget: Jurnal Mengajar Harian Terbaru */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              Catatan Jurnal Mengajar Terbaru
            </h3>
            <button
              onClick={() => onSelectModule("daily_log")}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              Lihat Semua ({totalLogs})
            </button>
          </div>

          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Belum ada jurnal mengajar harian.
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] rounded-md">
                        {log.date}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {log.subject}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-1 line-clamp-1">
                      {log.material}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {log.tpDescription}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dokumen & Data Hub: Pusat Ekspor (.xlsx & .docx) Semua Dokumen */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              Pusat Ekspor & Impor Dokumen (.xlsx & .docx)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Unduh seluruh berkas administrasi guru dalam format Native Microsoft Excel (.xlsx) dan Word (.docx).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section Excel .xlsx */}
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Ekspor Berkas Excel (.xlsx)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => exportStudentsToExcel(students, schoolIdentity)}
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors text-left"
              >
                <span>Data Siswa ({totalStudents})</span>
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </button>
              <button
                onClick={() => exportGradesToExcel(students, dailyGrades, grades, subjects, schoolIdentity)}
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors text-left"
              >
                <span>Rekap Nilai Matrix</span>
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </button>
              <button
                onClick={() => exportAttendanceToExcel(students, attendanceRecords, "All", schoolIdentity)}
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors text-left"
              >
                <span>Rekap Presensi</span>
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </button>
              <button
                onClick={() => exportTeachingLogsToExcel(dailyLogs, schoolIdentity)}
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors text-left"
              >
                <span>Jurnal Harian ({totalLogs})</span>
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </button>
              <button
                onClick={() => exportProtaToExcel(protaList, schoolIdentity)}
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors text-left"
              >
                <span>Program Tahunan (Prota)</span>
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </button>
              <button
                onClick={() => exportPromesToExcel(promesList, schoolIdentity)}
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors text-left"
              >
                <span>Program Semester (Promes)</span>
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </button>
              <button
                onClick={() => exportCurriculumToExcel(cptpItems, schoolIdentity)}
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors text-left"
              >
                <span>Matriks CP & TP ({totalCPTP})</span>
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </button>
              <button
                onClick={() => exportTimetableToExcel(timetable, [1, 2, 3, 4, 5, 6, 7, 8], subjects, schoolIdentity)}
                className="p-2.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors text-left"
              >
                <span>Jadwal Pelajaran</span>
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </button>
            </div>
          </div>

          {/* Section Word .docx */}
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200/80 dark:border-blue-800/50 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Ekspor Berkas Word (.docx)
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Modul Ajar Deep Learning</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dokumen lengkap RPP/Modul Ajar dengan Kop Surat & Tanda Tangan.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (teachingModules[0]) {
                      exportTeachingModuleToDocx(teachingModules[0], schoolIdentity);
                    } else {
                      onSelectModule("teaching_module");
                    }
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Ekspor .docx
                </button>
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">Laporan Buku Tamu & Jurnal Insidental</h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Rekapitulasi kunjungan dinas dan jurnal kegiatan khusus sekolah.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const mappedGuests = guestBook.map((g) => ({
                      id: g.id,
                      date: g.date,
                      guestName: g.visitorName,
                      institution: g.institution,
                      position: g.position || "-",
                      purpose: g.purpose,
                      notes: g.notes || "-",
                    }));
                    const mappedIncidental = incidentalJournals.map((j) => ({
                      id: j.id,
                      date: j.date,
                      incident: j.activityName || (j as any).incident || "-",
                      involvedParties: j.organizer || (j as any).involvedParties || "-",
                      actionTaken: j.description || (j as any).actionTaken || "-",
                      followUp: j.notes || (j as any).followUp || "-",
                    }));
                    exportGuestBookToDocx(mappedGuests, mappedIncidental, schoolIdentity);
                  }}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Ekspor .docx
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
