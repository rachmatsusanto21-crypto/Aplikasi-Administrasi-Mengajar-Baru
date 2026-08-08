import React, { useState, useMemo, useEffect } from "react";
import { AcademicCalendarEvent, SchoolIdentity, TimetableSlot, IncidentalJournalEntry, ProtaItem } from "../../types";
import { Calendar, Plus, Trash2, Edit2, Printer, Download, Calculator, FileText, Settings, Clock, BookOpen, Save, CheckCircle2, CheckSquare, Square, RotateCcw, Layers, X, Filter, Check, Edit, AlertCircle } from "lucide-react";
import { exportToCSV, loadFromStorage, saveToStorage, STORAGE_KEYS } from "../../lib/storage";
import { exportHtmlToDoc } from "../../lib/exportDoc";

interface AcademicCalendarViewProps {
  schoolIdentity: SchoolIdentity;
  events: AcademicCalendarEvent[];
  timetable: TimetableSlot[];
  subjects: string[];
  incidentalJournals?: IncidentalJournalEntry[];
  protaList?: ProtaItem[];
  onUpdateSchoolIdentity: (updated: SchoolIdentity) => void;
  onSaveEvents: (updated: AcademicCalendarEvent[]) => void;
  onOpenPrint: (title: string, subtitle: string, content: React.ReactNode) => void;
}

export const AcademicCalendarView: React.FC<AcademicCalendarViewProps> = ({
  schoolIdentity,
  events,
  timetable,
  subjects: propSubjects = [
    "Bahasa Indonesia",
    "Matematika",
    "IPAS",
    "Pancasila",
    "Seni Budaya",
    "PJOK",
    "Kokurikuler (P5)",
    "Kokurikuler",
  ],
  incidentalJournals = [],
  protaList = [],
  onUpdateSchoolIdentity,
  onSaveEvents,
  onOpenPrint,
}) => {
  const subjects = propSubjects && propSubjects.length > 0 ? propSubjects : [
    "Bahasa Indonesia",
    "Matematika",
    "IPAS",
    "Pancasila",
    "Seni Budaya",
    "PJOK",
    "Kokurikuler (P5)",
    "Kokurikuler",
  ];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Form states for calendar config
  const [startDate, setStartDate] = useState(schoolIdentity.academicYearStartDate || "2025-07-14");
  const [endDate, setEndDate] = useState(schoolIdentity.academicYearEndDate || "2026-06-20");
  const [academicYearStr, setAcademicYearStr] = useState(schoolIdentity.academicYear || "2025/2026");

  const [form, setForm] = useState<Partial<AcademicCalendarEvent>>({
    date: new Date().toISOString().slice(0, 10),
    type: "Libur",
  });

  const handleSaveConfig = () => {
    onUpdateSchoolIdentity({
      ...schoolIdentity,
      academicYear: academicYearStr,
      academicYearStartDate: startDate,
      academicYearEndDate: endDate,
    });
    setIsConfigOpen(false);
  };

  const months = [
    { name: "Juli 2025", totalDays: 31, defaultEffective: 14, defaultWeeks: 2 },
    { name: "Agustus 2025", totalDays: 31, defaultEffective: 21, defaultWeeks: 4 },
    { name: "September 2025", totalDays: 30, defaultEffective: 22, defaultWeeks: 4 },
    { name: "Oktober 2025", totalDays: 31, defaultEffective: 23, defaultWeeks: 5 },
    { name: "November 2025", totalDays: 30, defaultEffective: 21, defaultWeeks: 4 },
    { name: "Desember 2025", totalDays: 31, defaultEffective: 12, defaultWeeks: 2 },
    { name: "Januari 2026", totalDays: 31, defaultEffective: 20, defaultWeeks: 4 },
    { name: "Februari 2026", totalDays: 28, defaultEffective: 19, defaultWeeks: 4 },
    { name: "Maret 2026", totalDays: 31, defaultEffective: 18, defaultWeeks: 3 },
    { name: "April 2026", totalDays: 30, defaultEffective: 20, defaultWeeks: 4 },
    { name: "Mei 2026", totalDays: 31, defaultEffective: 18, defaultWeeks: 3 },
    { name: "Juni 2026", totalDays: 30, defaultEffective: 10, defaultWeeks: 2 },
  ];

  // Helper map for Day Names to JS Date getDay()
  const dayNameToIndex: Record<string, number> = {
    Minggu: 0,
    Senin: 1,
    Selasa: 2,
    Rabu: 3,
    Kamis: 4,
    Jumat: 5,
    Sabtu: 6,
  };

  // Helper to check if a YYYY-MM-DD date falls on a holiday or event
  const isDateHolidayOrEvent = (dateStr: string) => {
    // Check calendar events
    const matchingEvt = events.find((e) => {
      if (e.type !== "Libur" && e.type !== "Kegiatan Sekolah") return false;
      if (!e.endDate) return e.date === dateStr;
      return dateStr >= e.date && dateStr <= e.endDate;
    });

    if (matchingEvt) return { isHoliday: true, reason: matchingEvt.title, type: matchingEvt.type };

    // Check incidental journals if any
    const matchingInc = incidentalJournals.find((j) => j.date === dateStr);
    if (matchingInc) return { isHoliday: true, reason: matchingInc.activityName, type: "Insidental" };

    return { isHoliday: false, reason: "", type: "" };
  };

  // Sorted events chronologically from the start of the academic year
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      return dateA.localeCompare(dateB);
    });
  }, [events]);

  // Calculation of Effective Days & Hours per Subject
  const subjectCalculations = useMemo(() => {
    // Parse YYYY-MM-DD at noon local time to avoid timezone drift
    const parseLocalYMD = (str: string) => {
      const parts = (str || "").split("-").map(Number);
      if (parts.length < 3) return new Date();
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    };

    const formatLocalYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const start = parseLocalYMD(startDate);
    const end = parseLocalYMD(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return [];
    }

    // Build map of weekly timetable slots per subject
    // e.g., subject -> { "Senin": 3, "Selasa": 2 }
    const subjectDaySlots: Record<string, Record<string, number>> = {};

    subjects.forEach((sub) => {
      subjectDaySlots[sub] = {
        Senin: 0,
        Selasa: 0,
        Rabu: 0,
        Kamis: 0,
        Jumat: 0,
        Sabtu: 0,
      };
    });

    // Normalize subject strings to eliminate whitespace/casing mismatches
    const normalizeSub = (str: string) => (str || "").toLowerCase().trim().replace(/\s+/g, " ");

    // Deduplicate slots by unique key `${slot.day}_${slot.period}` to prevent duplicate entries
    const uniqueSlotsMap = new Map<string, TimetableSlot>();
    (timetable || []).forEach((slot) => {
      if (slot.day && slot.period && slot.subject && slot.subject.trim() !== "") {
        const key = `${slot.day.trim()}_${slot.period}`;
        uniqueSlotsMap.set(key, slot);
      }
    });

    uniqueSlotsMap.forEach((slot) => {
      const slotSubNorm = normalizeSub(slot.subject);
      const matchedSub = subjects.find((s) => {
        const sNorm = normalizeSub(s);
        if (sNorm === slotSubNorm) return true;
        if (
          (sNorm.includes("kokurikuler") || sNorm.includes("p5")) &&
          (slotSubNorm.includes("kokurikuler") || slotSubNorm.includes("p5"))
        ) {
          return true;
        }
        return false;
      });
      if (matchedSub && subjectDaySlots[matchedSub]) {
        const dayKey = slot.day.trim();
        if (subjectDaySlots[matchedSub][dayKey] !== undefined) {
          subjectDaySlots[matchedSub][dayKey] += 1; // 1 JP per period slot
        }
      }
    });

    // Loop date by date from start to end
    const results: Record<
      string,
      {
        subject: string;
        weeklyScheduleSummary: string;
        weeklyJP: number;
        totalScheduledMeetings: number;
        holidayMeetingsLost: number;
        effectiveMeetings: number;
        totalJP: number;
        lostJP: number;
        effectiveJP: number;
        sem1EffectiveMeetings: number;
        sem1EffectiveJP: number;
        sem2EffectiveMeetings: number;
        sem2EffectiveJP: number;
      }
    > = {};

    subjects.forEach((sub) => {
      const scheduleMap = subjectDaySlots[sub] || {};
      const scheduledDays = Object.entries(scheduleMap).filter(([_, count]) => count > 0);
      const weeklyJP = scheduledDays.reduce((acc, [_, count]) => acc + count, 0);
      const weeklyScheduleSummary =
        scheduledDays.length > 0
          ? scheduledDays.map(([day, count]) => `${day} (${count} JP)`).join(", ") + ` → Total ${weeklyJP} JP/minggu`
          : "Belum Diatur di Jadwal";

      results[sub] = {
        subject: sub,
        weeklyScheduleSummary,
        weeklyJP,
        totalScheduledMeetings: 0,
        holidayMeetingsLost: 0,
        effectiveMeetings: 0,
        totalJP: 0,
        lostJP: 0,
        effectiveJP: 0,
        sem1EffectiveMeetings: 0,
        sem1EffectiveJP: 0,
        sem2EffectiveMeetings: 0,
        sem2EffectiveJP: 0,
      };
    });

    const curr = new Date(start);
    while (curr <= end) {
      const dayIdx = curr.getDay(); // 0 = Sun, 1 = Mon ...
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const currentDayName = dayNames[dayIdx];

      // Format date YYYY-MM-DD cleanly using local date getters
      const dateStr = formatLocalYMD(curr);
      const holidayInfo = isDateHolidayOrEvent(dateStr);

      const monthIdx = curr.getMonth();
      const isSem1 = monthIdx >= 6; // July(6) to Dec(11) is Semester 1 (Ganjil)

      if (dayIdx !== 0) {
        // Skip Sundays
        subjects.forEach((sub) => {
          const jpOnDay = subjectDaySlots[sub]?.[currentDayName] || 0;
          if (jpOnDay > 0) {
            results[sub].totalScheduledMeetings += 1;
            results[sub].totalJP += jpOnDay;

            if (holidayInfo.isHoliday) {
              results[sub].holidayMeetingsLost += 1;
              results[sub].lostJP += jpOnDay; // Deducts the exact JP allocated for that day
            } else {
              results[sub].effectiveMeetings += 1;
              results[sub].effectiveJP += jpOnDay;

              if (isSem1) {
                results[sub].sem1EffectiveMeetings += 1;
                results[sub].sem1EffectiveJP += jpOnDay;
              } else {
                results[sub].sem2EffectiveMeetings += 1;
                results[sub].sem2EffectiveJP += jpOnDay;
              }
            }
          }
        });
      }

      curr.setDate(curr.getDate() + 1);
    }

    return Object.values(results);
  }, [startDate, endDate, subjects, timetable, events, incidentalJournals]);

  // State for Subject & Semester Active Days/Hours Detailed Breakdown Table
  const [selectedSubjectTab, setSelectedSubjectTab] = useState<string>(subjects[0] || "Bahasa Indonesia");
  const [selectedSemesterTab, setSelectedSemesterTab] = useState<number>(1);
  const [customWeeklyData, setCustomWeeklyData] = useState<
    Record<string, { activeDates: string; jpPerWeek: string; allocatedHours: number; tpCode: string; tpDescription: string }>
  >(() => loadFromStorage(STORAGE_KEYS.SUBJECT_WEEKLY_ACTIVE_DAYS, {}));
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // States & Persistence for Table 1: Summary Calculation Table (Select, Edit, Hapus)
  const [hiddenCalcSubjects, setHiddenCalcSubjects] = useState<string[]>(() =>
    loadFromStorage("adm_guru_hidden_calc_subjects", [])
  );
  const [subjectCalcOverrides, setSubjectCalcOverrides] = useState<Record<string, Partial<any>>>(() =>
    loadFromStorage("adm_guru_subject_calc_overrides", {})
  );
  const [customCalcSubjects, setCustomCalcSubjects] = useState<any[]>(() =>
    loadFromStorage("adm_guru_custom_calc_subjects", [])
  );
  const [selectedCalcSubjects, setSelectedCalcSubjects] = useState<string[]>([]);
  const [editingCalcSubject, setEditingCalcSubject] = useState<any | null>(null);
  const [isAddCustomCalcModalOpen, setIsAddCustomCalcModalOpen] = useState<boolean>(false);

  // Derived Summary Calculations with Overrides, Custom Subjects, and Hidden Subjects Filter
  const displayedSubjectCalculations = useMemo(() => {
    const base = subjectCalculations.filter((sc) => !hiddenCalcSubjects.includes(sc.subject));
    const merged = base.map((sc) => {
      if (subjectCalcOverrides[sc.subject]) {
        return { ...sc, ...subjectCalcOverrides[sc.subject] };
      }
      return sc;
    });
    const customFiltered = customCalcSubjects.filter((c) => !hiddenCalcSubjects.includes(c.subject));
    return [...merged, ...customFiltered];
  }, [subjectCalculations, hiddenCalcSubjects, subjectCalcOverrides, customCalcSubjects]);

  // Handlers for Table 1 (Summary Table)
  const handleToggleSelectCalcSubject = (subName: string) => {
    setSelectedCalcSubjects((prev) =>
      prev.includes(subName) ? prev.filter((s) => s !== subName) : [...prev, subName]
    );
  };

  const handleSelectAllCalcSubjects = () => {
    if (selectedCalcSubjects.length === displayedSubjectCalculations.length) {
      setSelectedCalcSubjects([]);
    } else {
      setSelectedCalcSubjects(displayedSubjectCalculations.map((sc) => sc.subject));
    }
  };

  const handleDeleteCalcSubject = (subName: string) => {
    const nextHidden = [...hiddenCalcSubjects, subName];
    setHiddenCalcSubjects(nextHidden);
    saveToStorage("adm_guru_hidden_calc_subjects", nextHidden);
    setCustomCalcSubjects((prev) => {
      const filtered = prev.filter((item) => item.subject !== subName);
      saveToStorage("adm_guru_custom_calc_subjects", filtered);
      return filtered;
    });
    setSelectedCalcSubjects((prev) => prev.filter((s) => s !== subName));
    setSaveStatus(`Mata pelajaran "${subName}" berhasil dihapus dari tabel hitungan.`);
  };

  const handleBulkDeleteCalcSubjects = () => {
    if (selectedCalcSubjects.length === 0) return;
    const nextHidden = Array.from(new Set([...hiddenCalcSubjects, ...selectedCalcSubjects]));
    setHiddenCalcSubjects(nextHidden);
    saveToStorage("adm_guru_hidden_calc_subjects", nextHidden);
    setCustomCalcSubjects((prev) => {
      const filtered = prev.filter((item) => !selectedCalcSubjects.includes(item.subject));
      saveToStorage("adm_guru_custom_calc_subjects", filtered);
      return filtered;
    });
    setSaveStatus(`${selectedCalcSubjects.length} mata pelajaran berhasil dihapus.`);
    setSelectedCalcSubjects([]);
  };

  const handleResetCalcTable = () => {
    setHiddenCalcSubjects([]);
    setSubjectCalcOverrides({});
    setCustomCalcSubjects([]);
    setSelectedCalcSubjects([]);
    saveToStorage("adm_guru_hidden_calc_subjects", []);
    saveToStorage("adm_guru_subject_calc_overrides", {});
    saveToStorage("adm_guru_custom_calc_subjects", []);
    setSaveStatus("Tabel hitungan hari & JP telah disegarkan ke hitungan asli.");
  };

  const handleSaveSubjectCalcOverride = (updatedItem: any) => {
    if (!updatedItem || !updatedItem.subject) return;
    const isCustomItem = customCalcSubjects.some((c) => c.subject === updatedItem.subject) || updatedItem.isCustom;

    if (isCustomItem) {
      setCustomCalcSubjects((prev) => {
        const idx = prev.findIndex((c) => c.subject === updatedItem.subject);
        let next: any[];
        if (idx >= 0) {
          next = [...prev];
          next[idx] = updatedItem;
        } else {
          next = [...prev, { ...updatedItem, isCustom: true }];
        }
        saveToStorage("adm_guru_custom_calc_subjects", next);
        return next;
      });
    } else {
      const nextOverrides = {
        ...subjectCalcOverrides,
        [updatedItem.subject]: updatedItem,
      };
      setSubjectCalcOverrides(nextOverrides);
      saveToStorage("adm_guru_subject_calc_overrides", nextOverrides);
    }
    setEditingCalcSubject(null);
    setIsAddCustomCalcModalOpen(false);
    setSaveStatus(`Data hitungan untuk ${updatedItem.subject} berhasil disimpan.`);
  };

  // States & Persistence for Table 2: Detailed Weekly Active Days & Hours Table (Select, Edit, Hapus)
  const [selectedWeekKeys, setSelectedWeekKeys] = useState<string[]>([]);
  const [editingWeeklyRow, setEditingWeeklyRow] = useState<{ mIdx: number; weekNum: number; weekData: any } | null>(null);
  const [isBulkEditWeeklyModalOpen, setIsBulkEditWeeklyModalOpen] = useState<boolean>(false);
  const [bulkWeeklyEditForm, setBulkWeeklyEditForm] = useState<{
    jpPerWeek: string;
    allocatedHours: number;
    tpCode: string;
    tpDescription: string;
  }>({ jpPerWeek: "", allocatedHours: 0, tpCode: "", tpDescription: "" });

  const handleToggleSelectWeek = (key: string) => {
    setSelectedWeekKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleClearWeekData = (mIdx: number, weekNum: number) => {
    const key = `${selectedSubjectTab}_s${selectedSemesterTab}_m${mIdx}_w${weekNum}`;
    const cleared = {
      activeDates: "",
      jpPerWeek: "",
      allocatedHours: 0,
      tpCode: "",
      tpDescription: "",
    };
    const nextCustom = {
      ...customWeeklyData,
      [key]: cleared,
    };
    setCustomWeeklyData(nextCustom);
    saveToStorage(STORAGE_KEYS.SUBJECT_WEEKLY_ACTIVE_DAYS, nextCustom);
    setSaveStatus(`Data minggu ke-${weekNum} berhasil dikosongkan/dihapus.`);
  };

  const handleBulkClearWeeks = () => {
    if (selectedWeekKeys.length === 0) return;
    const nextCustom = { ...customWeeklyData };
    selectedWeekKeys.forEach((key) => {
      nextCustom[key] = {
        activeDates: "",
        jpPerWeek: "",
        allocatedHours: 0,
        tpCode: "",
        tpDescription: "",
      };
    });
    setCustomWeeklyData(nextCustom);
    saveToStorage(STORAGE_KEYS.SUBJECT_WEEKLY_ACTIVE_DAYS, nextCustom);
    setSaveStatus(`${selectedWeekKeys.length} minggu berhasil dikosongkan/dihapus.`);
    setSelectedWeekKeys([]);
  };

  const handleApplyBulkWeeklyEdit = () => {
    if (selectedWeekKeys.length === 0) return;
    const nextCustom = { ...customWeeklyData };
    selectedWeekKeys.forEach((key) => {
      const existing = nextCustom[key] || {
        activeDates: "",
        jpPerWeek: "",
        allocatedHours: 0,
        tpCode: "",
        tpDescription: "",
      };
      nextCustom[key] = {
        ...existing,
        ...(bulkWeeklyEditForm.jpPerWeek !== "" ? { jpPerWeek: bulkWeeklyEditForm.jpPerWeek } : {}),
        ...(bulkWeeklyEditForm.allocatedHours > 0 ? { allocatedHours: bulkWeeklyEditForm.allocatedHours } : {}),
        ...(bulkWeeklyEditForm.tpCode !== "" ? { tpCode: bulkWeeklyEditForm.tpCode } : {}),
        ...(bulkWeeklyEditForm.tpDescription !== "" ? { tpDescription: bulkWeeklyEditForm.tpDescription } : {}),
      };
    });
    setCustomWeeklyData(nextCustom);
    saveToStorage(STORAGE_KEYS.SUBJECT_WEEKLY_ACTIVE_DAYS, nextCustom);
    setSaveStatus(`${selectedWeekKeys.length} minggu berhasil diperbarui massal.`);
    setIsBulkEditWeeklyModalOpen(false);
    setSelectedWeekKeys([]);
  };

  // Parse start year from academic startDate
  const startYear = useMemo(() => {
    const yr = parseInt((startDate || "2026-07-14").split("-")[0], 10);
    return isNaN(yr) ? 2026 : yr;
  }, [startDate]);

  // Compute 6 months for selected semester
  const semesterMonths = useMemo(() => {
    if (selectedSemesterTab === 1) {
      return [
        { name: "Juli", year: startYear, monthNum: 7 },
        { name: "Agustus", year: startYear, monthNum: 8 },
        { name: "September", year: startYear, monthNum: 9 },
        { name: "Oktober", year: startYear, monthNum: 10 },
        { name: "November", year: startYear, monthNum: 11 },
        { name: "Desember", year: startYear, monthNum: 12 },
      ];
    } else {
      return [
        { name: "Januari", year: startYear + 1, monthNum: 1 },
        { name: "Februari", year: startYear + 1, monthNum: 2 },
        { name: "Maret", year: startYear + 1, monthNum: 3 },
        { name: "April", year: startYear + 1, monthNum: 4 },
        { name: "Mei", year: startYear + 1, monthNum: 5 },
        { name: "Juni", year: startYear + 1, monthNum: 6 },
      ];
    }
  }, [selectedSemesterTab, startYear]);

  // Map timetable slot day count per subject
  const currentSubjectDayJPMap = useMemo(() => {
    const dayMap: Record<string, number> = {
      Senin: 0,
      Selasa: 0,
      Rabu: 0,
      Kamis: 0,
      Jumat: 0,
      Sabtu: 0,
    };
    const normSel = (selectedSubjectTab || "").toLowerCase().trim().replace(/\s+/g, " ");

    const uniqueSlotsMap = new Map<string, TimetableSlot>();
    (timetable || []).forEach((slot) => {
      if (slot.day && slot.period && slot.subject && slot.subject.trim() !== "") {
        const key = `${slot.day.trim()}_${slot.period}`;
        uniqueSlotsMap.set(key, slot);
      }
    });

    uniqueSlotsMap.forEach((slot) => {
      const slotNorm = (slot.subject || "").toLowerCase().trim().replace(/\s+/g, " ");
      if (slotNorm === normSel) {
        const dayKey = slot.day.trim();
        if (dayMap[dayKey] !== undefined) {
          dayMap[dayKey] += 1;
        }
      }
    });

    return dayMap;
  }, [selectedSubjectTab, timetable]);

  // Filter protaList for selected subject & semester
  const subjectProtaList = useMemo(() => {
    const normSel = (selectedSubjectTab || "").toLowerCase().trim().replace(/\s+/g, " ");
    return (protaList || []).filter((p) => {
      const pNorm = (p.subject || "").toLowerCase().trim().replace(/\s+/g, " ");
      const pSem = String(p.semester);
      return pNorm === normSel && (pSem === String(selectedSemesterTab) || pSem.includes(String(selectedSemesterTab)));
    });
  }, [selectedSubjectTab, selectedSemesterTab, protaList]);

  // All Prota items for selected subject (across both semesters for easy cross-semester lookup)
  const allSubjectProtaList = useMemo(() => {
    const normSel = (selectedSubjectTab || "").toLowerCase().trim().replace(/\s+/g, " ");
    return (protaList || []).filter((p) => {
      const pNorm = (p.subject || "").toLowerCase().trim().replace(/\s+/g, " ");
      return pNorm === normSel;
    });
  }, [selectedSubjectTab, protaList]);

  // Compute dynamic weekly dataset for the selected subject and semester
  const computedSubjectWeeklyData = useMemo(() => {
    const result: Array<{
      monthIndex: number;
      monthName: string;
      year: number;
      monthTitle: string;
      weeks: Array<{
        weekNum: number;
        activeDates: string;
        jpPerWeek: string;
        allocatedHours: number;
        tpCode: string;
        tpDescription: string;
      }>;
      monthlyTotalHours: number;
    }> = [];

    let tpPointer = 0;

    semesterMonths.forEach((mObj, mIdx) => {
      const daysInMonth = new Date(mObj.year, mObj.monthNum, 0).getDate();
      const weeksArr: Array<{
        weekNum: number;
        activeDates: string;
        jpPerWeek: string;
        allocatedHours: number;
        tpCode: string;
        tpDescription: string;
      }> = [];

      let monthlySum = 0;

      for (let w = 1; w <= 5; w++) {
        const key = `${selectedSubjectTab}_s${selectedSemesterTab}_m${mIdx}_w${w}`;

        if (customWeeklyData[key]) {
          const cust = customWeeklyData[key];
          weeksArr.push({
            weekNum: w,
            activeDates: cust.activeDates,
            jpPerWeek: cust.jpPerWeek,
            allocatedHours: cust.allocatedHours,
            tpCode: cust.tpCode,
            tpDescription: cust.tpDescription,
          });
          monthlySum += cust.allocatedHours;
        } else {
          // Auto calculate from calendar dates & timetable
          const startDay = (w - 1) * 7 + 1;
          const endDay = w === 5 ? daysInMonth : w * 7;

          const activeDatesList: string[] = [];
          const jpList: number[] = [];
          let weekJPSum = 0;

          if (startDay <= daysInMonth) {
            for (let d = startDay; d <= endDay; d++) {
              const dt = new Date(mObj.year, mObj.monthNum - 1, d, 12, 0, 0);
              const dayIdx = dt.getDay(); // 0 = Sun
              const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
              const dayName = dayNames[dayIdx];

              const yStr = dt.getFullYear();
              const mStr = String(dt.getMonth() + 1).padStart(2, "0");
              const dStr = String(dt.getDate()).padStart(2, "0");
              const dateYMD = `${yStr}-${mStr}-${dStr}`;

              if (dayIdx !== 0) {
                const dayJP = currentSubjectDayJPMap[dayName] || 0;
                if (dayJP > 0) {
                  const hol = isDateHolidayOrEvent(dateYMD);
                  if (!hol.isHoliday) {
                    activeDatesList.push(`${d}/${mObj.monthNum}`);
                    jpList.push(dayJP);
                    weekJPSum += dayJP;
                  }
                }
              }
            }
          }

          let activeDatesStr = activeDatesList.length > 0 ? activeDatesList.join("; ") + "; " : "";
          let jpPerWeekStr = jpList.length > 0 ? jpList.join("; ") : "0";
          let tpCode = "";
          let tpDescription = "";

          if (weekJPSum > 0) {
            if (subjectProtaList.length > 0) {
              const matchedTP = subjectProtaList[tpPointer % subjectProtaList.length];
              tpCode = matchedTP.codeTP || matchedTP.tpCode || `TP-${(selectedSubjectTab || "").slice(0, 3).toUpperCase()}-5.${tpPointer + 1}`;
              tpDescription = matchedTP.tpDescription || matchedTP.descriptionTP || "";
              tpPointer++;
            }
          }

          weeksArr.push({
            weekNum: w,
            activeDates: activeDatesStr,
            jpPerWeek: jpPerWeekStr,
            allocatedHours: weekJPSum,
            tpCode,
            tpDescription,
          });

          monthlySum += weekJPSum;
        }
      }

      result.push({
        monthIndex: mIdx,
        monthName: mObj.name,
        year: mObj.year,
        monthTitle: `${mObj.name} ${mObj.year}`,
        weeks: weeksArr,
        monthlyTotalHours: monthlySum,
      });
    });

    return result;
  }, [
    selectedSubjectTab,
    selectedSemesterTab,
    semesterMonths,
    customWeeklyData,
    currentSubjectDayJPMap,
    subjectProtaList,
    events,
    incidentalJournals,
  ]);

  // Grand total hours for subject in selected semester
  const grandTotalSemesterHours = useMemo(() => {
    return computedSubjectWeeklyData.reduce((acc, m) => acc + m.monthlyTotalHours, 0);
  }, [computedSubjectWeeklyData]);

  // Handler for custom cell edit in weekly breakdown table
  const handleUpdateWeeklyCell = (
    mIdx: number,
    wNum: number,
    field: "activeDates" | "jpPerWeek" | "allocatedHours" | "tpCode" | "tpDescription",
    val: string | number
  ) => {
    const key = `${selectedSubjectTab}_s${selectedSemesterTab}_m${mIdx}_w${wNum}`;
    const monthData = computedSubjectWeeklyData[mIdx];
    const currentWeek = monthData ? monthData.weeks[wNum - 1] : null;

    if (!currentWeek) return;

    let autoAllocatedHours = currentWeek.allocatedHours;
    if (field === "jpPerWeek" && typeof val === "string") {
      const parsedNumbers = val.match(/\d+/g);
      if (parsedNumbers && parsedNumbers.length > 0) {
        autoAllocatedHours = parsedNumbers.reduce((a, b) => a + (parseInt(b, 10) || 0), 0);
      } else if (val.trim() === "") {
        autoAllocatedHours = 0;
      }
    }

    const updated = {
      activeDates: currentWeek.activeDates,
      jpPerWeek: currentWeek.jpPerWeek,
      allocatedHours: field === "allocatedHours" ? Number(val) || 0 : autoAllocatedHours,
      tpCode: currentWeek.tpCode,
      tpDescription: currentWeek.tpDescription,
      [field]: val,
    };

    setCustomWeeklyData((prev) => ({
      ...prev,
      [key]: updated,
    }));
  };

  // Function to recalculate & sum all weekly allocated JP automatically
  const handleAutoSumAllWeeklyJP = () => {
    const updatedMap = { ...customWeeklyData };
    computedSubjectWeeklyData.forEach((m, mIdx) => {
      m.weeks.forEach((w) => {
        const key = `${selectedSubjectTab}_s${selectedSemesterTab}_m${mIdx}_w${w.weekNum}`;
        const currentJPStr = w.jpPerWeek || "";
        const parsedNumbers = currentJPStr.match(/\d+/g);
        let sum = 0;
        if (parsedNumbers && parsedNumbers.length > 0) {
          sum = parsedNumbers.reduce((a, b) => a + (parseInt(b, 10) || 0), 0);
        } else if (w.activeDates && w.activeDates.trim() !== "") {
          const datesCount = w.activeDates.split(";").filter((d) => d.trim() !== "").length;
          sum = datesCount * 2;
        } else {
          sum = w.allocatedHours;
        }
        updatedMap[key] = {
          activeDates: w.activeDates,
          jpPerWeek: w.jpPerWeek,
          allocatedHours: sum,
          tpCode: w.tpCode,
          tpDescription: w.tpDescription,
        };
      });
    });
    setCustomWeeklyData(updatedMap);
  };

  // Handler when selecting a TP from Prota dropdown
  const handleSelectTPForWeek = (
    mIdx: number,
    wNum: number,
    selectedTpId: string
  ) => {
    if (!selectedTpId) {
      handleUpdateWeeklyCell(mIdx, wNum, "tpCode", "");
      handleUpdateWeeklyCell(mIdx, wNum, "tpDescription", "");
      return;
    }

    const matched = (protaList || []).find((p) => p.id === selectedTpId);
    if (!matched) return;

    const code = matched.codeTP || matched.tpCode || "";
    const desc = matched.tpDescription || "";

    const key = `${selectedSubjectTab}_s${selectedSemesterTab}_m${mIdx}_w${wNum}`;
    const monthData = computedSubjectWeeklyData[mIdx];
    const currentWeek = monthData ? monthData.weeks[wNum - 1] : null;

    if (!currentWeek) return;

    const updated = {
      activeDates: currentWeek.activeDates,
      jpPerWeek: currentWeek.jpPerWeek,
      allocatedHours: currentWeek.allocatedHours,
      tpCode: code,
      tpDescription: desc,
    };

    setCustomWeeklyData((prev) => ({
      ...prev,
      [key]: updated,
    }));
  };

  // Explicit save function for "Tabel Hari Aktif per Semester per Mata Pelajaran"
  const handleSaveWeeklyData = () => {
    const updatedMap = { ...customWeeklyData };

    // Snapshot current computed weekly data so all auto-calculated or edited rows for this subject & semester are saved
    computedSubjectWeeklyData.forEach((m, mIdx) => {
      m.weeks.forEach((w) => {
        const key = `${selectedSubjectTab}_s${selectedSemesterTab}_m${mIdx}_w${w.weekNum}`;
        if (!updatedMap[key]) {
          updatedMap[key] = {
            activeDates: w.activeDates,
            jpPerWeek: w.jpPerWeek,
            allocatedHours: w.allocatedHours,
            tpCode: w.tpCode,
            tpDescription: w.tpDescription,
          };
        }
      });
    });

    setCustomWeeklyData(updatedMap);
    saveToStorage(STORAGE_KEYS.SUBJECT_WEEKLY_ACTIVE_DAYS, updatedMap);
    setSaveStatus(`✅ Tabel Hari Aktif ${selectedSubjectTab} Semester ${selectedSemesterTab} berhasil disimpan! Data tidak akan kembali ke default saat dibuka kembali.`);
    setTimeout(() => setSaveStatus(null), 4000);
  };

  const handleResetWeeklyData = () => {
    if (window.confirm("Apakah Anda yakin ingin menyegarkan & mengembalikan tabel hari aktif ke otomatisasi awal?")) {
      setCustomWeeklyData({});
      saveToStorage(STORAGE_KEYS.SUBJECT_WEEKLY_ACTIVE_DAYS, {});
      setSaveStatus("Tabel Hari Aktif telah dikembalikan ke otomatisasi awal.");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Export Subject Effective Table to Word (.docx)
  const handleExportDocSubjectEffectiveTable = () => {
    let rowsHtml = "";

    computedSubjectWeeklyData.forEach((m) => {
      // Month Subheader
      rowsHtml += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td style="border: 1px solid #333; padding: 5px; text-align: center;">-</td>
          <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold;">minggu ke</td>
          <td style="border: 1px solid #333; padding: 5px; text-align: left; font-weight: bold;">tanggal aktif ${m.monthTitle.toLowerCase()}</td>
          <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold;">jp per minggu</td>
          <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold;">alokasi jam</td>
          <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold;">jumlah jam ${m.monthTitle}</td>
          <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold;">kode tp</td>
          <td style="border: 1px solid #333; padding: 5px; text-align: left; font-weight: bold;">deskripsi tp</td>
        </tr>
      `;

      m.weeks.forEach((w, wIdx) => {
        const isFirstRow = wIdx === 0;
        rowsHtml += `
          <tr>
            ${
              isFirstRow
                ? `<td rowspan="5" style="border: 1px solid #333; padding: 5px; font-weight: bold; text-align: left; vertical-align: top;">${selectedSubjectTab.toLowerCase()}</td>`
                : ""
            }
            <td style="border: 1px solid #333; padding: 5px; text-align: center;">${w.weekNum}</td>
            <td style="border: 1px solid #333; padding: 5px;">${w.activeDates || "-"}</td>
            <td style="border: 1px solid #333; padding: 5px; text-align: center;">${w.jpPerWeek}</td>
            <td style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold;">${w.allocatedHours}</td>
            ${
              isFirstRow
                ? `<td rowspan="5" style="border: 1px solid #333; padding: 5px; text-align: center; font-weight: bold; vertical-align: middle; background-color: #f1f5f9;">${m.monthlyTotalHours}</td>`
                : ""
            }
            <td style="border: 1px solid #333; padding: 5px; font-weight: bold;">${w.tpCode || "-"}</td>
            <td style="border: 1px solid #333; padding: 5px;">${w.tpDescription || "-"}</td>
          </tr>
        `;
      });
    });

    const docHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 10pt;">
        <h3 style="text-align: center; font-size: 13pt; text-transform: uppercase; margin-bottom: 2px;">TABEL HARI AKTIF PER SEMESTER PER MATA PELAJARAN</h3>
        <p style="text-align: center; font-weight: bold; margin-top: 0; color: #333;">Mata Pelajaran: ${selectedSubjectTab} | Semester ${selectedSemesterTab} (${selectedSemesterTab === 1 ? "Ganjil" : "Genap"})</p>
        <p style="text-align: center; font-size: 9pt; color: #555;">Tahun Pelajaran ${academicYearStr} | ${schoolIdentity.schoolName}</p>
        <hr style="margin: 10px 0; border: 1px solid #000;"/>

        <table border="1" cellpadding="5" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 9.5pt;">
          <thead>
            <tr style="background-color: #047857; color: #ffffff; text-align: center; font-weight: bold; text-transform: uppercase;">
              <th style="border: 1px solid #333; padding: 6px;">mata pelajaran</th>
              <th style="border: 1px solid #333; padding: 6px;">minggu ke</th>
              <th style="border: 1px solid #333; padding: 6px;">tanggal aktif</th>
              <th style="border: 1px solid #333; padding: 6px;">jp per minggu</th>
              <th style="border: 1px solid #333; padding: 6px;">alokasi jam</th>
              <th style="border: 1px solid #333; padding: 6px;">jumlah jam</th>
              <th style="border: 1px solid #333; padding: 6px;">kode tp</th>
              <th style="border: 1px solid #333; padding: 6px;">deskripsi tp</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background-color: #d1fae5; font-weight: bold; text-align: center; font-size: 10.5pt;">
              <td colspan="5" style="border: 1px solid #333; padding: 8px; text-align: left; text-transform: uppercase;">
                JUMLAH JAM PELAJARAN ${selectedSubjectTab.toUpperCase()} SEMESTER ${selectedSemesterTab}
              </td>
              <td style="border: 1px solid #333; padding: 8px; font-weight: ext-bold; font-size: 11pt; color: #065f46;">
                ${grandTotalSemesterHours}
              </td>
              <td colspan="2" style="border: 1px solid #333; padding: 8px; text-align: left; font-size: 9pt; color: #064e3b;">
                Total Net JP Efektif Semester ${selectedSemesterTab}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    exportHtmlToDoc({
      htmlContent: docHtml,
      filename: `Tabel_Hari_Aktif_${selectedSubjectTab.replace(/\s+/g, "_")}_Sem${selectedSemesterTab}`,
      title: `Tabel Hari Aktif ${selectedSubjectTab} Semester ${selectedSemesterTab}`,
      schoolIdentity,
    });
  };

  // Export Subject Effective Table to CSV/Excel
  const handleExportCSVSubjectEffectiveTable = () => {
    const headers = [
      "Mata Pelajaran",
      "Minggu ke",
      "Tanggal Aktif",
      "JP per minggu",
      "Alokasi jam",
      "Jumlah jam (Bulan)",
      "Kode TP",
      "Deskripsi TP",
    ];

    const rows: Array<Array<string | number>> = [];

    computedSubjectWeeklyData.forEach((m) => {
      rows.push(["", "minggu ke", `tanggal aktif ${m.monthTitle}`, "jp per minggu", "alokasi jam", `jumlah jam ${m.monthTitle}`, "kode tp", "deskripsi tp"]);
      m.weeks.forEach((w) => {
        rows.push([
          selectedSubjectTab,
          w.weekNum,
          w.activeDates || "-",
          w.jpPerWeek,
          w.allocatedHours,
          m.monthlyTotalHours,
          w.tpCode || "-",
          w.tpDescription || "-",
        ]);
      });
    });

    rows.push([
      `JUMLAH JAM PELAJARAN ${selectedSubjectTab.toUpperCase()} SEMESTER ${selectedSemesterTab}`,
      "",
      "",
      "",
      "",
      grandTotalSemesterHours,
      "",
      "",
    ]);

    exportToCSV(headers, rows, `Tabel_Hari_Aktif_${selectedSubjectTab.replace(/\s+/g, "_")}_Sem${selectedSemesterTab}`);
  };

  const handleDelete = (id: string) => {
    onSaveEvents(events.filter((e) => e.id !== id));
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      title: "",
      type: "Libur",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (evt: AcademicCalendarEvent) => {
    setEditingId(evt.id);
    setForm(evt);
    setIsModalOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;

    if (editingId) {
      onSaveEvents(
        events.map((evt) => (evt.id === editingId ? ({ ...evt, ...form } as AcademicCalendarEvent) : evt))
      );
    } else {
      const newEvt: AcademicCalendarEvent = {
        id: "cal_" + Date.now(),
        date: form.date || new Date().toISOString().slice(0, 10),
        endDate: form.endDate || undefined,
        title: form.title || "",
        type: form.type as any,
        description: form.description || "",
      };
      onSaveEvents([...events, newEvt]);
    }
    setIsModalOpen(false);
  };

  const totalEffectiveDaysSem1 = months.slice(0, 6).reduce((a, b) => a + b.defaultEffective, 0);
  const totalEffectiveDaysSem2 = months.slice(6, 12).reduce((a, b) => a + b.defaultEffective, 0);

  const handleExportCSV = () => {
    const headers = ["No", "Mata Pelajaran", "Jadwal & JP/Minggu", "Total Pertemuan", "Batal (Libur/Event)", "Pertemuan Efektif", "JP Efektif Net"];
    const rows = subjectCalculations.map((sc, idx) => [
      idx + 1,
      sc.subject,
      sc.weeklyScheduleSummary,
      sc.totalScheduledMeetings,
      sc.holidayMeetingsLost,
      sc.effectiveMeetings,
      `${sc.effectiveJP} JP`,
    ]);
    exportToCSV(headers, rows, `Jam_Efektif_Per_Mapel_${academicYearStr.replace("/", "-")}`);
  };

  const handleExportDoc = () => {
    const tableHtml = `
      <div style="font-family: Arial, sans-serif; font-size: 11pt;">
        <h3 style="text-align: center; font-size: 14pt; margin-bottom: 5px;">KALENDER PENDIDIKAN & ANALISIS HARI/JAM EFEKTIF BELAJAR</h3>
        <p style="text-align: center; margin-top: 0; font-weight: bold; color: #333;">Tahun Pelajaran ${academicYearStr} | ${schoolIdentity.schoolName}</p>
        <p style="text-align: center; font-size: 10pt; color: #555;">Periode: ${startDate} s.d. ${endDate}</p>
        <hr style="margin: 15px 0; border: 1px solid #000;"/>

        <h4 style="margin-top: 20px; font-size: 12pt;">1. Hitungan Hari & Jam Pelajaran (JP) Efektif Per Mata Pelajaran</h4>
        <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: center; font-weight: bold;">
              <th style="border: 1px solid #333; padding: 6px;">No</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Mata Pelajaran</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Jadwal Hari & JP/Minggu</th>
              <th style="border: 1px solid #333; padding: 6px;">Pertemuan Rencana</th>
              <th style="border: 1px solid #333; padding: 6px;">Berkurang (Libur/Event)</th>
              <th style="border: 1px solid #333; padding: 6px;">Pertemuan Efektif</th>
              <th style="border: 1px solid #333; padding: 6px;">Net JP Efektif</th>
            </tr>
          </thead>
          <tbody>
            ${subjectCalculations
              .map(
                (sc, idx) => `
              <tr>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${sc.subject}</td>
                <td style="border: 1px solid #333; padding: 6px;">${sc.weeklyScheduleSummary}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${sc.totalScheduledMeetings} Hari</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; color: #dc2626;">-${sc.holidayMeetingsLost} Hari (${sc.lostJP} JP)</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; color: #059669;">${sc.effectiveMeetings} Hari</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center; font-weight: bold; background-color: #ecfdf5; color: #065f46;">${sc.effectiveJP} JP</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <h4 style="margin-top: 25px; font-size: 12pt;">2. Agenda Kalender Pendidikan & Hari Libur</h4>
        <table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: center; font-weight: bold;">
              <th style="border: 1px solid #333; padding: 6px; width: 40px;">No</th>
              <th style="border: 1px solid #333; padding: 6px; width: 140px;">Tanggal / Periode</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Nama Agenda / Kegiatan</th>
              <th style="border: 1px solid #333; padding: 6px;">Kategori</th>
              <th style="border: 1px solid #333; padding: 6px; text-align: left;">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${sortedEvents
              .map(
                (e, idx) => `
              <tr>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${e.endDate ? `${e.date} s.d. ${e.endDate}` : e.date}</td>
                <td style="border: 1px solid #333; padding: 6px; font-weight: bold;">${e.title}</td>
                <td style="border: 1px solid #333; padding: 6px; text-align: center;">${e.type}</td>
                <td style="border: 1px solid #333; padding: 6px;">${e.description || "-"}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    exportHtmlToDoc({
      htmlContent: tableHtml,
      filename: `Kalender_Pendidikan_Dan_Jam_Efektif_${academicYearStr.replace("/", "-")}.doc`,
      title: `KALENDER PENDIDIKAN & HARI EFEKTIF BELAJAR`,
    });
  };

  const handlePrint = () => {
    onOpenPrint(
      "KALENDER PENDIDIKAN & REKAPITULASI HARI/JAM EFEKTIF BELAJAR",
      `Tahun Pelajaran ${academicYearStr} - ${schoolIdentity.schoolName}`,
      (
        <div className="space-y-6 text-xs">
          {/* Section 1: Rincian HEB & MEB Per Bulan */}
          <div>
            <h4 className="font-bold text-slate-800 uppercase mb-2">
              I. Rincian Hari Efektif Belajar (HEB) & Minggu Efektif (MEB) Per Bulan
            </h4>
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800 text-center">
                  <th className="border border-slate-300 p-2 w-8">No</th>
                  <th className="border border-slate-300 p-2 text-left">Bulan / Tahun</th>
                  <th className="border border-slate-300 p-2 w-28">Semester</th>
                  <th className="border border-slate-300 p-2 w-28">Jumlah Hari</th>
                  <th className="border border-slate-300 p-2 w-32 bg-emerald-50 text-emerald-900">Hari Efektif (HEB)</th>
                  <th className="border border-slate-300 p-2 w-32 bg-blue-50 text-blue-900">Minggu Efektif (MEB)</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, idx) => (
                  <tr key={m.name} className="odd:bg-white even:bg-slate-50 text-center">
                    <td className="border border-slate-300 p-2 font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 text-left font-bold text-slate-900">{m.name}</td>
                    <td className="border border-slate-300 p-2 font-semibold text-slate-700">
                      Semester {idx < 6 ? "1 (Ganjil)" : "2 (Genap)"}
                    </td>
                    <td className="border border-slate-300 p-2">{m.totalDays} Hari</td>
                    <td className="border border-slate-300 p-2 font-bold text-emerald-800 bg-emerald-50/40">{m.defaultEffective} Hari</td>
                    <td className="border border-slate-300 p-2 font-bold text-blue-800 bg-blue-50/40">{m.defaultWeeks} Minggu</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-100/70 font-extrabold text-emerald-950 text-center border-t-2 border-slate-400">
                  <td colSpan={3} className="border border-slate-400 p-2 text-right">TOTAL SEMESTER 1 (GANJIL):</td>
                  <td className="border border-slate-400 p-2">{months.slice(0, 6).reduce((a, b) => a + b.totalDays, 0)} Hari</td>
                  <td className="border border-slate-400 p-2">{totalEffectiveDaysSem1} Hari</td>
                  <td className="border border-slate-400 p-2">{months.slice(0, 6).reduce((a, b) => a + b.defaultWeeks, 0)} Minggu</td>
                </tr>
                <tr className="bg-blue-100/70 font-extrabold text-blue-950 text-center border-t border-slate-400">
                  <td colSpan={3} className="border border-slate-400 p-2 text-right">TOTAL SEMESTER 2 (GENAP):</td>
                  <td className="border border-slate-400 p-2">{months.slice(6, 12).reduce((a, b) => a + b.totalDays, 0)} Hari</td>
                  <td className="border border-slate-400 p-2">{totalEffectiveDaysSem2} Hari</td>
                  <td className="border border-slate-400 p-2">{months.slice(6, 12).reduce((a, b) => a + b.defaultWeeks, 0)} Minggu</td>
                </tr>
                <tr className="bg-slate-200 font-extrabold text-slate-950 text-center border-t-2 border-slate-500">
                  <td colSpan={3} className="border border-slate-400 p-2 text-right">TOTAL KESELURUHAN (1 TAHUN):</td>
                  <td className="border border-slate-400 p-2">{months.reduce((a, b) => a + b.totalDays, 0)} Hari</td>
                  <td className="border border-slate-400 p-2">{totalEffectiveDaysSem1 + totalEffectiveDaysSem2} Hari</td>
                  <td className="border border-slate-400 p-2">{months.reduce((a, b) => a + b.defaultWeeks, 0)} Minggu</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section 2: Hitungan JP Efektif Per Mapel */}
          <div>
            <h4 className="font-bold text-slate-800 uppercase mb-2">
              II. Hitungan Hari & Jam Pelajaran (JP) Efektif Per Mata Pelajaran
            </h4>
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800">
                  <th className="border border-slate-300 p-2 text-center w-8">No</th>
                  <th className="border border-slate-300 p-2 text-left">Mata Pelajaran</th>
                  <th className="border border-slate-300 p-2 text-left">Jadwal Minggu</th>
                  <th className="border border-slate-300 p-2 text-center">Rencana Pertemuan</th>
                  <th className="border border-slate-300 p-2 text-center">Libur / Event</th>
                  <th className="border border-slate-300 p-2 text-center">Pertemuan Efektif</th>
                  <th className="border border-slate-300 p-2 text-center font-bold">Net JP Efektif</th>
                </tr>
              </thead>
              <tbody>
                {subjectCalculations.map((sc, idx) => (
                  <tr key={sc.subject} className="odd:bg-white even:bg-slate-50">
                    <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 font-bold">{sc.subject}</td>
                    <td className="border border-slate-300 p-2 text-slate-600">{sc.weeklyScheduleSummary}</td>
                    <td className="border border-slate-300 p-2 text-center">{sc.totalScheduledMeetings} Hari</td>
                    <td className="border border-slate-300 p-2 text-center text-red-600 font-semibold">-{sc.holidayMeetingsLost} Hari</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-emerald-700">{sc.effectiveMeetings} Hari</td>
                    <td className="border border-slate-300 p-2 text-center font-extrabold text-emerald-900 bg-emerald-50/50">{sc.effectiveJP} JP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: Agenda Kalender Pendidikan */}
          <div>
            <h4 className="font-bold text-slate-800 uppercase mb-2">
              III. Agenda Kalender Pendidikan & Hari Libur Resmi
            </h4>
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-800">
                  <th className="border border-slate-300 p-2 text-center w-8">No</th>
                  <th className="border border-slate-300 p-2 text-center w-28">Tanggal / Periode</th>
                  <th className="border border-slate-300 p-2 text-left">Nama Agenda / Kegiatan</th>
                  <th className="border border-slate-300 p-2 text-center w-24">Kategori</th>
                  <th className="border border-slate-300 p-2 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map((e, idx) => (
                  <tr key={e.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border border-slate-300 p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 p-2 text-center font-mono font-bold">
                      {e.endDate ? `${e.date} s.d ${e.endDate}` : e.date}
                    </td>
                    <td className="border border-slate-300 p-2 font-bold text-slate-900">{e.title}</td>
                    <td className="border border-slate-300 p-2 text-center">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 border border-slate-300">
                        {e.type}
                      </span>
                    </td>
                    <td className="border border-slate-300 p-2 text-slate-600">{e.description || "-"}</td>
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
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" />
            Kalender Pendidikan & Penghitungan Hari/Jam Efektif
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penyesuaian tahun pelajaran mengacu ke Identitas Sekolah ({academicYearStr}) & kalkulasi otomatis berdasarkan jadwal pelajaran
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center gap-1.5 border border-slate-300 transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            Atur Tahun Pelajaran
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah Agenda Kalender
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5"
            title="Ekspor CSV / Excel"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={handleExportDoc}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Simpan Word (.docx)"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Simpan Word (.docx)
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Cetak / PDF
          </button>
        </div>
      </div>

      {/* Info Card Academic Year Range */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-400">Tahun Pelajaran Aktif</div>
            <div className="text-lg font-extrabold text-white">{academicYearStr} ({schoolIdentity.schoolName})</div>
          </div>
        </div>

        <div className="flex items-center space-x-6 text-xs text-slate-300">
          <div>
            <span className="text-slate-400 block text-[10px] font-semibold">TANGGAL MULAI TP:</span>
            <span className="font-mono font-bold text-emerald-300">{startDate}</span>
          </div>
          <div className="h-6 border-r border-slate-700" />
          <div>
            <span className="text-slate-400 block text-[10px] font-semibold">TANGGAL BERAKHIR TP:</span>
            <span className="font-mono font-bold text-emerald-300">{endDate}</span>
          </div>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors ml-2"
          >
            Ubah Tanggal
          </button>
        </div>
      </div>

      {/* NEW FEATURE TABLE: Hitungan Hari & Jam Efektif per Mata Pelajaran (Dengan Select, Edit, & Hapus) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-2">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              Tabel Hitungan Hari & Jam Pelajaran (JP) Efektif per Mata Pelajaran
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dihitung otomatis mengacu pada Jadwal & Libur. Anda dapat menyeleksi, mengedit nilai, atau menghapus/menyembunyikan baris mapel.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingCalcSubject({
                  subject: "",
                  weeklyScheduleSummary: "2 JP / minggu",
                  sem1EffectiveMeetings: 19,
                  sem1EffectiveJP: 38,
                  sem2EffectiveMeetings: 18,
                  sem2EffectiveJP: 36,
                  holidayMeetingsLost: 0,
                  lostJP: 0,
                  effectiveJP: 74,
                  isCustom: true,
                });
                setIsAddCustomCalcModalOpen(true);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Mapel Custom</span>
            </button>

            <button
              type="button"
              onClick={handleResetCalcTable}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 flex items-center gap-1 transition-colors"
              title="Kembalikan semua hitungan ke kondisi awal dan tampilkan kembali mapel yang dihapus"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Segarkan Tabel</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Toolbar for Table 1 */}
        {selectedCalcSubjects.length > 0 && (
          <div className="mx-4 my-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs font-bold text-emerald-950 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-700" />
              <span>{selectedCalcSubjects.length} Mata Pelajaran Terpilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkDeleteCalcSubjects}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCalcSubjects([])}
                className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors"
              >
                Batal Pilih
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 font-bold border-b border-slate-200 text-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-3 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={
                      displayedSubjectCalculations.length > 0 &&
                      selectedCalcSubjects.length === displayedSubjectCalculations.length
                    }
                    onChange={handleSelectAllCalcSubjects}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title="Pilih Semua Mapel"
                  />
                </th>
                <th className="px-3 py-3 text-center w-8">No</th>
                <th className="px-3 py-3">Mata Pelajaran</th>
                <th className="px-3 py-3">Jadwal Mingguan</th>
                <th className="px-3 py-3 text-center text-teal-800 bg-teal-50/60">Pertemuan Efektif Sem 1</th>
                <th className="px-3 py-3 text-center text-teal-900 bg-teal-100/60">JP Sem 1</th>
                <th className="px-3 py-3 text-center text-indigo-800 bg-indigo-50/60">Pertemuan Efektif Sem 2</th>
                <th className="px-3 py-3 text-center text-indigo-900 bg-indigo-100/60">JP Sem 2</th>
                <th className="px-3 py-3 text-center text-red-600 bg-red-50/40">Pengurangan Libur</th>
                <th className="px-3 py-3 text-center text-emerald-950 bg-emerald-100 font-extrabold">Total Net JP Setahun</th>
                <th className="px-3 py-3 text-center w-24 bg-slate-100">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedSubjectCalculations.map((sc, idx) => {
                const isSelected = selectedCalcSubjects.includes(sc.subject);
                const isOverridden = !!subjectCalcOverrides[sc.subject] || sc.isCustom;
                return (
                  <tr key={sc.subject} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-emerald-50/40" : ""}`}>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectCalcSubject(sc.subject)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-3 py-3 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{sc.subject}</span>
                        {isOverridden && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-normal">
                            Diedit
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-600">{sc.weeklyScheduleSummary}</td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-teal-800 bg-teal-50/30">
                      {sc.sem1EffectiveMeetings} Hari
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-teal-900 bg-teal-100/30">
                      {sc.sem1EffectiveJP} JP
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-semibold text-indigo-800 bg-indigo-50/30">
                      {sc.sem2EffectiveMeetings} Hari
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-indigo-900 bg-indigo-100/30">
                      {sc.sem2EffectiveJP} JP
                    </td>
                    <td className="px-3 py-3 text-center font-mono font-bold text-red-600 bg-red-50/20">
                      -{sc.holidayMeetingsLost} Hari ({sc.lostJP} JP)
                    </td>
                    <td className="px-3 py-3 text-center font-extrabold text-emerald-900 bg-emerald-100/60 font-mono text-xs">
                      {sc.effectiveJP} JP
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingCalcSubject({ ...sc })}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Hitungan Mapel Ini"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCalcSubject(sc.subject)}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus Mapel dari Tabel Hitungan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayedSubjectCalculations.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-slate-400 italic">
                    Semua mata pelajaran telah disembunyikan. Klik "Segarkan Tabel" untuk menampilkan kembali.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW FEATURE: Tabel Hari & Jam Aktif per Semester per Mata Pelajaran (Dengan Select, Edit, & Hapus) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-3 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-600" />
              Tabel Hari Aktif per Semester per Mata Pelajaran
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Rincian mingguan per bulan. Dilengkapi opsi seleksi baris (Select), Edit rincian minggu, dan Hapus/Kosongkan baris data.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Subject Dropdown */}
            <select
              value={selectedSubjectTab}
              onChange={(e) => setSelectedSubjectTab(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 font-bold text-xs rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  📚 {sub}
                </option>
              ))}
            </select>

            {/* Semester Selector */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedSemesterTab(1)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedSemesterTab === 1
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semester 1 (Ganjil)
              </button>
              <button
                type="button"
                onClick={() => setSelectedSemesterTab(2)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedSemesterTab === 2
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Semester 2 (Genap)
              </button>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleSaveWeeklyData}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all transform active:scale-95"
              title="Simpan data tanggal aktif, JP, dan TP ke penyimpanan lokal agar tersimpan permanen"
            >
              <Save className="w-4 h-4 text-white" />
              <span>Simpan Tabel Hari Aktif</span>
            </button>
            <button
              onClick={handleAutoSumAllWeeklyJP}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              title="Hitung & Jumlahkan Otomatis Seluruh Kolom Alokasi Jam dari JP Per Minggu"
            >
              <Calculator className="w-3.5 h-3.5 text-white" />
              ⚡ Auto Hitung Sum Jam
            </button>
            <button
              onClick={handleResetWeeklyData}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 flex items-center gap-1.5"
              title="Hitung & Otomatisasi Ulang dari Jadwal & Prota"
            >
              <Clock className="w-3.5 h-3.5 text-slate-600" />
              Segarkan Otomatisasi
            </button>
            <button
              onClick={handleExportDocSubjectEffectiveTable}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              title="Simpan Word (.docx)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Simpan Word (.docx)
            </button>
            <button
              onClick={handleExportCSVSubjectEffectiveTable}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              title="Ekspor CSV / Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Excel
            </button>
          </div>
        </div>

        {/* Save Status Notification Banner */}
        {saveStatus && (
          <div className="bg-emerald-100/90 border border-emerald-300 text-emerald-950 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-fadeIn my-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{saveStatus}</span>
            </div>
            <button
              onClick={() => setSaveStatus(null)}
              className="text-emerald-800 hover:text-emerald-950 font-extrabold text-sm px-1.5 py-0.5 rounded-md hover:bg-emerald-200/60"
            >
              ✕
            </button>
          </div>
        )}

        {/* Bulk Action Toolbar for Table 2 */}
        {selectedWeekKeys.length > 0 && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-indigo-950 animate-fadeIn my-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-700" />
              <span>{selectedWeekKeys.length} Minggu Terpilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkEditWeeklyModalOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Massal Terpilih</span>
              </button>
              <button
                type="button"
                onClick={handleBulkClearWeeks}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan / Hapus Terpilih</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedWeekKeys([])}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors"
              >
                Batal Pilih
              </button>
            </div>
          </div>
        )}

        {/* Detailed Weekly Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-800 text-white font-extrabold uppercase text-[11px] tracking-wider text-center">
                <th className="p-2.5 border border-emerald-700 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      selectedWeekKeys.length > 0 &&
                      selectedWeekKeys.length === computedSubjectWeeklyData.length * 5
                    }
                    onChange={() => {
                      if (selectedWeekKeys.length === computedSubjectWeeklyData.length * 5) {
                        setSelectedWeekKeys([]);
                      } else {
                        const allKeys: string[] = [];
                        computedSubjectWeeklyData.forEach((m, mIdx) => {
                          m.weeks.forEach((w) => {
                            allKeys.push(`${selectedSubjectTab}_s${selectedSemesterTab}_m${mIdx}_w${w.weekNum}`);
                          });
                        });
                        setSelectedWeekKeys(allKeys);
                      }
                    }}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    title="Pilih Semua Minggu dalam Semester Ini"
                  />
                </th>
                <th className="p-2.5 border border-emerald-700 w-36">mata pelajaran</th>
                <th className="p-2.5 border border-emerald-700 w-20">minggu ke</th>
                <th className="p-2.5 border border-emerald-700 text-left w-48">
                  tanggal aktif {semesterMonths[0]?.name} - {semesterMonths[5]?.name} {startYear}
                </th>
                <th className="p-2.5 border border-emerald-700 w-28">jp per minggu</th>
                <th className="p-2.5 border border-emerald-700 w-24">alokasi jam</th>
                <th className="p-2.5 border border-emerald-700 w-32">
                  jumlah jam {semesterMonths[0]?.name} - {semesterMonths[5]?.name}
                </th>
                <th className="p-2.5 border border-emerald-700 w-36">kode tp</th>
                <th className="p-2.5 border border-emerald-700 text-left">deskripsi tp</th>
                <th className="p-2.5 border border-emerald-700 w-20 text-center">aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {computedSubjectWeeklyData.map((m, mIdx) => (
                <React.Fragment key={m.monthTitle}>
                  {/* Subheader Month Row */}
                  <tr className="bg-slate-100 font-bold text-[11px] text-slate-700">
                    <td className="p-2 border border-slate-200 text-center">-</td>
                    <td className="p-2 border border-slate-200 text-center">-</td>
                    <td className="p-2 border border-slate-200 text-center font-mono">minggu ke</td>
                    <td className="p-2 border border-slate-200 font-semibold text-slate-900">
                      tanggal aktif {m.monthTitle.toLowerCase()}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono">jp per minggu</td>
                    <td className="p-2 border border-slate-200 text-center font-mono">alokasi jam</td>
                    <td className="p-2 border border-slate-200 text-center font-bold text-emerald-900">
                      jumlah jam {m.monthTitle}
                    </td>
                    <td className="p-2 border border-slate-200 text-center font-mono">kode tp</td>
                    <td className="p-2 border border-slate-200">deskripsi tp</td>
                    <td className="p-2 border border-slate-200 text-center font-mono">aksi</td>
                  </tr>

                  {/* 5 Weeks Rows for the month */}
                  {m.weeks.map((w, wIdx) => {
                    const isFirstWeek = wIdx === 0;
                    const weekKey = `${selectedSubjectTab}_s${selectedSemesterTab}_m${mIdx}_w${w.weekNum}`;
                    const isWeekSelected = selectedWeekKeys.includes(weekKey);

                    return (
                      <tr
                        key={w.weekNum}
                        className={`hover:bg-slate-50 transition-colors ${
                          isWeekSelected ? "bg-indigo-50/50" : "odd:bg-white even:bg-slate-50/50"
                        }`}
                      >
                        {/* Checkbox Select */}
                        <td className="p-2 border border-slate-300 text-center">
                          <input
                            type="checkbox"
                            checked={isWeekSelected}
                            onChange={() => handleToggleSelectWeek(weekKey)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {isFirstWeek && (
                          <td
                            rowSpan={5}
                            className="p-3 border border-slate-300 font-bold text-slate-900 align-top uppercase bg-white text-xs"
                          >
                            <div className="sticky top-2 space-y-1">
                              <span className="text-emerald-700 font-extrabold block text-sm">
                                {selectedSubjectTab}
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal block lowercase">
                                semester {selectedSemesterTab}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Minggu ke */}
                        <td className="p-2 border border-slate-300 text-center font-mono font-bold text-slate-700">
                          {w.weekNum}
                        </td>

                        {/* Tanggal Aktif */}
                        <td className="p-1.5 border border-slate-300">
                          <input
                            type="text"
                            value={w.activeDates}
                            onChange={(e) =>
                              handleUpdateWeeklyCell(mIdx, w.weekNum, "activeDates", e.target.value)
                            }
                            placeholder="Contoh: 15/7; 20/7; 22/7"
                            className="w-full p-1 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-600 font-mono text-xs focus:bg-white"
                          />
                        </td>

                        {/* JP per minggu */}
                        <td className="p-1.5 border border-slate-300 text-center">
                          <input
                            type="text"
                            value={w.jpPerWeek}
                            onChange={(e) =>
                              handleUpdateWeeklyCell(mIdx, w.weekNum, "jpPerWeek", e.target.value)
                            }
                            placeholder="3; 3"
                            className="w-full p-1 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-600 font-mono text-center text-xs focus:bg-white"
                          />
                        </td>

                        {/* Alokasi Jam */}
                        <td className="p-1.5 border border-slate-300 text-center">
                          <input
                            type="number"
                            value={w.allocatedHours}
                            onChange={(e) =>
                              handleUpdateWeeklyCell(mIdx, w.weekNum, "allocatedHours", Number(e.target.value) || 0)
                            }
                            className="w-16 p-1 text-center font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-600 text-xs focus:bg-white"
                          />
                        </td>

                        {/* Jumlah Jam Bulan */}
                        {isFirstWeek && (
                          <td
                            rowSpan={5}
                            className="p-3 border border-slate-300 text-center font-extrabold text-emerald-950 bg-emerald-50/60 align-middle text-base font-mono"
                          >
                            <div className="space-y-1">
                              <span>{m.monthlyTotalHours}</span>
                              <span className="block text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">
                                JP {m.monthName}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Kode TP & Select Dropdown */}
                        <td className="p-1.5 border border-slate-300 font-mono font-bold text-indigo-900">
                          {allSubjectProtaList.length > 0 && (
                            <select
                              value={
                                allSubjectProtaList.find(
                                  (p) => (p.codeTP || p.tpCode) === w.tpCode && p.tpDescription === w.tpDescription
                                )?.id || ""
                              }
                              onChange={(e) => handleSelectTPForWeek(mIdx, w.weekNum, e.target.value)}
                              className="w-full mb-1.5 p-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md text-[11px] font-sans font-semibold text-indigo-950 focus:ring-1 focus:ring-indigo-500 cursor-pointer transition-colors"
                              title="Pilih Tujuan Pembelajaran (TP) dari Prota"
                            >
                              <option value="">-- Pilih TP Prota --</option>
                              {allSubjectProtaList.map((tp: any) => {
                                const code = tp.codeTP || tp.tpCode || "";
                                const desc = tp.tpDescription || tp.descriptionTP || tp.description || "";
                                return (
                                  <option key={tp.id} value={tp.id}>
                                    {code}: {desc.length > 35 ? `${desc.slice(0, 35)}...` : desc}
                                  </option>
                                );
                              })}
                            </select>
                          )}
                          <input
                            type="text"
                            value={w.tpCode}
                            onChange={(e) =>
                              handleUpdateWeeklyCell(mIdx, w.weekNum, "tpCode", e.target.value)
                            }
                            placeholder="Kode TP"
                            className="w-full p-1 bg-transparent border-b border-dashed border-slate-300 focus:border-emerald-600 font-mono font-bold text-indigo-900 text-xs focus:bg-white"
                          />
                        </td>

                        {/* Deskripsi TP */}
                        <td className="p-1.5 border border-slate-300">
                          <textarea
                            value={w.tpDescription}
                            onChange={(e) =>
                              handleUpdateWeeklyCell(mIdx, w.weekNum, "tpDescription", e.target.value)
                            }
                            rows={2}
                            placeholder="Deskripsi Alur Tujuan Pembelajaran (TP)..."
                            className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] leading-tight focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </td>

                        {/* Action Column */}
                        <td className="p-1.5 border border-slate-300 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingWeeklyRow({ mIdx, weekNum: w.weekNum, weekData: w })}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Edit Detail Minggu Ini"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClearWeekData(mIdx, w.weekNum)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              title="Kosongkan Data Minggu Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-100/90 font-extrabold text-emerald-950 text-sm border-t-2 border-emerald-600">
                <td colSpan={6} className="p-3 border border-slate-400 uppercase tracking-wider">
                  JUMLAH JAM PELAJARAN {selectedSubjectTab.toUpperCase()} SEMESTER {selectedSemesterTab}
                </td>
                <td className="p-3 border border-slate-400 text-center font-mono text-lg text-emerald-900 bg-emerald-200">
                  {grandTotalSemesterHours}
                </td>
                <td colSpan={3} className="p-3 border border-slate-400 text-xs text-emerald-900 font-semibold">
                  Total Alokasi JP Efektif Semester {selectedSemesterTab} ({selectedSubjectTab})
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal 1: Edit / Tambah Hitungan JP Mapel (Table 1 Summary) */}
      {(editingCalcSubject || isAddCustomCalcModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                {isAddCustomCalcModalOpen ? "Tambah Mapel Custom" : `Edit Hitungan Mapel: ${editingCalcSubject?.subject}`}
              </h3>
              <button
                onClick={() => {
                  setEditingCalcSubject(null);
                  setIsAddCustomCalcModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  value={editingCalcSubject?.subject || ""}
                  onChange={(e) =>
                    setEditingCalcSubject((prev: any) => ({ ...prev, subject: e.target.value }))
                  }
                  className="w-full p-2 border rounded-lg font-bold"
                  placeholder="Contoh: Bahasa Daerah / IPAS"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Ringkasan Jadwal Mingguan</label>
                <input
                  type="text"
                  value={editingCalcSubject?.weeklyScheduleSummary || ""}
                  onChange={(e) =>
                    setEditingCalcSubject((prev: any) => ({ ...prev, weeklyScheduleSummary: e.target.value }))
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder="Contoh: Senin (3 JP), Rabu (2 JP) → Total 5 JP/minggu"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                <div>
                  <label className="block font-semibold text-teal-900 mb-1">Pertemuan Sem 1 (Hari)</label>
                  <input
                    type="number"
                    value={editingCalcSubject?.sem1EffectiveMeetings ?? 19}
                    onChange={(e) =>
                      setEditingCalcSubject((prev: any) => ({
                        ...prev,
                        sem1EffectiveMeetings: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-teal-900 mb-1">JP Efektif Sem 1 (JP)</label>
                  <input
                    type="number"
                    value={editingCalcSubject?.sem1EffectiveJP ?? 57}
                    onChange={(e) =>
                      setEditingCalcSubject((prev: any) => ({
                        ...prev,
                        sem1EffectiveJP: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 border rounded-lg font-mono font-bold text-teal-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <div>
                  <label className="block font-semibold text-indigo-900 mb-1">Pertemuan Sem 2 (Hari)</label>
                  <input
                    type="number"
                    value={editingCalcSubject?.sem2EffectiveMeetings ?? 18}
                    onChange={(e) =>
                      setEditingCalcSubject((prev: any) => ({
                        ...prev,
                        sem2EffectiveMeetings: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 border rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-indigo-900 mb-1">JP Efektif Sem 2 (JP)</label>
                  <input
                    type="number"
                    value={editingCalcSubject?.sem2EffectiveJP ?? 54}
                    onChange={(e) =>
                      setEditingCalcSubject((prev: any) => ({
                        ...prev,
                        sem2EffectiveJP: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 border rounded-lg font-mono font-bold text-indigo-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100">
                <div>
                  <label className="block font-semibold text-red-900 mb-1">Pengurangan Libur (Hari)</label>
                  <input
                    type="number"
                    value={editingCalcSubject?.holidayMeetingsLost ?? 0}
                    onChange={(e) =>
                      setEditingCalcSubject((prev: any) => ({
                        ...prev,
                        holidayMeetingsLost: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 border rounded-lg font-mono text-red-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-red-900 mb-1">Pengurangan JP Libur (JP)</label>
                  <input
                    type="number"
                    value={editingCalcSubject?.lostJP ?? 0}
                    onChange={(e) =>
                      setEditingCalcSubject((prev: any) => ({
                        ...prev,
                        lostJP: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 border rounded-lg font-mono text-red-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Total Net JP Setahun</label>
                <input
                  type="number"
                  value={
                    editingCalcSubject?.effectiveJP ??
                    ((editingCalcSubject?.sem1EffectiveJP || 0) + (editingCalcSubject?.sem2EffectiveJP || 0) - (editingCalcSubject?.lostJP || 0))
                  }
                  onChange={(e) =>
                    setEditingCalcSubject((prev: any) => ({
                      ...prev,
                      effectiveJP: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-full p-2 border rounded-lg font-mono font-extrabold text-emerald-900 text-sm bg-emerald-50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCalcSubject(null);
                    setIsAddCustomCalcModalOpen(false);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveSubjectCalcOverride(editingCalcSubject)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Simpan Hitungan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Single Week Row Detail (Table 2) */}
      {editingWeeklyRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                Edit Rincian Minggu ke-{editingWeeklyRow.weekNum} ({selectedSubjectTab})
              </h3>
              <button
                onClick={() => setEditingWeeklyRow(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Tanggal Aktif</label>
                <input
                  type="text"
                  value={editingWeeklyRow.weekData.activeDates || ""}
                  onChange={(e) =>
                    setEditingWeeklyRow((prev: any) => ({
                      ...prev,
                      weekData: { ...prev.weekData, activeDates: e.target.value },
                    }))
                  }
                  className="w-full p-2 border rounded-lg font-mono"
                  placeholder="Contoh: 15/7; 20/7; 22/7"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">JP Per Minggu</label>
                  <input
                    type="text"
                    value={editingWeeklyRow.weekData.jpPerWeek || ""}
                    onChange={(e) =>
                      setEditingWeeklyRow((prev: any) => ({
                        ...prev,
                        weekData: { ...prev.weekData, jpPerWeek: e.target.value },
                      }))
                    }
                    className="w-full p-2 border rounded-lg font-mono text-center"
                    placeholder="3; 3"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Alokasi Jam (JP)</label>
                  <input
                    type="number"
                    value={editingWeeklyRow.weekData.allocatedHours || 0}
                    onChange={(e) =>
                      setEditingWeeklyRow((prev: any) => ({
                        ...prev,
                        weekData: { ...prev.weekData, allocatedHours: Number(e.target.value) || 0 },
                      }))
                    }
                    className="w-full p-2 border rounded-lg font-mono font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Pilih TP dari Prota (Opsional)</label>
                <select
                  onChange={(e) => {
                    const tp = allSubjectProtaList.find((p: any) => p.id === e.target.value);
                    if (tp) {
                      setEditingWeeklyRow((prev: any) => ({
                        ...prev,
                        weekData: {
                          ...prev.weekData,
                          tpCode: tp.codeTP || tp.tpCode || "",
                          tpDescription: tp.tpDescription || tp.descriptionTP || tp.description || "",
                        },
                      }));
                    }
                  }}
                  className="w-full p-2 bg-indigo-50 border border-indigo-200 rounded-lg font-semibold text-indigo-950"
                >
                  <option value="">-- Pilih TP Prota --</option>
                  {allSubjectProtaList.map((tp: any) => {
                    const code = tp.codeTP || tp.tpCode || "";
                    const desc = tp.tpDescription || tp.descriptionTP || tp.description || "";
                    return (
                      <option key={tp.id} value={tp.id}>
                        {code}: {desc.length > 40 ? `${desc.slice(0, 40)}...` : desc}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Kode TP</label>
                <input
                  type="text"
                  value={editingWeeklyRow.weekData.tpCode || ""}
                  onChange={(e) =>
                    setEditingWeeklyRow((prev: any) => ({
                      ...prev,
                      weekData: { ...prev.weekData, tpCode: e.target.value },
                    }))
                  }
                  className="w-full p-2 border rounded-lg font-mono font-bold text-indigo-900"
                  placeholder="Contoh: TP 1.1"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Deskripsi TP</label>
                <textarea
                  rows={3}
                  value={editingWeeklyRow.weekData.tpDescription || ""}
                  onChange={(e) =>
                    setEditingWeeklyRow((prev: any) => ({
                      ...prev,
                      weekData: { ...prev.weekData, tpDescription: e.target.value },
                    }))
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder="Deskripsi Alur Tujuan Pembelajaran (TP)..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingWeeklyRow(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateWeeklyCell(
                      editingWeeklyRow.mIdx,
                      editingWeeklyRow.weekNum,
                      "activeDates",
                      editingWeeklyRow.weekData.activeDates
                    );
                    handleUpdateWeeklyCell(
                      editingWeeklyRow.mIdx,
                      editingWeeklyRow.weekNum,
                      "jpPerWeek",
                      editingWeeklyRow.weekData.jpPerWeek
                    );
                    handleUpdateWeeklyCell(
                      editingWeeklyRow.mIdx,
                      editingWeeklyRow.weekNum,
                      "allocatedHours",
                      editingWeeklyRow.weekData.allocatedHours
                    );
                    handleUpdateWeeklyCell(
                      editingWeeklyRow.mIdx,
                      editingWeeklyRow.weekNum,
                      "tpCode",
                      editingWeeklyRow.weekData.tpCode
                    );
                    handleUpdateWeeklyCell(
                      editingWeeklyRow.mIdx,
                      editingWeeklyRow.weekNum,
                      "tpDescription",
                      editingWeeklyRow.weekData.tpDescription
                    );
                    setEditingWeeklyRow(null);
                    setSaveStatus(`Data minggu ke-${editingWeeklyRow.weekNum} berhasil diperbarui.`);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Simpan Rincian Minggu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Bulk Edit Selected Weeks (Table 2) */}
      {isBulkEditWeeklyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-600" />
                Edit Massal {selectedWeekKeys.length} Minggu Terpilih
              </h3>
              <button
                onClick={() => setIsBulkEditWeeklyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500 italic">
                Isi kolom yang ingin diterapkan secara bersamaan ke seluruh minggu yang Anda centang.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">JP Per Minggu Massal</label>
                  <input
                    type="text"
                    value={bulkWeeklyEditForm.jpPerWeek || ""}
                    onChange={(e) =>
                      setBulkWeeklyEditForm((prev) => ({ ...prev, jpPerWeek: e.target.value }))
                    }
                    className="w-full p-2 border rounded-lg font-mono text-center"
                    placeholder="Contoh: 3; 3"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Alokasi Jam Massal</label>
                  <input
                    type="number"
                    value={bulkWeeklyEditForm.allocatedHours || 0}
                    onChange={(e) =>
                      setBulkWeeklyEditForm((prev) => ({
                        ...prev,
                        allocatedHours: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full p-2 border rounded-lg font-mono font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Pilih TP dari Prota (Terapkan Massal)</label>
                <select
                  onChange={(e) => {
                    const tp = allSubjectProtaList.find((p: any) => p.id === e.target.value);
                    if (tp) {
                      setBulkWeeklyEditForm((prev) => ({
                        ...prev,
                        tpCode: tp.codeTP || tp.tpCode || "",
                        tpDescription: tp.tpDescription || tp.descriptionTP || tp.description || "",
                      }));
                    }
                  }}
                  className="w-full p-2 bg-indigo-50 border border-indigo-200 rounded-lg font-semibold text-indigo-950"
                >
                  <option value="">-- Pilih TP Prota --</option>
                  {allSubjectProtaList.map((tp: any) => {
                    const code = tp.codeTP || tp.tpCode || "";
                    const desc = tp.tpDescription || tp.descriptionTP || tp.description || "";
                    return (
                      <option key={tp.id} value={tp.id}>
                        {code}: {desc.length > 40 ? `${desc.slice(0, 40)}...` : desc}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Kode TP Massal</label>
                <input
                  type="text"
                  value={bulkWeeklyEditForm.tpCode || ""}
                  onChange={(e) =>
                    setBulkWeeklyEditForm((prev) => ({ ...prev, tpCode: e.target.value }))
                  }
                  className="w-full p-2 border rounded-lg font-mono font-bold text-indigo-900"
                  placeholder="Kode TP"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Deskripsi TP Massal</label>
                <textarea
                  rows={3}
                  value={bulkWeeklyEditForm.tpDescription || ""}
                  onChange={(e) =>
                    setBulkWeeklyEditForm((prev) => ({ ...prev, tpDescription: e.target.value }))
                  }
                  className="w-full p-2 border rounded-lg"
                  placeholder="Deskripsi TP..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBulkEditWeeklyModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulkWeeklyEdit}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Terapkan Edit Massal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-emerald-300 tracking-wider">Semester I (Ganjil)</span>
            <Calculator className="w-5 h-5 text-emerald-300" />
          </div>
          <div className="text-3xl font-extrabold">{totalEffectiveDaysSem1} Hari Efektif Belajar</div>
          <p className="text-xs text-emerald-100">
            Total perkiraan 19 Minggu Efektif Pembelajaran (Juli - Desember)
          </p>
        </div>

        <div className="bg-gradient-to-br from-indigo-800 to-purple-900 text-white p-5 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-indigo-300 tracking-wider">Semester II (Genap)</span>
            <Calculator className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="text-3xl font-extrabold">{totalEffectiveDaysSem2} Hari Efektif Belajar</div>
          <p className="text-xs text-indigo-100">
            Total perkiraan 18 Minggu Efektif Pembelajaran (Januari - Juni)
          </p>
        </div>
      </div>

      {/* Events Agenda List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Agenda & Hari Libur Kalender Pendidikan</h3>
          <button
            onClick={handleOpenAdd}
            className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Agenda
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedEvents.map((evt) => (
            <div
              key={evt.id}
              className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-all bg-slate-50/50"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                  {evt.endDate ? `${evt.date} s.d. ${evt.endDate}` : evt.date}
                </span>
                <p className="font-bold text-slate-900 text-xs mt-1">{evt.title}</p>
                <p className="text-[11px] text-slate-500">{evt.type} {evt.description ? `- ${evt.description}` : ""}</p>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleOpenEdit(evt)}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(evt.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Settings Academic Year Dates */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              Atur Tahun Pelajaran & Tanggal Pelaksanaan
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Tahun Pelajaran</label>
                <input
                  type="text"
                  value={academicYearStr}
                  onChange={(e) => setAcademicYearStr(e.target.value)}
                  className="w-full p-2 border rounded-lg font-bold"
                  placeholder="Contoh: 2025/2026"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tanggal Mulai Tahun Pelajaran</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border rounded-lg font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Tanggal Selesai Tahun Pelajaran</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 border rounded-lg font-mono font-semibold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Event */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              {editingId ? "Edit Agenda Kalender" : "Tambah Agenda Kalender Baru"}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    required
                    value={form.date || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tanggal Selesai (Opsional)</label>
                  <input
                    type="date"
                    value={form.endDate || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Nama Agenda / Kegiatan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penilaian Tengah Semester / Libur Nasional"
                  value={form.title || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full p-2 border rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Kategori Agenda</label>
                <select
                  value={form.type || "Libur"}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as any }))}
                  className="w-full p-2 border rounded-lg bg-white"
                >
                  <option value="Libur">Hari Libur (Nasional / Keagamaan)</option>
                  <option value="Kegiatan Sekolah">Kegiatan Sekolah / MPLS / Classmeeting</option>
                  <option value="Ujian / Asesmen">Asesmen / Ujian (PTS/PAS/ANBK)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Keterangan Tambahan</label>
                <textarea
                  rows={2}
                  value={form.description || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
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
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
