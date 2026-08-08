import React, { useState, useEffect } from "react";
import {
  SchoolIdentity,
  Student,
  AttendanceRecord,
  CPTPItem,
  IncidentRecord,
  GradeRecord,
  DailyGradeEntry,
  TimetableSlot,
  GuestBookEntry,
  IncidentalJournalEntry,
  DailyTeachingLog,
  AcademicCalendarEvent,
  ProtaItem,
  PromesItem,
  TeachingModule,
  AISettings,
  GASConfig,
  NavModule,
  UserAccount,
  ExamPackage,
  CanvaTemplateItem,
} from "./types";
import { DEFAULT_SUBJECTS } from "./constants/subjects";
import {
  INITIAL_SCHOOL_IDENTITY,
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_CPTP,
  INITIAL_INCIDENTS,
  INITIAL_GRADES,
  INITIAL_TIMETABLE,
  INITIAL_GUEST_BOOK,
  INITIAL_INCIDENTAL_JOURNALS,
  INITIAL_DAILY_LOGS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_PROTA,
  INITIAL_PROMES,
  INITIAL_TEACHING_MODULES,
  INITIAL_AI_SETTINGS,
  INITIAL_GAS_CONFIG,
  INITIAL_USERS,
  INITIAL_CANVA_TEMPLATES,
} from "./data/initialData";
import { loadFromStorage, saveToStorage } from "./lib/storage";
import { usePrintHandler } from "./hooks/usePrintHandler";

// Components
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { AIAgentModal } from "./components/AIAgentModal";
import { GoogleSheetsModal } from "./components/GoogleSheetsModal";
import { BackupModal } from "./components/BackupModal";
import { PrintModal } from "./components/PrintModal";
import { UserManagementModal } from "./components/UserManagementModal";

// Modules
import { SchoolIdentityView } from "./components/modules/SchoolIdentityView";
import { StudentRosterView } from "./components/modules/StudentRosterView";
import { BulkAttendanceView } from "./components/modules/BulkAttendanceView";
import { CurriculumCPTPView } from "./components/modules/CurriculumCPTPView";
import { DisciplineBKView } from "./components/modules/DisciplineBKView";
import { GradesMatrixView } from "./components/modules/GradesMatrixView";
import { TimetableScheduleView } from "./components/modules/TimetableScheduleView";
import { IncidentalGuestBookView } from "./components/modules/IncidentalGuestBookView";
import { DailyTeachingLogView } from "./components/modules/DailyTeachingLogView";
import { AcademicCalendarView } from "./components/modules/AcademicCalendarView";
import { ProtaPromesView } from "./components/modules/ProtaPromesView";
import { TeachingModuleGeneratorView } from "./components/modules/TeachingModuleGeneratorView";
import { LearningAnalysisView } from "./components/modules/LearningAnalysisView";
import { DashboardSummaryView } from "./components/modules/DashboardSummaryView";
import { ExamGeneratorView } from "./components/modules/ExamGeneratorView";
import { CanvaStudioView } from "./components/modules/CanvaStudioView";

export default function App() {
  const [activeModule, setActiveModule] = useState<NavModule>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  // Custom Print Handler Hook with DOM stabilization delay
  const {
    printState,
    handleOpenPrint,
    handleClosePrint,
    togglePageBreaks,
  } = usePrintHandler(250);

  // App State with Persistence
  const [users, setUsers] = useState<UserAccount[]>(() =>
    loadFromStorage("usersList", INITIAL_USERS)
  );
  const [schoolIdentity, setSchoolIdentity] = useState<SchoolIdentity>(() =>
    loadFromStorage("schoolIdentity", INITIAL_SCHOOL_IDENTITY)
  );
  const [students, setStudents] = useState<Student[]>(() =>
    loadFromStorage("students", INITIAL_STUDENTS)
  );
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    loadFromStorage("attendanceRecords", INITIAL_ATTENDANCE)
  );
  const [cptpItems, setCPTPItems] = useState<CPTPItem[]>(() =>
    loadFromStorage("cptpItems", INITIAL_CPTP)
  );
  const [incidents, setIncidents] = useState<IncidentRecord[]>(() =>
    loadFromStorage("incidents", INITIAL_INCIDENTS)
  );
  const [grades, setGrades] = useState<GradeRecord[]>(() =>
    loadFromStorage("grades", INITIAL_GRADES)
  );
  const [dailyGrades, setDailyGrades] = useState<DailyGradeEntry[]>(() =>
    loadFromStorage("dailyGrades", [])
  );
  const [subjects, setSubjects] = useState<string[]>(() => {
    const loaded = loadFromStorage<string[]>("customSubjects", []);
    const combined = Array.from(
      new Set([...DEFAULT_SUBJECTS, ...(Array.isArray(loaded) ? loaded : [])])
    );
    return combined;
  });
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() =>
    loadFromStorage("timetable", INITIAL_TIMETABLE)
  );
  const [guestBook, setGuestBook] = useState<GuestBookEntry[]>(() =>
    loadFromStorage("guestBook", INITIAL_GUEST_BOOK)
  );
  const [incidentalJournals, setIncidentalJournals] = useState<IncidentalJournalEntry[]>(() =>
    loadFromStorage("incidentalJournals", INITIAL_INCIDENTAL_JOURNALS)
  );
  const [dailyLogs, setDailyLogs] = useState<DailyTeachingLog[]>(() =>
    loadFromStorage("dailyLogs", INITIAL_DAILY_LOGS)
  );
  const [calendarEvents, setCalendarEvents] = useState<AcademicCalendarEvent[]>(() =>
    loadFromStorage("calendarEvents", INITIAL_CALENDAR_EVENTS)
  );
  const [protaList, setProtaList] = useState<ProtaItem[]>(() =>
    loadFromStorage("protaList", INITIAL_PROTA)
  );
  const [promesList, setPromesList] = useState<PromesItem[]>(() =>
    loadFromStorage("promesList", INITIAL_PROMES)
  );
  const [teachingModules, setTeachingModules] = useState<TeachingModule[]>(() =>
    loadFromStorage("teachingModules", INITIAL_TEACHING_MODULES)
  );
  const [savedExams, setSavedExams] = useState<ExamPackage[]>(() =>
    loadFromStorage("savedExams", [])
  );
  const [canvaTemplates, setCanvaTemplates] = useState<CanvaTemplateItem[]>(() =>
    loadFromStorage("canvaTemplates", INITIAL_CANVA_TEMPLATES)
  );

  const handleSaveCanvaTemplates = (updated: CanvaTemplateItem[]) => {
    setCanvaTemplates(updated);
    saveToStorage("canvaTemplates", updated);
  };

  const handleSaveExam = (exam: ExamPackage) => {
    setSavedExams((prev) => {
      const idx = prev.findIndex((e) => e.id === exam.id);
      let updated: ExamPackage[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = exam;
      } else {
        updated = [exam, ...prev];
      }
      saveToStorage("savedExams", updated);
      return updated;
    });
  };

  const handleDeleteExam = (id: string) => {
    setSavedExams((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveToStorage("savedExams", updated);
      return updated;
    });
  };
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    const loaded = loadFromStorage("aiSettings", INITIAL_AI_SETTINGS);
    return {
      ...INITIAL_AI_SETTINGS,
      ...(loaded && typeof loaded === "object" ? loaded : {}),
    };
  });
  const [gasConfig, setGasConfig] = useState<GASConfig>(() =>
    loadFromStorage("gasConfig", INITIAL_GAS_CONFIG)
  );

  const [activeUserEmail, setActiveUserEmail] = useState<string>(
    () => users[0]?.email || "rachmatsusanto21@guru.sd.belajar.id"
  );

  // Cross-device auto sync GAS config by user email on mount/email change
  useEffect(() => {
    if (activeUserEmail) {
      fetch(`/api/user-config?email=${encodeURIComponent(activeUserEmail)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.webAppUrl && data.webAppUrl !== gasConfig.webAppUrl) {
            setGasConfig((prev) => ({ ...prev, webAppUrl: data.webAppUrl }));
          }
        })
        .catch((err) => console.error("Error syncing user gas config:", err));
    }
  }, [activeUserEmail]);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = loadFromStorage<"light" | "dark">("theme", "light");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    saveToStorage("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Sync to local storage
  useEffect(() => {
    saveToStorage("schoolIdentity", schoolIdentity);
  }, [schoolIdentity]);

  useEffect(() => {
    saveToStorage("usersList", users);
  }, [users]);

  useEffect(() => {
    saveToStorage("students", students);
  }, [students]);

  useEffect(() => {
    saveToStorage("attendanceRecords", attendanceRecords);
  }, [attendanceRecords]);

  useEffect(() => {
    saveToStorage("cptpItems", cptpItems);
  }, [cptpItems]);

  useEffect(() => {
    saveToStorage("incidents", incidents);
  }, [incidents]);

  useEffect(() => {
    saveToStorage("grades", grades);
  }, [grades]);

  useEffect(() => {
    saveToStorage("dailyGrades", dailyGrades);
  }, [dailyGrades]);

  useEffect(() => {
    saveToStorage(
      "customSubjects",
      subjects.filter((s) => !DEFAULT_SUBJECTS.includes(s))
    );
  }, [subjects]);

  const handleAddCustomSubject = (newSubject: string) => {
    const trimmed = newSubject.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects((prev) => [...prev, trimmed]);
    }
  };

  const handleEditCustomSubject = (oldSubject: string, newSubject: string) => {
    const trimmed = newSubject.trim();
    if (!trimmed || oldSubject === trimmed) return;

    setSubjects((prev) => prev.map((s) => (s === oldSubject ? trimmed : s)));

    // Sync subject name change across CPTP items
    setCPTPItems((prev) =>
      prev.map((item) => (item.subject === oldSubject ? { ...item, subject: trimmed } : item))
    );

    // Sync subject name change across Prota & Promes
    setProtaList((prev) =>
      prev.map((p) => (p.subject === oldSubject ? { ...p, subject: trimmed } : p))
    );
    setPromesList((prev) =>
      prev.map((p) => (p.subject === oldSubject ? { ...p, subject: trimmed } : p))
    );

    // Sync subject name change across Grades
    setGrades((prev) =>
      prev.map((g) => (g.subject === oldSubject ? { ...g, subject: trimmed } : g))
    );
  };

  const handleDeleteCustomSubject = (subjectToDelete: string) => {
    setSubjects((prev) => prev.filter((s) => s !== subjectToDelete));
  };

  useEffect(() => {
    saveToStorage("timetable", timetable);
  }, [timetable]);

  useEffect(() => {
    saveToStorage("guestBook", guestBook);
  }, [guestBook]);

  useEffect(() => {
    saveToStorage("incidentalJournals", incidentalJournals);
  }, [incidentalJournals]);

  useEffect(() => {
    saveToStorage("dailyLogs", dailyLogs);
  }, [dailyLogs]);

  useEffect(() => {
    saveToStorage("calendarEvents", calendarEvents);
  }, [calendarEvents]);

  useEffect(() => {
    saveToStorage("protaList", protaList);
  }, [protaList]);

  useEffect(() => {
    saveToStorage("promesList", promesList);
  }, [promesList]);

  useEffect(() => {
    saveToStorage("teachingModules", teachingModules);
  }, [teachingModules]);

  useEffect(() => {
    saveToStorage("savedExams", savedExams);
  }, [savedExams]);

  useEffect(() => {
    saveToStorage("aiSettings", aiSettings);
  }, [aiSettings]);

  useEffect(() => {
    saveToStorage("gasConfig", gasConfig);
  }, [gasConfig]);

  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const allDataPayload = {
    schoolIdentity,
    students,
    attendanceRecords,
    cptpItems,
    incidents,
    grades,
    dailyGrades,
    subjects,
    timetable,
    guestBook,
    incidentalJournals,
    dailyLogs,
    calendarEvents,
    protaList,
    promesList,
    teachingModules,
    savedExams,
    aiSettings,
    gasConfig,
    users,
    canvaTemplates,
  };

  const handleRestoreData = (rawData: Record<string, any>, sourceTimestamp?: string) => {
    if (!rawData || typeof rawData !== "object") return;

    // Helper to unwrap nested wrapper structures (e.g. { data: { data: { ... } } })
    let payload = rawData;
    if (payload.rawJson && typeof payload.rawJson === "object") {
      payload = payload.rawJson;
    }

    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
      if (
        payload.data.teachingModules ||
        payload.data.savedExams ||
        payload.data.students ||
        payload.data.schoolIdentity ||
        payload.data.cptpItems ||
        payload.data.protaList ||
        payload.data.data
      ) {
        payload = payload.data;
        if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
          if (
            payload.data.teachingModules ||
            payload.data.savedExams ||
            payload.data.students ||
            payload.data.schoolIdentity ||
            payload.data.cptpItems ||
            payload.data.protaList
          ) {
            payload = payload.data;
          }
        }
      }
    }

    // 1. School Identity
    const restoredIdentity = payload.schoolIdentity || payload.identity || payload.adm_guru_identity;
    if (restoredIdentity && typeof restoredIdentity === "object") {
      setSchoolIdentity(restoredIdentity);
      saveToStorage("schoolIdentity", restoredIdentity);
    }

    // 2. Students
    const restoredStudents = payload.students || payload.adm_guru_students;
    if (Array.isArray(restoredStudents)) {
      setStudents(restoredStudents);
      saveToStorage("students", restoredStudents);
    }

    // 3. Attendance
    const restoredAttendance = payload.attendanceRecords || payload.attendance || payload.adm_guru_attendance;
    if (Array.isArray(restoredAttendance)) {
      setAttendanceRecords(restoredAttendance);
      saveToStorage("attendanceRecords", restoredAttendance);
    }

    // 4. CPTP
    const restoredCPTP = payload.cptpItems || payload.cptp || payload.adm_guru_cptp;
    if (Array.isArray(restoredCPTP)) {
      setCPTPItems(restoredCPTP);
      saveToStorage("cptpItems", restoredCPTP);
    }

    // 5. Incidents
    const restoredIncidents = payload.incidents || payload.adm_guru_incidents;
    if (Array.isArray(restoredIncidents)) {
      setIncidents(restoredIncidents);
      saveToStorage("incidents", restoredIncidents);
    }

    // 6. Grades
    const restoredGrades = payload.grades || payload.adm_guru_grades;
    if (Array.isArray(restoredGrades)) {
      setGrades(restoredGrades);
      saveToStorage("grades", restoredGrades);
    }

    // 7. Daily Grades
    const restoredDailyGrades = payload.dailyGrades || payload.daily_grades || payload.rekapNilaiHarian;
    if (Array.isArray(restoredDailyGrades)) {
      setDailyGrades(restoredDailyGrades);
      saveToStorage("dailyGrades", restoredDailyGrades);
    }

    // 8. Subjects
    const restoredSubjects = payload.subjects || payload.customSubjects;
    if (Array.isArray(restoredSubjects)) {
      setSubjects(restoredSubjects);
      saveToStorage("customSubjects", restoredSubjects.filter((s: string) => !DEFAULT_SUBJECTS.includes(s)));
    }

    // 9. Timetable
    const restoredTimetable = payload.timetable || payload.adm_guru_timetable;
    if (Array.isArray(restoredTimetable)) {
      setTimetable(restoredTimetable);
      saveToStorage("timetable", restoredTimetable);
    }

    // 10. Guest Book
    const restoredGuestBook = payload.guestBook || payload.guestbook || payload.adm_guru_guestbook;
    if (Array.isArray(restoredGuestBook)) {
      setGuestBook(restoredGuestBook);
      saveToStorage("guestBook", restoredGuestBook);
    }

    // 11. Incidental
    const restoredIncidental = payload.incidentalJournals || payload.incidental || payload.adm_guru_incidental;
    if (Array.isArray(restoredIncidental)) {
      setIncidentalJournals(restoredIncidental);
      saveToStorage("incidentalJournals", restoredIncidental);
    }

    // 12. Daily Logs
    const restoredDailyLogs = payload.dailyLogs || payload.daily_logs || payload.teaching_journal || payload.adm_guru_teaching_journal;
    if (Array.isArray(restoredDailyLogs)) {
      setDailyLogs(restoredDailyLogs);
      saveToStorage("dailyLogs", restoredDailyLogs);
    }

    // 13. Calendar
    const restoredCalendar = payload.calendarEvents || payload.calendar || payload.adm_guru_calendar;
    if (Array.isArray(restoredCalendar)) {
      setCalendarEvents(restoredCalendar);
      saveToStorage("calendarEvents", restoredCalendar);
    }

    // 14. Prota
    const restoredProta = payload.protaList || payload.prota || payload.adm_guru_prota;
    if (Array.isArray(restoredProta)) {
      setProtaList(restoredProta);
      saveToStorage("protaList", restoredProta);
    }

    // 15. Promes
    const restoredPromes = payload.promesList || payload.promes || payload.adm_guru_promes;
    if (Array.isArray(restoredPromes)) {
      setPromesList(restoredPromes);
      saveToStorage("promesList", restoredPromes);
    }

    // 16. Teaching Modules (MODUL AJAR) - CRITICAL
    const restoredModules = payload.teachingModules || payload.teaching_modules || payload.modulAjar || payload.modul_ajar || payload.adm_guru_modul_ajar;
    if (Array.isArray(restoredModules)) {
      setTeachingModules(restoredModules);
      saveToStorage("teachingModules", restoredModules);
    }

    // 17. Saved Exams (SOAL & KISI-KISI) - CRITICAL
    const restoredExams = payload.savedExams || payload.saved_exams || payload.examPackages || payload.exams || payload.soal || payload.kisiKisi;
    if (Array.isArray(restoredExams)) {
      setSavedExams(restoredExams);
      saveToStorage("savedExams", restoredExams);
    }

    // 18. AI Settings
    const restoredAiSettings = payload.aiSettings || payload.adm_guru_ai_settings;
    if (restoredAiSettings && typeof restoredAiSettings === "object") {
      setAiSettings(restoredAiSettings);
      saveToStorage("aiSettings", restoredAiSettings);
    }

    // 19. GAS Config
    if (payload.gasConfig && typeof payload.gasConfig === "object") {
      setGasConfig(payload.gasConfig);
      saveToStorage("gasConfig", payload.gasConfig);
    }

    // 20. Users
    if (Array.isArray(payload.users)) {
      setUsers(payload.users);
      saveToStorage("usersList", payload.users);
    }

    // 21. Canva Templates
    if (Array.isArray(payload.canvaTemplates)) {
      setCanvaTemplates(payload.canvaTemplates);
      saveToStorage("canvaTemplates", payload.canvaTemplates);
    }

    if (sourceTimestamp) {
      localStorage.setItem("app_last_saved_timestamp", sourceTimestamp);
    }
  };

  // Cross-device auto sync & timestamp comparison handler
  const checkAndRestoreLatestCloudData = async (manual = false) => {
    try {
      const res = await fetch("/api/backup/latest");
      const json = await res.json();
      if (json.status === "success" && json.data && json.timestamp) {
        const cloudTime = new Date(json.timestamp).getTime();
        const localTimeStr = localStorage.getItem("app_last_saved_timestamp");
        const localTime = localTimeStr ? new Date(localTimeStr).getTime() : 0;

        if (cloudTime > localTime || manual) {
          handleRestoreData(json.data, json.timestamp);
          const formattedTime = new Date(json.timestamp).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          });
          setSyncMessage(`Data otomatis tersinkronisasi dari Cloud (Versi terbaru: ${formattedTime})`);
          setTimeout(() => setSyncMessage(null), 8000);
        } else if (manual) {
          setSyncMessage("Data lokal Anda sudah paling baru dan sinkron dengan Cloud!");
          setTimeout(() => setSyncMessage(null), 4000);
        }
      } else if (manual) {
        setSyncMessage("Belum ada data cadangan di cloud server.");
        setTimeout(() => setSyncMessage(null), 4000);
      }
    } catch (err) {
      console.error("Error auto restoring cloud backup:", err);
    }
  };

  useEffect(() => {
    checkAndRestoreLatestCloudData();

    const handleFocus = () => {
      checkAndRestoreLatestCloudData();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // Auto-push state changes to server snapshot with timestamp
  useEffect(() => {
    const timer = setTimeout(() => {
      const nowISO = new Date().toISOString();
      localStorage.setItem("app_last_saved_timestamp", nowISO);

      fetch("/api/backup/save-latest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: nowISO,
          schoolName: schoolIdentity.schoolName,
          data: allDataPayload,
        }),
      }).catch((err) => console.error("Error auto-saving cloud snapshot:", err));
    }, 2000);

    return () => clearTimeout(timer);
  }, [
    schoolIdentity,
    students,
    attendanceRecords,
    cptpItems,
    incidents,
    grades,
    dailyGrades,
    subjects,
    timetable,
    guestBook,
    incidentalJournals,
    dailyLogs,
    calendarEvents,
    protaList,
    promesList,
    teachingModules,
    aiSettings,
    gasConfig,
    users,
    savedExams,
    canvaTemplates,
  ]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Top Header Navigation */}
      <Header
        schoolIdentity={schoolIdentity}
        aiSettings={aiSettings}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenSheetsModal={() => setIsGasModalOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
      />

      {/* Cloud Auto-Sync Banner */}
      {syncMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md z-40 transition-all">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
            <span>{syncMessage}</span>
          </div>
          <button
            onClick={() => setSyncMessage(null)}
            className="text-emerald-200 hover:text-white font-bold text-sm px-1"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={(m) => {
            setActiveModule(m);
            setIsSidebarOpen(false);
          }}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content View Container - High Density Layout */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 max-w-[1400px] mx-auto w-full space-y-4">
            {activeModule === "dashboard" && (
              <DashboardSummaryView
                schoolIdentity={schoolIdentity}
                students={students}
                dailyLogs={dailyLogs}
                teachingModules={teachingModules}
                attendanceRecords={attendanceRecords}
                grades={grades}
                dailyGrades={dailyGrades}
                cptpItems={cptpItems}
                protaList={protaList}
                promesList={promesList}
                timetable={timetable}
                guestBook={guestBook}
                incidentalJournals={incidentalJournals}
                calendarEvents={calendarEvents}
                subjects={subjects}
                onSelectModule={setActiveModule}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "identity" && (
              <SchoolIdentityView
                identity={schoolIdentity}
                onSave={setSchoolIdentity}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "students" && (
              <StudentRosterView
                students={students}
                onSaveStudents={setStudents}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "attendance" && (
              <BulkAttendanceView
                students={students}
                attendanceRecords={attendanceRecords}
                onSaveAttendance={setAttendanceRecords}
                onOpenPrint={handleOpenPrint}
                schoolIdentity={schoolIdentity}
              />
            )}

            {activeModule === "curriculum" && (
              <CurriculumCPTPView
                cptpItems={cptpItems}
                aiSettings={aiSettings}
                subjects={subjects}
                onAddSubject={handleAddCustomSubject}
                onEditSubject={handleEditCustomSubject}
                onDeleteSubject={handleDeleteCustomSubject}
                onSaveCPTP={setCPTPItems}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "discipline" && (
              <DisciplineBKView
                students={students}
                incidents={incidents}
                grades={grades}
                subjects={subjects}
                schoolIdentity={schoolIdentity}
                onSaveIncidents={setIncidents}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "grades" && (
              <GradesMatrixView
                students={students}
                cptpItems={cptpItems}
                grades={grades}
                dailyGrades={dailyGrades}
                subjects={subjects}
                onAddSubject={handleAddCustomSubject}
                onSaveGrades={setGrades}
                onSaveDailyGrades={setDailyGrades}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "learning_analysis" && (
              <LearningAnalysisView
                students={students}
                cptpItems={cptpItems}
                grades={grades}
                dailyGrades={dailyGrades}
                subjects={subjects}
                incidents={incidents}
                schoolIdentity={schoolIdentity}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "timetable" && (
              <TimetableScheduleView
                timetable={timetable}
                onSaveTimetable={setTimetable}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "incidental" && (
              <IncidentalGuestBookView
                guestBook={guestBook}
                incidentalJournals={incidentalJournals}
                onSaveGuestBook={setGuestBook}
                onSaveIncidentalJournals={setIncidentalJournals}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "daily_log" && (
              <DailyTeachingLogView
                logs={dailyLogs}
                cptpItems={cptpItems}
                subjects={subjects}
                schoolIdentity={schoolIdentity}
                attendanceRecords={attendanceRecords}
                students={students}
                onSaveLogs={setDailyLogs}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "calendar" && (
              <AcademicCalendarView
                schoolIdentity={schoolIdentity}
                events={calendarEvents}
                timetable={timetable}
                subjects={subjects}
                incidentalJournals={incidentalJournals}
                protaList={protaList}
                onUpdateSchoolIdentity={setSchoolIdentity}
                onSaveEvents={setCalendarEvents}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "prota_promes" && (
              <ProtaPromesView
                protaList={protaList}
                promesList={promesList}
                cptpItems={cptpItems}
                subjects={subjects}
                timetable={timetable}
                calendarEvents={calendarEvents}
                incidentalJournals={incidentalJournals}
                schoolIdentity={schoolIdentity}
                onSaveProta={setProtaList}
                onSavePromes={setPromesList}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "teaching_module" && (
              <TeachingModuleGeneratorView
                schoolIdentity={schoolIdentity}
                students={students}
                teachingModules={teachingModules}
                aiSettings={aiSettings}
                onSaveModules={setTeachingModules}
                onOpenPrint={handleOpenPrint}
              />
            )}

            {activeModule === "exam_generator" && (
              <ExamGeneratorView
                schoolIdentity={schoolIdentity}
                cptpItems={cptpItems}
                subjects={subjects}
                protaList={protaList}
                savedExams={savedExams}
                onSaveExam={handleSaveExam}
                onDeleteExam={handleDeleteExam}
                onOpenPrint={handleOpenPrint}
                aiSettings={aiSettings}
              />
            )}

            {activeModule === "canva_studio" && (
              <CanvaStudioView
                cptpList={cptpItems}
                subjects={subjects}
                schoolIdentity={schoolIdentity}
                canvaTemplates={canvaTemplates}
                onSaveCanvaTemplates={handleSaveCanvaTemplates}
              />
            )}
          </main>

          {/* Global High-Density Footer */}
          <footer className="h-9 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-medium">
            <div className="flex gap-4 items-center">
              <span>🔑 AI Key Status: <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">Terhubung</span></span>
              <span className="hidden sm:inline">📍 Latency: <span className="font-mono text-slate-700 dark:text-slate-300">12ms</span></span>
              <span>⚡ High Density Theme v2.4 ({theme === "dark" ? "Dark" : "Light"})</span>
            </div>
            <div className="flex gap-3 items-center">
              <button onClick={() => setIsAiModalOpen(true)} className="hover:text-indigo-600 dark:hover:text-indigo-400 uppercase font-bold tracking-tight">Pilih Agent AI</button>
              <span>•</span>
              <button onClick={() => setIsGasModalOpen(true)} className="hover:text-indigo-600 dark:hover:text-indigo-400 uppercase font-bold tracking-tight">Sync Sheets</button>
            </div>
          </footer>
        </div>
      </div>

      {/* Global Modals */}
      <AIAgentModal
        isOpen={isAiModalOpen}
        settings={aiSettings}
        onSaveSettings={setAiSettings}
        onClose={() => setIsAiModalOpen(false)}
      />

      <GoogleSheetsModal
        isOpen={isGasModalOpen}
        config={gasConfig}
        onSaveConfig={setGasConfig}
        onClose={() => setIsGasModalOpen(false)}
        users={users}
        activeUserEmail={activeUserEmail}
        onSelectUserEmail={setActiveUserEmail}
        allData={allDataPayload}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        schoolIdentity={schoolIdentity}
        gasConfig={gasConfig}
        onRestoreData={handleRestoreData}
        allData={allDataPayload}
      />

      <UserManagementModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        users={users}
        onSaveUsers={setUsers}
      />

      <PrintModal
        isOpen={printState.isOpen}
        title={printState.title}
        subtitle={printState.subtitle}
        schoolIdentity={schoolIdentity}
        onClose={handleClosePrint}
        defaultOrientation={printState.defaultOrientation}
        defaultPaperSize={printState.defaultPaperSize}
        enablePageBreaks={printState.enablePageBreaks}
        onTogglePageBreaks={togglePageBreaks}
      >
        {printState.content}
      </PrintModal>
    </div>
  );
}
