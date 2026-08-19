import {
  SchoolIdentity,
  Student,
  AttendanceRecord,
  CPTPItem,
  IncidentRecord,
  GradeRecord,
  TimetableSlot,
  GuestBookEntry,
  IncidentalJournalEntry,
  TeachingJournalEntry,
  CalendarEvent,
  MonthlyEffectiveDays,
  ProtaItem,
  PromesItem,
  ModulAjar,
  AISettings,
} from "../types";

import {
  initialSchoolIdentity,
  initialStudents,
  initialAttendanceRecords,
  initialCPTP,
  initialIncidents,
  initialGrades,
  initialTimetable,
  initialGuestBook,
  initialIncidentalJournals,
  initialTeachingJournals,
  initialCalendarEvents,
  initialMonthlyEffectiveDays,
  initialProta,
  initialPromes,
  initialModulAjar,
  initialAISettings,
} from "../data/initialData";

const STORAGE_KEYS = {
  IDENTITY: "adm_guru_identity",
  STUDENTS: "adm_guru_students",
  ATTENDANCE: "adm_guru_attendance",
  CPTP: "adm_guru_cptp",
  INCIDENTS: "adm_guru_incidents",
  GRADES: "adm_guru_grades",
  TIMETABLE: "adm_guru_timetable",
  GUESTBOOK: "adm_guru_guestbook",
  INCIDENTAL: "adm_guru_incidental",
  TEACHING_JOURNAL: "adm_guru_teaching_journal",
  CALENDAR: "adm_guru_calendar",
  EFFECTIVE_DAYS: "adm_guru_effective_days",
  PROTA: "adm_guru_prota",
  PROMES: "adm_guru_promes",
  MODUL_AJAR: "adm_guru_modul_ajar",
  AI_SETTINGS: "adm_guru_ai_settings",
  SUBJECT_WEEKLY_ACTIVE_DAYS: "adm_guru_subject_weekly_active_days",
  LKPD_HISTORY: "adm_guru_lkpd_history",
  MEDIA_BANANA_HISTORY: "adm_guru_media_banana_history",
};

// Aliases mapping to ensure 100% interoperability between all key styles
const KEY_ALIASES: Record<string, string[]> = {
  schoolIdentity: [STORAGE_KEYS.IDENTITY, "schoolIdentity", "identity"],
  [STORAGE_KEYS.IDENTITY]: [STORAGE_KEYS.IDENTITY, "schoolIdentity", "identity"],
  students: [STORAGE_KEYS.STUDENTS, "students"],
  [STORAGE_KEYS.STUDENTS]: [STORAGE_KEYS.STUDENTS, "students"],
  attendanceRecords: [STORAGE_KEYS.ATTENDANCE, "attendanceRecords", "attendance"],
  [STORAGE_KEYS.ATTENDANCE]: [STORAGE_KEYS.ATTENDANCE, "attendanceRecords", "attendance"],
  cptpItems: [STORAGE_KEYS.CPTP, "cptpItems", "cptp"],
  [STORAGE_KEYS.CPTP]: [STORAGE_KEYS.CPTP, "cptpItems", "cptp"],
  incidents: [STORAGE_KEYS.INCIDENTS, "incidents"],
  [STORAGE_KEYS.INCIDENTS]: [STORAGE_KEYS.INCIDENTS, "incidents"],
  grades: [STORAGE_KEYS.GRADES, "grades"],
  [STORAGE_KEYS.GRADES]: [STORAGE_KEYS.GRADES, "grades"],
  dailyGrades: ["dailyGrades", "daily_grades", "adm_guru_daily_grades", "rekapNilaiHarian"],
  teachingModules: [STORAGE_KEYS.MODUL_AJAR, "teachingModules", "modulAjar", "modul_ajar"],
  [STORAGE_KEYS.MODUL_AJAR]: [STORAGE_KEYS.MODUL_AJAR, "teachingModules", "modulAjar", "modul_ajar"],
  savedExams: ["savedExams", "saved_exams", "adm_guru_saved_exams", "examPackages", "exams"],
  protaList: [STORAGE_KEYS.PROTA, "protaList", "prota"],
  [STORAGE_KEYS.PROTA]: [STORAGE_KEYS.PROTA, "protaList", "prota"],
  promesList: [STORAGE_KEYS.PROMES, "promesList", "promes"],
  [STORAGE_KEYS.PROMES]: [STORAGE_KEYS.PROMES, "promesList", "promes"],
  timetable: [STORAGE_KEYS.TIMETABLE, "timetable"],
  [STORAGE_KEYS.TIMETABLE]: [STORAGE_KEYS.TIMETABLE, "timetable"],
  guestBook: [STORAGE_KEYS.GUESTBOOK, "guestBook", "guestbook"],
  [STORAGE_KEYS.GUESTBOOK]: [STORAGE_KEYS.GUESTBOOK, "guestBook", "guestbook"],
  incidentalJournals: [STORAGE_KEYS.INCIDENTAL, "incidentalJournals", "incidental"],
  [STORAGE_KEYS.INCIDENTAL]: [STORAGE_KEYS.INCIDENTAL, "incidentalJournals", "incidental"],
  dailyLogs: [STORAGE_KEYS.TEACHING_JOURNAL, "dailyLogs", "daily_logs", "teaching_journal"],
  [STORAGE_KEYS.TEACHING_JOURNAL]: [STORAGE_KEYS.TEACHING_JOURNAL, "dailyLogs", "daily_logs", "teaching_journal"],
  calendarEvents: [STORAGE_KEYS.CALENDAR, "calendarEvents", "calendar"],
  [STORAGE_KEYS.CALENDAR]: [STORAGE_KEYS.CALENDAR, "calendarEvents", "calendar"],
  aiSettings: [STORAGE_KEYS.AI_SETTINGS, "aiSettings"],
  [STORAGE_KEYS.AI_SETTINGS]: [STORAGE_KEYS.AI_SETTINGS, "aiSettings"],
  gasConfig: ["gasConfig", "adm_guru_gas_config"],
  usersList: ["usersList", "users", "adm_guru_users"],
  canvaTemplates: ["canvaTemplates", "adm_guru_canva_templates"],
};

export function loadStoredData<T>(key: string, defaultValue: T): T {
  try {
    const candidateKeys = KEY_ALIASES[key] || [key];
    for (const candidateKey of candidateKeys) {
      const raw = localStorage.getItem(candidateKey);
      if (!raw || raw === "undefined" || raw === "null") continue;
      const parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) continue;
      if (Array.isArray(defaultValue) && Array.isArray(parsed) && parsed.length === 0) {
        // If empty array, continue to check if another alias has populated records
        continue;
      }
      if (typeof defaultValue === "object" && defaultValue !== null && !Array.isArray(defaultValue)) {
        return { ...defaultValue, ...parsed };
      }
      return parsed;
    }

    // Try standard fallback load for initial key
    const directRaw = localStorage.getItem(key);
    if (directRaw && directRaw !== "undefined" && directRaw !== "null") {
      const parsed = JSON.parse(directRaw);
      if (parsed !== null && parsed !== undefined) {
        if (typeof defaultValue === "object" && defaultValue !== null && !Array.isArray(defaultValue)) {
          return { ...defaultValue, ...parsed };
        }
        return parsed;
      }
    }

    return defaultValue;
  } catch (err) {
    console.error(`Error loading storage for key ${key}:`, err);
    return defaultValue;
  }
}

export const loadFromStorage = loadStoredData;

export function saveStoredData<T>(key: string, value: T): void {
  try {
    const jsonStr = JSON.stringify(value);
    const candidateKeys = KEY_ALIASES[key] || [key];
    
    // Save to all key aliases simultaneously for complete sync
    for (const candidateKey of candidateKeys) {
      localStorage.setItem(candidateKey, jsonStr);
    }
    
    // Update global last saved timestamp
    localStorage.setItem("app_last_saved_timestamp", new Date().toISOString());
    localStorage.setItem("app_last_save_status", "saved");
  } catch (err) {
    console.error(`Error saving storage for key ${key}:`, err);
  }
}

export const saveToStorage = saveStoredData;

export function resetAllToDefault(): void {
  localStorage.clear();
  window.location.reload();
}

export function exportDataToJSON(data: any, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(headers: string[], rows: (string | number)[][], filename: string): void {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? "");
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getIndonesianNationalHolidayName(dateYMD: string): string | null {
  const indonesianNationalHolidays: Record<string, string> = {
    "2026-01-01": "Tahun Baru 2026 Masehi",
    "2026-01-16": "Isra Mikraj Nabi Muhammad SAW",
    "2026-02-17": "Tahun Baru Imlek 2577 Kongzili",
    "2026-03-19": "Hari Suci Nyepi (Tahun Baru Saka 1948)",
    "2026-03-20": "Hari Raya Idul Fitri 1447 Hijriah (Hari 1)",
    "2026-03-21": "Hari Raya Idul Fitri 1447 Hijriah (Hari 2)",
    "2026-04-03": "Wafat Yesus Kristus",
    "2026-04-05": "Hari Paskah",
    "2026-05-01": "Hari Buruh Internasional",
    "2026-05-14": "Kenaikan Yesus Kristus",
    "2026-05-27": "Hari Raya Idul Adha 1447 Hijriah",
    "2026-05-31": "Hari Raya Waisak 2570 BE",
    "2026-06-01": "Hari Lahir Pancasila",
    "2026-06-16": "Tahun Baru Islam 1448 Hijriah",
    "2026-08-17": "Hari Kemerdekaan Republik Indonesia ke-81",
    "2026-08-25": "Maulid Nabi Muhammad SAW",
    "2026-12-25": "Hari Raya Natal",
  };
  return indonesianNationalHolidays[dateYMD] || null;
}

export { STORAGE_KEYS };
