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
};

export function loadStoredData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "undefined" || raw === "null") return defaultValue;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return defaultValue;
    if (typeof defaultValue === "object" && defaultValue !== null && !Array.isArray(defaultValue)) {
      return { ...defaultValue, ...parsed };
    }
    return parsed;
  } catch (err) {
    console.error(`Error loading storage for key ${key}:`, err);
    return defaultValue;
  }
}

export const loadFromStorage = loadStoredData;

export function saveStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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
